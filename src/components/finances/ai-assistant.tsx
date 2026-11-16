"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles,
  Send,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useFinances } from "@/hooks/use-finances";
import { overview, flow, positions } from "@/lib/calculations/finance";
import { formatCurrency } from "@/lib/utils/format";
import { text } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actionLink?: {
    href: string;
    label: string;
  };
}

const promptCategories = [
  {
    category: "Geral",
    prompts: [
      "Diagnóstico geral da minha saúde financeira",
      "Resumo do meu fluxo de caixa deste mês",
    ],
  },
  {
    category: "Investimentos",
    prompts: [
      "Como diversificar melhor minha carteira atual?",
      "Qual o impacto de reinvestir todos os meus proventos?",
    ],
  },
  {
    category: "Reserva & Metas",
    prompts: [
      "Como calcular minha reserva de emergência ideal?",
      "Estratégia para acelerar minhas metas ativas",
    ],
  },
  {
    category: "Orçamento",
    prompts: [
      "Quais despesas estão consumindo mais orçamento?",
      "Como aplicar a regra 50/30/20 no meu saldo?",
    ],
  },
];

export function AiAssistant() {
  const { data } = useFinances();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Geral");
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const welcomeMessage = useMemo(() => {
    if (!data || !showWelcome || messages.length > 0) return null;
    const total = overview(data);
    const userName = text(data.profiles?.[0]?.name).split(" ")[0] || "Investidor";
    return {
      id: "welcome",
      role: "assistant" as const,
      content: `Olá, ${userName}! Sou seu Assistente Inteligente InvestFast.\n\nAnalisei seu painel financeiro: atualmente você possui **${formatCurrency(
        total.wealth
      )}** em patrimônio consolidado, com **${formatCurrency(
        total.cash
      )}** em liquidez disponível e **${formatCurrency(
        total.value
      )}** alocados em investimentos.\n\nComo posso ajudar você a tomar as melhores decisões hoje? Escolha um tema abaixo ou digite sua pergunta.`,
      timestamp: "",
      actionLink: {
        href: "/dashboard",
        label: "Visualizar Dashboard",
      },
    };
  }, [data, showWelcome, messages.length]);

  const displayedMessages = useMemo(
    () => (messages.length > 0 ? messages : welcomeMessage ? [welcomeMessage] : []),
    [messages, welcomeMessage]
  );

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, isTyping]);

  const handleCopy = (id: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    toast.success("Resposta copiada para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleReset = () => {
    if (!data) return;
    const userName = text(data.profiles?.[0]?.name).split(" ")[0] || "Investidor";
    setMessages([
      {
        id: "new-welcome",
        role: "assistant",
        content: `Conversa reiniciada. Olá, ${userName}! Como posso ajudar com seus cálculos, metas ou análise de gastos agora?`,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    toast.info("Nova conversa iniciada.");
  };

  const handleClear = () => {
    setShowWelcome(false);
    setMessages([]);
    toast.info("Histórico de mensagens limpo.");
  };

  const generateAnswer = (userPrompt: string): { content: string; actionLink?: { href: string; label: string } } => {
    if (!data) {
      return {
        content: "Seus dados financeiros ainda estão sendo carregados. Tente novamente em instantes.",
      };
    }

    const total = overview(data);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const f = flow(data, `${currentMonth}-01`, `${currentMonth}-31`);
    const ps = positions(data);
    const promptLower = userPrompt.toLowerCase();

    // 1. Diagnóstico Geral
    if (promptLower.includes("diagnóstico") || promptLower.includes("saúde") || promptLower.includes("geral")) {
      return {
        content: `### Diagnóstico da sua Saúde Financeira\n\nCom base nos registros consolidados da sua conta:\n\n- **Patrimônio Consolidado:** ${formatCurrency(
          total.wealth
        )}\n- **Liquidez em Contas:** ${formatCurrency(
          total.cash
        )}\n- **Custódia em Investimentos:** ${formatCurrency(
          total.value
        )}\n- **Fluxo do Mês Atual:** Receitas de ${formatCurrency(
          f.income
        )} contra Despesas de ${formatCurrency(
          f.expense
        )} (Saldo: ${formatCurrency(f.balance)})\n\n**Recomendação Estratégica:**\nSeu saldo do mês está ${
          f.balance.gte(0) ? "positivo e sob controle" : "em déficit temporário"
        }. O passo mais eficiente agora é direcionar eventuais sobras prioritariamente para sua reserva de emergência antes de buscar ativos mais arriscados.`,
        actionLink: {
          href: "/analises",
          label: "Ver Análises Inteligentes",
        },
      };
    }

    // 2. Reserva de Emergência
    if (promptLower.includes("reserva") || promptLower.includes("emergência")) {
      const avgExpense = f.expense.gt(0) ? f.expense.toNumber() : 3000;
      const targetReserve = avgExpense * 6;
      return {
        content: `### Planejamento da Reserva de Emergência Ideal\n\nA reserva de emergência deve cobrir **6 a 12 meses** do seu custo de vida mensal.\n\n| Parâmetro | Valor Estimado |\n|---|---|\n| Custo Mensal Médio | ${formatCurrency(
          avgExpense
        )} |\n| Reserva Ideal (6 meses) | ${formatCurrency(targetReserve)} |\n| Instrumentos Indicados | Tesouro Selic, Caixinha CDI 100% liquidez diária |\n\n**Como executar:**\n1. Crie uma meta específica chamada **Reserva de Emergência**.\n2. Defina depósitos automáticos mensais recorrentes.\n3. Só retire em casos estritos de imprevistos essenciais.`,
        actionLink: {
          href: "/metas",
          label: "Criar ou Ver Metas",
        },
      };
    }

    // 3. Diversificação & Investimentos
    if (promptLower.includes("diversific") || promptLower.includes("carteira") || promptLower.includes("investir")) {
      const activeAssets = ps.filter((p) => p.value.gt(0));
      return {
        content: `### Estratégia de Diversificação Patrimonial\n\nAtualmente você tem **${activeAssets.length} ativo(s)** com saldo em custódia, somando ${formatCurrency(
          total.value
        )}.\n\n**Estrutura Recomendada para InvestFast:**\n- **50% Renda Fixa / Pós-fixada (CDI/Selic):** Segurança e previsibilidade.\n- **30% Inflação (IPCA+):** Proteção do poder de compra no longo prazo.\n- **20% Renda Variável (Ações/FIIs):** Geração de proventos e valorização real.\n\nRebalanceie sua carteira sem vender ativos: basta direcionar os novos aportes mensais para as classes que estão abaixo da meta percentual.`,
        actionLink: {
          href: "/calculadora",
          label: "Projetar na Calculadora",
        },
      };
    }

    // 4. Proventos & Dividendos
    if (promptLower.includes("provento") || promptLower.includes("dividendo")) {
      return {
        content: `### O Poder do Reinvestimento de Proventos\n\nNo InvestFast, você acumula **${formatCurrency(
          total.income
        )}** em proventos registrados até o momento.\n\n**O Efeito Bola de Neve:**\n- Ao reinvestir 100% dos proventos recebidos, você compra mais cotas sem tirar dinheiro novo do bolso.\n- Novas cotas geram mais proventos no mês seguinte, acelerando a curva exponencial dos juros compostos.\n- No longo prazo, a renda passiva mensal gerada supera o valor dos seus aportes do trabalho.`,
        actionLink: {
          href: "/operacoes",
          label: "Ver Histórico de Proventos",
        },
      };
    }

    // 5. Orçamento & Regra 50/30/20
    if (promptLower.includes("orçamento") || promptLower.includes("50/30/20") || promptLower.includes("gastos") || promptLower.includes("consumo")) {
      const incomeVal = f.income.gt(0) ? f.income.toNumber() : 5000;
      return {
        content: `### Distribuição do Orçamento pela Regra 50/30/20\n\nAplicada à sua receita mensal estimada de **${formatCurrency(incomeVal)}**:\n\n| Categoria | Percentual | Valor Sugerido |\n|---|---|---|\n| Necessidades Básicas (moradia, saúde, contas) | 50% | ${formatCurrency(incomeVal * 0.5)} |\n| Estilo de Vida (lazer, compras, conforto) | 30% | ${formatCurrency(incomeVal * 0.3)} |\n| Aportes & Futuro (investimentos e metas) | 20% | ${formatCurrency(incomeVal * 0.2)} |\n\nCadastre limites em **Orçamentos** para ser avisado antes de estourar o mês.`,
        actionLink: {
          href: "/orcamentos",
          label: "Gerenciar Orçamentos",
        },
      };
    }

    // 6. Metas
    if (promptLower.includes("meta") || promptLower.includes("acelerar")) {
      const goalsCount = data.goals?.length || 0;
      return {
        content: `### Aceleração das suas Metas Cadastradas\n\nVocê possui atualmente **${goalsCount} meta(s)** cadastradas no InvestFast.\n\n**3 Alavancas para atingir até 40% mais rápido:**\n1. **Aporte receitas sazonais:** 100% de restituição de IR, 13º salário e bônus direcionados para a meta.\n2. **Aporte por semana:** Fracionar o aporte mensal em depósitos semanais melhora o hábito e antecipa rendimentos.\n3. **Cancele assinaturas ociosas:** R$ 150/mês economizados representam quase R$ 2.000 a mais por ano em aportes diretos.`,
        actionLink: {
          href: "/metas",
          label: "Acessar Painel de Metas",
        },
      };
    }

    // Padrão amigável
    return {
      content: `Entendi sua dúvida sobre: "${userPrompt}".\n\nNo InvestFast, você pode gerenciar isso de forma prática:\n\n1. Mantenha seus lançamentos atualizados na tela de **Transações**.\n2. Use a **Calculadora de Investimentos** para projetar prazos e aportes com juros compostos.\n3. Acompanhe a evolução do patrimônio no **Dashboard** consolidado.\n\nDeseja que eu simule algum cálculo ou forneça uma orientação passo a passo?`,
      actionLink: {
        href: "/calculadora",
        label: "Ir para Calculadora",
      },
    };
  };

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    setShowWelcome(false);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    const result = generateAnswer(query);

    // Efeito de streaming fluido
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${crypto.randomUUID()}`,
          role: "assistant",
          content: result.content,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          actionLink: result.actionLink,
        },
      ]);
    }, 1100);
  };

  // Renderizador estruturado de Markdown
  const renderMessageContent = (msgText: string) => {
    const lines = msgText.split("\n");
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith("### ")) {
            return (
              <h3 key={idx} className="mt-2 text-sm font-bold text-foreground">
                {line.replace("### ", "")}
              </h3>
            );
          }
          if (line.startsWith("- ")) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-1">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span
                  dangerouslySetInnerHTML={{
                    __html: line
                      .replace("- ", "")
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>'),
                  }}
                />
              </div>
            );
          }
          if (line.startsWith("|") && line.endsWith("|")) {
            const cells = line.split("|").filter(Boolean).map((c) => c.trim());
            if (cells.some((c) => c.includes("---"))) return null;
            return (
              <div key={idx} className="my-1 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2 text-xs">
                {cells.map((cell, cIdx) => (
                  <span key={cIdx} className={cIdx === 0 ? "font-semibold text-foreground" : "text-right font-mono text-muted-foreground"}>
                    {cell}
                  </span>
                ))}
              </div>
            );
          }
          if (!line.trim()) return <div key={idx} className="h-1" />;
          return (
            <p
              key={idx}
              dangerouslySetInnerHTML={{
                __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>'),
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100dvh_-_11rem)] min-h-[520px] flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Top Header do Chat */}
      <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6 bg-card/95 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <span className="brand-mark flex size-9 items-center justify-center rounded-xl">
            <Sparkles className="size-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight">Assistente InvestFast IA</h1>
              <span className="flex items-center gap-1 rounded-full bg-gain/10 px-2 py-0.5 text-[10px] font-medium text-gain">
                <span className="size-1.5 rounded-full bg-gain animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Diagnósticos, simulações e estratégias com dados do seu patrimônio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            title="Iniciar nova conversa limpa"
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Nova conversa</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
            title="Limpar histórico"
            aria-label="Limpar histórico da conversa"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Área de Mensagens com Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 sm:p-6">
        {displayedMessages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={cn("flex items-start gap-3 max-w-3xl", isUser ? "ml-auto flex-row-reverse" : "mr-auto")}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                  isUser
                    ? "bg-primary text-primary-foreground"
                    : "brand-mark"
                )}
              >
                {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
              </div>

              {/* Bolha de Mensagem */}
              <div
                className={cn(
                  "relative rounded-2xl px-4 py-3 shadow-2xs group transition-all max-w-[85%]",
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-xs"
                    : "border border-border bg-muted/30 text-foreground rounded-tl-xs"
                )}
              >
                {isUser ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div>
                    {renderMessageContent(msg.content)}

                    {/* Botão de Ação Direta no Chat */}
                    {msg.actionLink && (
                      <div className="mt-3.5 border-t border-border/50 pt-2.5">
                        <Button size="sm" variant="outline" asChild className="h-8 text-xs gap-1.5 font-medium">
                          <Link href={msg.actionLink.href}>
                            <span>{msg.actionLink.label}</span>
                            <ExternalLink className="size-3 text-primary" />
                          </Link>
                        </Button>
                      </div>
                    )}

                    {/* Barra de Rodapé da Bolha */}
                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[10px] text-muted-foreground">
                      <span>{msg.timestamp || "Agora"}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Copiar resposta"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="size-3 text-gain" />
                            <span className="text-gain font-medium">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" />
                            <span>Copiar resposta</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Indicador de Digitação (Streaming Indicator) */}
        {isTyping && (
          <div className="flex items-center gap-3 mr-auto">
            <div className="brand-mark flex size-8 items-center justify-center rounded-xl">
              <Bot className="size-4" />
            </div>
            <div className="rounded-2xl rounded-tl-xs border border-border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="size-2 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="size-2 rounded-full bg-primary/80 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="ml-2 text-xs text-muted-foreground font-medium">InvestFast IA pensando…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Sugestões Rápidas Categorizadas (Chips) */}
      <div className="border-t bg-muted/10 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Temas sugeridos:
          </span>
          <div className="flex gap-1.5">
            {promptCategories.map((c) => (
              <button
                key={c.category}
                type="button"
                onClick={() => setSelectedCategory(c.category)}
                className={cn(
                  "rounded-lg px-2 py-0.5 text-[10px] font-medium transition-colors",
                  selectedCategory === c.category
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {c.category}
              </button>
            ))}
          </div>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {promptCategories
            .find((c) => c.category === selectedCategory)
            ?.prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
              >
                <span>{prompt}</span>
                <ArrowRight className="size-3 text-primary" />
              </button>
            ))}
        </div>
      </div>

      {/* Campo de Entrada de Mensagem */}
      <div className="border-t p-3 sm:p-4 bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Pergunte sobre seus gastos, investimentos ou metas…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            className="input m-0 pr-12 focus:ring-primary/20"
            aria-label="Mensagem para o assistente financeiro"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isTyping}
            aria-label="Enviar mensagem"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 rounded-lg"
          >
            <Send className="size-4" />
          </Button>
        </form>

        {/* Disclaimer Obrigatório & Discreto */}
        <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          O Assistente InvestFast utiliza inteligência artificial para fins de planejamento e educação financeira. Não constitui recomendação individual de compra, venda ou consultoria de valores mobiliários (CVM).
        </p>
      </div>
    </div>
  );
}
