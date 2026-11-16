import { NextRequest } from "next/server";
import { z } from "zod";
import type { Json } from "@/types/database";
import {
  authenticated,
  apiError,
  checkOrigin,
  databaseError,
  isMissingRelationError,
  logSecurityEvent,
  rateLimit,
} from "@/lib/api";
import { streamAssistantReply } from "@/lib/ai/assistant";
import type { ExecutedToolRecord } from "@/lib/ai/tools";
import { type Snapshot } from "@/lib/domain";

const postSchema = z
  .object({
    conversationId: z.uuid().optional().nullable(),
    message: z.string().trim().min(1).max(2000),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(4000),
        }),
      )
      .max(20)
      .optional(),
  })
  .strict();

const patchSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(140).optional(),
    archived: z.boolean().optional(),
  })
  .strict();

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await authenticated();
    const conversationId = request.nextUrl.searchParams.get("conversationId");
    const searchQuery = request.nextUrl.searchParams.get("q")?.trim() || "";

    let convQuery = supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(40);

    if (searchQuery) {
      convQuery = convQuery.ilike("title", `%${searchQuery}%`);
    }

    const { data: conversations, error: convErr } = await convQuery;

    if (convErr) {
      if (isMissingRelationError(convErr.code, convErr.message)) {
        return Response.json({
          conversations: [],
          messages: [],
          migrationPending: true,
        });
      }
      throw databaseError(convErr.code, convErr.message);
    }

    const activeId = conversationId || conversations?.[0]?.id || null;
    let messages: unknown[] = [];

    if (activeId) {
      const { data: msgRows, error: msgErr } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", activeId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(120);

      if (!msgErr && msgRows) {
        messages = msgRows;
      }
    }

    return Response.json({
      conversations: conversations ?? [],
      activeConversationId: activeId,
      messages,
      migrationPending: false,
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    rateLimit(request, "ai-chat", 20, 60_000);
    const { supabase, user } = await authenticated();
    const body = await request.json();
    const parsed = postSchema.parse(body);

    const { data: snapshotData, error: snapError } = await supabase.rpc("app_snapshot");
    if (snapError) throw databaseError(snapError.code, snapError.message);
    const snapshot = (snapshotData ?? {}) as Snapshot;

    // Cria ou reutiliza conversa no banco antes de iniciar o stream
    let conversationId = parsed.conversationId ?? null;
    try {
      if (!conversationId) {
        const title = parsed.message.slice(0, 60).trim() || "Conversa financeira";
        const { data: createdConv, error: createErr } = await supabase
          .from("ai_conversations")
          .insert({
            user_id: user.id,
            title,
          })
          .select("id")
          .single();

        if (!createErr && createdConv) {
          conversationId = createdConv.id;
        }
      } else {
        await supabase
          .from("ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId)
          .eq("user_id", user.id);
      }

      if (conversationId) {
        await supabase.from("ai_messages").insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: parsed.message,
          metadata: {},
        });
      }
    } catch {
      // Segue normalmente caso a migração ainda não tenha sido aplicada
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let fullReply = "";
        let toolsUsed: string[] = [];
        let executedTools: ExecutedToolRecord[] = [];
        let proposedAction: unknown = null;
        let model = "investfast";

        try {
          for await (const event of streamAssistantReply({
            data: snapshot,
            userMessage: parsed.message,
            history: parsed.history ?? [],
            supabase,
            userId: user.id,
          })) {
            if (event.type === "meta") {
              toolsUsed = event.toolsUsed;
              executedTools = event.executedTools;
              proposedAction = event.proposedAction ?? null;
              model = event.model;

              if (event.blockedPromptInjection) {
                await logSecurityEvent(
                  supabase,
                  "ai_assistant",
                  "PROMPT_INJECTION_BLOCKED",
                  null,
                  { snippet: parsed.message.slice(0, 120) },
                );
              }

              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "meta",
                    conversationId,
                    toolsUsed,
                    proposedAction,
                  }) + "\n",
                ),
              );
            } else {
              fullReply += event.text;
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "delta", text: event.text }) + "\n",
                ),
              );
            }
          }

          // Salva resposta da IA e chamadas de ferramentas no banco após conclusão do stream
          if (conversationId && fullReply) {
            try {
              const { data: savedAssistantMsg } = await supabase
                .from("ai_messages")
                .insert({
                  conversation_id: conversationId,
                  user_id: user.id,
                  role: "assistant",
                  content: fullReply.slice(0, 31500),
                  model,
                  metadata: {
                    toolsUsed,
                    proposedAction,
                  } as Json,
                })
                .select("id")
                .single();

              if (executedTools.length > 0) {
                await supabase.from("ai_tool_calls").insert(
                  executedTools.map((tool) => ({
                    user_id: user.id,
                    conversation_id: conversationId!,
                    message_id: savedAssistantMsg?.id ?? null,
                    tool_name: tool.tool_name,
                    type: tool.type,
                    asset_id: tool.asset_id,
                    portfolio_id: tool.portfolio_id,
                    arguments: tool.arguments as Json,
                    result: tool.result as Json,
                    status: tool.status,
                    error_message: tool.error_message,
                    duration_ms: tool.duration_ms,
                  })),
                );
              }
            } catch {
              // Ignora erros se a tabela ainda não existir antes da migração
            }
          }

          controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "delta",
                text: `\n\nErro ao processar resposta: ${(err as Error).message}`,
              }) + "\n",
            ),
          );
          controller.enqueue(encoder.encode(JSON.stringify({ type: "done" }) + "\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json(
        { error: e.issues.map((i) => i.message).join(" ") },
        { status: 422 },
      );
    }
    return apiError(e);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request);
    const { supabase, user } = await authenticated();
    const body = await request.json();
    const parsed = patchSchema.parse(body);

    const updates: Record<string, unknown> = {};
    if (parsed.title !== undefined) updates.title = parsed.title;
    if (parsed.archived !== undefined) updates.archived = parsed.archived;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Nenhum campo para atualizar." }, { status: 422 });
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .update(updates)
      .eq("id", parsed.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw databaseError(error.code, error.message);
    return Response.json({ item: data });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "Dados inválidos para atualizar conversa." }, { status: 422 });
    }
    return apiError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    checkOrigin(request);
    const { supabase, user } = await authenticated();
    const body = await request.json();
    const { id } = z.object({ id: z.uuid() }).strict().parse(body);

    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw databaseError(error.code, error.message);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "Identificador inválido." }, { status: 422 });
    }
    return apiError(e);
  }
}
