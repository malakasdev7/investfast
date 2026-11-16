"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  Wrench,
  MessageSquare,
  Scale,
  Calculator,
  Search,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/hooks/use-finances";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type ProposedAction = {
  entity: "transactions" | "goals" | "budgets";
  title: string;
  summary: string;
  values: Record<string, string | null>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  proposedAction?: ProposedAction | null;
  actionConfirmed?: boolean;
};

type ConversationItem = {
  id: string;
  title: string;
  updated_at: string;
};

const QUICK_PROMPTS = [
  "Faça um diagnóstico completo da minha carteira, concentração e risco",
  "Como está minha reserva de emergência e quanto posso investir por mês?",
  "Posso comprar R$ 1.500 em HGLG11 agora?",
  "Analise meus gastos recentes, orçamentos e compromissos pendentes",
  "Crie uma meta de reserva de emergência de R$ 18.000",
];

const TOOL_LABELS: Record<string, string> = {
  get_user_financial_summary: "Resumo financeiro",
  get_accounts: "Contas e saldos",
  get_transactions: "Transações",
  get_budgets: "Orçamentos",
  get_goals: "Metas",
  get_portfolios: "Carteiras",
  get_assets: "Ativos",
  get_holdings: "Posições",
  get_investment_transactions: "Operações",
  get_dividends: "Dividendos",
  get_market_asset: "Cotação de mercado",
  get_asset_history: "Histórico do ativo",
  calculate_compound_interest: "Juros compostos",
  calculate_goal_plan: "Plano de meta",
  calculate_portfolio_allocation: "Alocação e risco",
  calculate_rebalancing: "Rebalanceamento",
  calculate_fire_number: "Independência financeira",
  calculate_loan_amortization: "Amortização de dívida",
  security_guardrail: "Proteção de segurança",
};

export function AiAssistant() {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const msgSeqRef = useRef(0);

  const convQuery = useQuery({
    queryKey: ["ai-conversations", searchTerm],
    queryFn: () =>
      api<{
        conversations: ConversationItem[];
        activeConversationId: string | null;
        messages: {
          id: string;
          role: "user" | "assistant";
          content: string;
          metadata?: { toolsUsed?: string[]; proposedAction?: ProposedAction | null };
        }[];
        migrationPending?: boolean;
      }>(
        searchTerm.trim()
          ? `/api/ai/chat?q=${encodeURIComponent(searchTerm.trim())}`
          : "/api/ai/chat",
      ),
    retry: false,
  });

  const renameConvMutation = useMutation({
    mutationFn: (payload: { id: string; title: string }) =>
      api("/api/ai/chat", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      setEditingConvId(null);
      setEditingTitle("");
      await queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success("Conversa renomeada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function selectConversation(id: string) {
    setConversationId(id);
    try {
      const res = await api<{
        messages: {
          id: string;
          role: "user" | "assistant";
          content: string;
          metadata?: { toolsUsed?: string[]; proposedAction?: ProposedAction | null };
        }[];
      }>(`/api/ai/chat?conversationId=${encodeURIComponent(id)}`);
      setMessages(
        (res.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          toolsUsed: m.metadata?.toolsUsed,
          proposedAction: m.metadata?.proposedAction ?? null,
        })),
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const deleteConvMutation = useMutation({
    mutationFn: (id: string) =>
      api("/api/ai/chat", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
    onSuccess: async (_, deletedId) => {
      if (conversationId === deletedId) {
        setConversationId(null);
        setMessages([]);
      }
      await queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success("Conversa removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmActionMutation = useMutation({
    mutationFn: (payload: {
      messageId: string;
      action: ProposedAction;
    }) =>
      api("/api/ai/confirm", {
        method: "POST",
        body: JSON.stringify({
          confirmed: true,
          entity: payload.action.entity,
          values: payload.action.values,
        }),
      }),
    onSuccess: async (_, variables) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === variables.messageId ? { ...m, actionConfirmed: true } : m,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["finances"] });
      toast.success("Registro confirmado e salvo com sucesso!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function sendMessage(textToSend?: string) {
    const prompt = (textToSend ?? input).trim();
    if (!prompt || streaming) return;

    msgSeqRef.current += 1;
    const seq = msgSeqRef.current;
    const userMsg: ChatMessage = {
      id: `user-${seq}`,
      role: "user",
      content: prompt,
    };
    const assistantMsgId = `assistant-${seq}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      toolsUsed: [],
      proposedAction: null,
    };

    const historyPayload = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, userMsg, placeholderAssistant]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: prompt,
          history: historyPayload,
        }),
      });

      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Não foi possível consultar o assistente.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as {
            type: "meta" | "delta" | "done";
            conversationId?: string | null;
            toolsUsed?: string[];
            proposedAction?: ProposedAction | null;
            text?: string;
          };

          if (event.type === "meta") {
            if (event.conversationId) {
              setConversationId(event.conversationId);
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      toolsUsed: event.toolsUsed ?? [],
                      proposedAction: event.proposedAction ?? null,
                    }
                  : m,
              ),
            );
          } else if (event.type === "delta" && event.text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + event.text }
                  : m,
              ),
            );
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      toast.error((e as Error).message);
      setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-kicker">
            Inteligência Artificial Segura
          </p>
          <h1 className="page-heading">Assistente Financeiro InvestFast</h1>
          <p className="subheading">
            Conectado aos seus dados reais com ferramentas de leitura e confirmação explícita antes de qualquer ação.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/posso-comprar">
              <Scale className="size-4 text-primary" />
              Posso comprar?
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/calculadora">
              <Calculator className="size-4 text-primary" />
              Calculadora
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Coluna de Histórico de Conversas */}
        <aside className="card flex flex-col justify-between p-4">
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setConversationId(null);
                setMessages([]);
                setEditingConvId(null);
              }}
            >
              <Plus className="size-4 text-primary" />
              Nova conversa
            </Button>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar conversas…"
                aria-label="Pesquisar conversas"
                className="input m-0 pl-8 text-xs"
              />
            </div>

            <div className="space-y-1 pt-1">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Conversas recentes
              </p>
              {convQuery.data?.conversations?.length ? (
                <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                  {convQuery.data.conversations.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "group flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-2 text-xs transition-colors",
                        conversationId === c.id
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {editingConvId === c.id ? (
                        <form
                          className="flex flex-1 items-center gap-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const trimmed = editingTitle.trim();
                            if (trimmed) {
                              renameConvMutation.mutate({ id: c.id, title: trimmed });
                            }
                          }}
                        >
                          <input
                            className="input m-0 h-7 flex-1 px-2 text-xs"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            maxLength={140}
                            autoFocus
                          />
                          <button
                            type="submit"
                            aria-label="Salvar nome da conversa"
                            className="p-1 text-gain hover:opacity-80"
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancelar renomeação"
                            onClick={() => setEditingConvId(null)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void selectConversation(c.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <MessageSquare className="size-3.5 shrink-0" />
                            <span className="truncate">{c.title}</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1 opacity-75 group-hover:opacity-100">
                            <button
                              type="button"
                              aria-label="Renomear conversa"
                              onClick={() => {
                                setEditingConvId(c.id);
                                setEditingTitle(c.title);
                              }}
                              className="p-0.5 hover:text-primary"
                            >
                              <Pencil className="size-3" />
                            </button>
                            <button
                              type="button"
                              aria-label="Excluir conversa"
                              onClick={() => deleteConvMutation.mutate(c.id)}
                              className="p-0.5 hover:text-loss"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-4 text-xs text-muted-foreground">
                  {searchTerm.trim()
                    ? "Nenhuma conversa encontrada para essa pesquisa."
                    : "Suas conversas ficam salvas aqui automaticamente."}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-glass-border bg-glass-light-bg p-3.5 text-xs leading-5 text-muted-foreground">
            <p className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="size-3.5 text-gain" />
              Privacidade & Aviso Legal
            </p>
            <p className="mt-1">
              Suas chaves nunca são expostas e nenhuma alteração é feita sem confirmação. As respostas são educativas e não constituem recomendação formal de investimento.
            </p>
          </div>
        </aside>

        {/* Área Principal do Chat */}
        <section className="card flex min-h-[580px] flex-col justify-between overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
            {messages.length === 0 ? (
              <div className="mx-auto max-w-2xl space-y-5 py-8 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">
                    Como posso ajudar nas suas decisões financeiras hoje?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Consulto em tempo real sua carteira, contas, orçamentos, metas e reserva de emergência.
                  </p>
                </div>

                <div className="grid gap-2.5 text-left sm:grid-cols-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendMessage(q)}
                      className="cursor-pointer rounded-2xl border border-glass-border bg-glass-light-bg p-4 text-xs font-medium text-foreground transition-all hover:border-primary/40 hover:bg-glass-medium-bg sm:text-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-2",
                    msg.role === "user" ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-3xl rounded-2xl px-4 py-3.5 text-sm leading-6",
                      msg.role === "user"
                        ? "glass-control glass-control-primary"
                        : "border border-glass-border bg-glass-light-bg text-foreground",
                    )}
                  >
                    {msg.role === "assistant" && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {msg.toolsUsed.map((tool) => (
                          <span
                            key={tool}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                          >
                            <Wrench className="size-3" />
                            {TOOL_LABELS[tool] || tool}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{msg.content || "Analisando seus dados…"}</div>

                    {/* Cartão de Confirmação Explícita antes de alterar dados */}
                    {msg.proposedAction && (
                      <div className="mt-4 rounded-2xl border border-primary/35 bg-glass-frosted-bg p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-primary">
                            Confirmação obrigatória · {msg.proposedAction.title}
                          </span>
                          <span className="badge">Ação protegida</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {msg.proposedAction.summary}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.actionConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gain">
                              <CheckCircle2 className="size-4" />
                              Confirmado e salvo nos seus registros ({formatDate(new Date())})
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              disabled={confirmActionMutation.isPending}
                              onClick={() =>
                                confirmActionMutation.mutate({
                                  messageId: msg.id,
                                  action: msg.proposedAction!,
                                })
                              }
                            >
                              <CheckCircle2 className="size-4" />
                              Confirmar e registrar
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Barra de envio */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="border-t border-border bg-glass-light-bg p-4"
          >
            <div className="flex items-center gap-2">
              <input
                className="input m-0 flex-1"
                placeholder="Pergunte sobre sua carteira, gastos, reserva ou digite: Posso comprar PETR4?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                disabled={streaming}
              />
              <Button type="submit" disabled={streaming || !input.trim()}>
                <Send className="size-4" />
                {streaming ? "Respondendo…" : "Enviar"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

