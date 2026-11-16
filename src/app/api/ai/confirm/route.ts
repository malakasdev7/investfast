import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticated,
  apiError,
  checkOrigin,
  databaseError,
  logSecurityEvent,
  rateLimit,
} from "@/lib/api";
import { entitySchema } from "@/lib/validations/entities";

const confirmSchema = z
  .object({
    confirmed: z.literal(true),
    entity: z.enum(["transactions", "goals", "budgets"]),
    values: z.record(z.string(), z.unknown()),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    rateLimit(request, "ai-confirm", 15, 60_000);
    const { supabase, user } = await authenticated();
    const body = await request.json();
    const parsed = confirmSchema.parse(body);

    const validatedValues = entitySchema(parsed.entity).parse(parsed.values);

    const { data, error } = await supabase
      .from(parsed.entity)
      .insert({
        ...validatedValues,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (error) throw databaseError(error.code, error.message);

    await logSecurityEvent(supabase, parsed.entity, "AI_CONFIRMED_INSERT", data.id, {
      entity: parsed.entity,
      confirmed_by_user: true,
    });

    return Response.json({ id: data.id, ok: true });
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

