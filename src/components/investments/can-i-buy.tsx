"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BookmarkPlus,
  Trash2,
  Plus,
  Sparkles,
  Calculator,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { api, useFinances } from "@/hooks/use-finances";
import {
  evaluatePurchase,
  type PurchaseHorizon,
  type InvestorRiskProfile,
  type PurchaseVerdict,
} from "@/lib/calculations/can-i-buy";
import { catalog } from "@/lib/market/catalog";
import { labels, text } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AllocationChart } from "@/components/charts/finance-charts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RecordForm } from "@/components/forms/record-form";
import { Loading, Failure, Empty } from "@/components/ui/data-state";
import { cn } from "@/lib/utils";

type SavedEvaluation = {
  id: string;
  asset_ticker: string;
  asset_name: string;
  asset_class: string;
  amount: string;
  horizon: PurchaseHorizon;
  risk_profile: InvestorRiskProfile;
  verdict: PurchaseVerdict;
  score: number;
  created_at: string;
};

const ASSET_CLASSES = [
  "cdi",
  "treasury",
  "cdb",
  "lci",
  "lca",
  "stock",
  "fii",
  "etf",
  "bdr",
  "debenture",
  "cri",
  "cra",
  "fund",
  "pension",
  "crypto",
  "other",
] as const;

export function CanIBuyPage({
  initialTicker = "",
  initialName = "",
  initialClass = "",
}: {
  initialTicker?: string;
  initialName?: string;
  initialClass?: string;
}) {
  const { data, isPending, error, refetch } = useFinances();
  const queryClient = useQueryClient();

  const catalogMatch = catalog.find(
    (c) => c.ticker.toUpperCase() === initialTicker.trim().toUpperCase(),
  );

  const [ticker, setTicker] = useState(
    initialTicker ? initialTicker.toUpperCase() : "TESOURO SELIC",
  );
  const [name, setName] = useState(
    initialName || catalogMatch?.name || (initialTicker ? initialTicker.toUpperCase() : "Tesouro Selic Pós-fixado"),
  );
  const [assetClass, setAssetClass] = useState<string>(
    initialClass || (catalogMatch?.asset_class && catalogMatch.asset_class !== "index" ? catalogMatch.asset_class : "treasury"),
  );
  const [amountInput, setAmountInput] = useState("1000");
  const [horizon, setHorizon] = useState<PurchaseHorizon>("medium");
  const [riskProfile, setRiskProfile] = useState<InvestorRiskProfile>("moderate");
  const [useAccountBalance, setUseAccountBalance] = useState(true);
  const [hasHighInterestDebt, setHasHighInterestDebt] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const historyQuery = useQuery({
    queryKey: ["can-i-buy-history"],
    queryFn: () =>
      api<{ items: SavedEvaluation[]; migrationPending?: boolean }>("/api/can-i-buy"),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api("/api/can-i-buy", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["can-i-buy-history"] });
      await queryClient.invalidateQueries({ queryKey: ["finances"] });
      toast.success("Avaliação salva no seu histórico.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api("/api/can-i-buy", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["can-i-buy-history"] });
      toast.success("Avaliação removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parsedAmount = useMemo(() => {
    const cleaned = amountInput.replace(",", ".").trim();
    const numVal = Number(cleaned);
    return Number.isFinite(numVal) && numVal > 0 ? numVal : 0;
  }, [amountInput]);

  if (isPending) return <Loading />;
  if (error || !data)
    return <Failure message={error?.message || "Dados indisponíveis"} retry={() => refetch()} />;

  const evaluation = evaluatePurchase(data, {
    ticker,
    name,
    assetClass,
    amount: parsedAmount,
    horizon,
    riskProfile,
    useAccountBalance,
    hasHighInterestDebt,
  });

  const userAssets = (data.assets ?? []).filter((a) => a.status !== "closed");
  const marketPresets = catalog.filter((c) => c.asset_class !== "index");

  function selectPreset(pTicker: string, pName: string, pClass: string) {
    setTicker(pTicker.toUpperCase());
    setName(pName);
    setAssetClass(pClass);
  }

  const verdictStyle =
    evaluation.verdict === "Pode considerar"
      ? {
          border: "border-gain/35 bg-gain/5",
          badge: "badge-gain",
          Icon: CheckCircle2,
          iconColor: "text-gain",
        }
      : evaluation.verdict === "Atenção"
        ? {
            border: "border-warning/35 bg-warning/5",
            badge: "badge-warning",
            Icon: AlertTriangle,
            iconColor: "text-warning",
          }
        : evaluation.verdict === "Não recomendado agora"
          ? {
              border: "border-loss/35 bg-loss/5",
              badge: "badge-loss",
              Icon: XCircle,
              iconColor: "text-loss",
            }
          : {
              border: "border-primary/35 bg-primary/5",
              badge: "badge",
              Icon: HelpCircle,
              iconColor: "text-primary",
            };

  const matchedUserAsset = userAssets.find(
    (a) => text(a.ticker).toUpperCase() === ticker.trim().toUpperCase(),
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-kicker">
            Decisão consciente antes de aportar
          </p>
          <h1 className="page-heading">Posso comprar?</h1>
          <p className="subheading">
            Avalie se a compra de um ativo faz sentido agora para o seu saldo, reserva, dívidas e carteira.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/calculadora">
              <Calculator className="size-4 text-primary" />
              Simular na Calculadora
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/assistente">
              <Sparkles className="size-4 text-primary" />
              Debater com a IA
            </Link>
          </Button>
        </div>
      </div>

      {/* Formulário de Simulação + Veredito Principal */}
      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
        {/* Coluna Esquerda: Parâmetros da Compra */}
        <section className="card space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <div className="flex items-center gap-2.5">
              <Scale className="size-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold tracking-tight">Configurar compra pretendida</h2>
                <p className="text-xs text-muted-foreground">
                  Escolha um ativo da sua carteira, do mercado ou digite qualquer código
                </p>
              </div>
            </div>
          </div>

          {/* Atalhos rápidos de ativos */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Sugestões rápidas:</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  selectPreset("TESOURO SELIC", "Tesouro Selic Pós-fixado", "treasury")
                }
                className={cn(
                  "cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                  ticker === "TESOURO SELIC"
                    ? "border-primary/40 bg-primary/12 text-primary font-semibold"
                    : "border-glass-border bg-glass-light-bg text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                Tesouro Selic
              </button>
              <button
                type="button"
                onClick={() => selectPreset("CDI 100%", "Caixinha / CDB Liquidez Diária", "cdi")}
                className={cn(
                  "cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                  ticker === "CDI 100%"
                    ? "border-primary/40 bg-primary/12 text-primary font-semibold"
                    : "border-glass-border bg-glass-light-bg text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                CDI 100%
              </button>
              {userAssets.slice(0, 4).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    selectPreset(text(a.ticker), text(a.name), text(a.asset_class) || "stock")
                  }
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                    ticker === text(a.ticker).toUpperCase()
                      ? "border-primary/40 bg-primary/12 text-primary font-semibold"
                      : "border-glass-border bg-glass-light-bg text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {text(a.ticker)} (Carteira)
                </button>
              ))}
              {marketPresets.slice(0, 5).map((m) => (
                <button
                  key={m.ticker}
                  type="button"
                  onClick={() => selectPreset(m.ticker, m.name, m.asset_class)}
                  className={cn(
                    "cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                    ticker === m.ticker.toUpperCase()
                      ? "border-primary/40 bg-primary/12 text-primary font-semibold"
                      : "border-glass-border bg-glass-light-bg text-muted-foreground hover:border-border-strong hover:text-foreground",
                  )}
                >
                  {m.ticker}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="field-label">
              Ticker ou código do ativo
              <input
                className="input uppercase"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Ex.: PETR4, HGLG11, BTC"
                maxLength={24}
              />
            </label>

            <label className="field-label">
              Nome ou descrição
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Petrobras PN"
                maxLength={120}
              />
            </label>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="field-label">
              Classe do ativo
              <select
                className="input"
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value)}
              >
                {ASSET_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {labels[c] || c}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Valor da compra (R$)
              <input
                className="input tabular"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="1000.00"
              />
            </label>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <label className="field-label">
              Prazo / objetivo deste dinheiro
              <select
                className="input"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value as PurchaseHorizon)}
              >
                <option value="short">Curto prazo (até 1 ano)</option>
                <option value="medium">Médio prazo (1 a 5 anos)</option>
                <option value="long">Longo prazo (mais de 5 anos)</option>
              </select>
            </label>

            <label className="field-label">
              Seu perfil de risco
              <select
                className="input"
                value={riskProfile}
                onChange={(e) => setRiskProfile(e.target.value as InvestorRiskProfile)}
              >
                <option value="conservative">Conservador (prioriza segurança)</option>
                <option value="moderate">Moderado (equilíbrio risco/retorno)</option>
                <option value="aggressive">Arrojado (aceita alta volatilidade)</option>
              </select>
            </label>
          </div>

          <label className="flex items-center gap-2.5 pt-1 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={useAccountBalance}
              onChange={(e) => setUseAccountBalance(e.target.checked)}
              className="size-4 rounded border-border accent-primary"
            />
            Descontar este valor do saldo atual das minhas contas bancárias/corretora
          </label>

          <label className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={hasHighInterestDebt}
              onChange={(e) => setHasHighInterestDebt(e.target.checked)}
              className="size-4 rounded border-border accent-primary"
            />
            Tenho dívida no cartão de crédito rotativo ou empréstimo com juros altos
          </label>

          <div className="flex flex-wrap gap-2.5 border-t pt-4">
            <Button
              type="button"
              disabled={saveMutation.isPending || parsedAmount <= 0 || !ticker.trim()}
              onClick={() =>
                saveMutation.mutate({
                  asset_ticker: ticker.trim().toUpperCase(),
                  asset_name: name.trim() || ticker.trim().toUpperCase(),
                  asset_class: assetClass,
                  amount: parsedAmount,
                  horizon,
                  risk_profile: riskProfile,
                  verdict: evaluation.verdict,
                  score: evaluation.score,
                  analysis: {
                    headline: evaluation.headline,
                    justifications: evaluation.justifications,
                    risks: evaluation.risks,
                    alternatives: evaluation.alternatives,
                    budgetImpact: evaluation.budgetImpact,
                    portfolioImpact: {
                      assetShareBeforePct: evaluation.portfolioImpact.assetShareBeforePct,
                      assetShareAfterPct: evaluation.portfolioImpact.assetShareAfterPct,
                      concentrationAlert: evaluation.portfolioImpact.concentrationAlert,
                    },
                    maxRecommendedAmount: evaluation.maxRecommendedAmount,
                    followUpQuestions: evaluation.followUpQuestions,
                    criteria: evaluation.criteria.map((c) => ({ key: c.key, status: c.status })),
                  },
                })
              }
            >
              <BookmarkPlus className="size-4" />
              {saveMutation.isPending ? "Salvando…" : "Salvar avaliação"}
            </Button>

            {matchedUserAsset && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegisterModal(true)}
              >
                <Plus className="size-4 text-primary" />
                Registrar operação na carteira
              </Button>
            )}
          </div>
        </section>

        {/* Coluna Direita: Veredito + Justificativa + Riscos + Alternativas */}
        <section className="space-y-4">
          <div className={cn("card border-2 p-5 sm:p-6", verdictStyle.border)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("rounded-2xl bg-card p-3 shadow-xs", verdictStyle.iconColor)}>
                  <verdictStyle.Icon className="size-6" />
                </span>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Veredito do InvestFast
                  </span>
                  <h2 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">
                    {evaluation.verdict}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className={cn("badge text-xs", verdictStyle.badge)}>
                  Índice de adequação: {evaluation.score}/100
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-foreground">{evaluation.headline}</p>

            {/* Impacto numérico rápido */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-glass-border bg-glass-light-bg p-3.5">
                <p className="text-xs text-muted-foreground">Saldo após compra</p>
                <p
                  className={cn(
                    "tabular mt-1.5 text-base font-semibold",
                    evaluation.portfolioImpact.cashAfter < 0 ? "text-loss" : "text-foreground",
                  )}
                >
                  {formatCurrency(evaluation.portfolioImpact.cashAfter)}
                </p>
              </div>
              <div className="rounded-2xl border border-glass-border bg-glass-light-bg p-3.5">
                <p className="text-xs text-muted-foreground">Peso do ativo</p>
                <p className="tabular mt-1.5 text-base font-semibold">
                  {evaluation.portfolioImpact.assetShareBeforePct}% →{" "}
                  <span
                    className={cn(
                      evaluation.portfolioImpact.concentrationAlert ? "text-warning" : "text-primary",
                    )}
                  >
                    {evaluation.portfolioImpact.assetShareAfterPct}%
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-glass-border bg-glass-light-bg p-3.5">
                <p className="text-xs text-muted-foreground">Máximo sugerido</p>
                <p className="tabular mt-1.5 text-base font-semibold text-primary">
                  {evaluation.maxRecommendedAmount !== null
                    ? formatCurrency(evaluation.maxRecommendedAmount)
                    : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-glass-border bg-glass-light-bg p-3.5">
                <p className="text-xs text-muted-foreground">Carteira investida</p>
                <p className="tabular mt-1.5 text-base font-semibold">
                  {formatCurrency(evaluation.portfolioImpact.afterTotal)}
                </p>
              </div>
            </div>

            {evaluation.portfolioImpact.concentrationAlert && (
              <div className="mt-3.5 rounded-2xl border border-warning/35 bg-warning/10 px-4 py-3 text-xs text-foreground">
                <strong>Alerta de concentração:</strong> após esta compra,{" "}
                <span className="font-semibold">{ticker.toUpperCase()}</span> representará{" "}
                <span className="font-semibold">
                  {evaluation.portfolioImpact.assetShareAfterPct}%
                </span>{" "}
                da carteira (acima do limite de 20% por ativo).
              </div>
            )}

            <div className="mt-3.5 rounded-2xl border border-glass-border bg-glass-light-bg px-4 py-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Impacto no orçamento:</strong>{" "}
              {evaluation.budgetImpact.summary} (Peso da classe:{" "}
              {evaluation.portfolioImpact.classShareBeforePct}% →{" "}
              {evaluation.portfolioImpact.classShareAfterPct}%).
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Justificativas */}
            <article className="card p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gain">
                <CheckCircle2 className="size-4" />
                Pontos favoráveis
              </h3>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                {evaluation.justifications.map((j, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gain" />
                    <span>{j}</span>
                  </li>
                ))}
              </ul>
            </article>

            {/* Riscos */}
            <article className="card p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warning">
                <ShieldAlert className="size-4" />
                Riscos identificados
              </h3>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                {evaluation.risks.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </article>

            {/* Alternativas */}
            <article className="card p-4 sm:p-5">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <Lightbulb className="size-4" />
                Alternativas inteligentes
              </h3>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                {evaluation.alternatives.map((alt, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{alt}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
          {evaluation.followUpQuestions.length > 0 && (
            <div className="card p-4 sm:p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Perguntas adicionais para refinar sua decisão
              </h3>
              <ul className="mt-2.5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                {evaluation.followUpQuestions.map((q, idx) => (
                  <li key={idx} className="rounded-xl border bg-muted/20 px-3 py-2">
                    {q}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Análise educacional baseada nos dados do InvestFast. Não garante retorno e não constitui recomendação formal de compra ou venda.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Checklist dos Critérios Auditados */}
      {evaluation.criteria.length > 0 && (
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">
                Auditoria dos {evaluation.criteria.length} critérios financeiros e patrimoniais
              </h2>
              <p className="text-xs text-muted-foreground">
                Cada dimensão abaixo foi verificada com base nos seus dados reais cadastrados
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {evaluation.criteria.map((c) => (
              <div
                key={c.key}
                className={cn(
                  "rounded-2xl border p-3.5",
                  c.status === "ok"
                    ? "border-gain/25 bg-gain/[0.03]"
                    : c.status === "warning"
                      ? "border-warning/30 bg-warning/[0.04]"
                      : c.status === "danger"
                        ? "border-loss/30 bg-loss/[0.04]"
                        : "border-border bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{c.label}</span>
                  <span
                    className={cn(
                      "badge text-[10px]",
                      c.status === "ok"
                        ? "badge-gain"
                        : c.status === "warning"
                          ? "badge-warning"
                          : c.status === "danger"
                            ? "badge-loss"
                            : "",
                    )}
                  >
                    {c.status === "ok"
                      ? "OK"
                      : c.status === "warning"
                        ? "Atenção"
                        : c.status === "danger"
                          ? "Alerta"
                          : "Sem dados"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{c.summary}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Comparativo de Impacto na Carteira Antes vs. Depois */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Alocação atual (Antes da compra)</h2>
          <p className="text-xs text-muted-foreground">
            Total investido atual: {formatCurrency(evaluation.portfolioImpact.beforeTotal)}
          </p>
          <div className="mt-4">
            {evaluation.portfolioImpact.beforeAllocation.length > 0 ? (
              <AllocationChart data={evaluation.portfolioImpact.beforeAllocation} />
            ) : (
              <Empty
                title="Sem posições atuais"
                description="Esta compra inaugurará a alocação da sua carteira."
              />
            )}
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Alocação projetada (Depois da compra)</h2>
          <p className="text-xs text-muted-foreground">
            Total investido projetado: {formatCurrency(evaluation.portfolioImpact.afterTotal)}
          </p>
          <div className="mt-4">
            {evaluation.portfolioImpact.afterAllocation.length > 0 ? (
              <AllocationChart data={evaluation.portfolioImpact.afterAllocation} />
            ) : (
              <Empty title="Informe um valor maior que zero para simular a carteira pós-compra" />
            )}
          </div>
        </section>
      </div>

      {/* Histórico de Avaliações Salvas */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Histórico de avaliações salvas</h2>
            <p className="text-xs text-muted-foreground">
              Consulte suas análises anteriores de &ldquo;Posso comprar?&rdquo;
            </p>
          </div>
          <Link
            href="/investimentos"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ir para Investimentos <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {historyQuery.data?.items?.length ? (
          <div className="divide-y">
            {historyQuery.data.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{item.asset_ticker}</span>
                    <span className="text-xs text-muted-foreground">· {item.asset_name}</span>
                    <span
                      className={cn(
                        "badge",
                        item.verdict === "Pode considerar"
                          ? "badge-gain"
                          : item.verdict === "Atenção"
                            ? "badge-warning"
                            : item.verdict === "Não recomendado agora"
                              ? "badge-loss"
                              : "",
                      )}
                    >
                      {item.verdict} ({item.score}/100)
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {labels[item.asset_class] || item.asset_class} · Aporte avaliado:{" "}
                    <strong className="text-foreground">{formatCurrency(item.amount)}</strong> ·{" "}
                    {formatDate(item.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTicker(item.asset_ticker);
                      setName(item.asset_name);
                      setAssetClass(item.asset_class);
                      setAmountInput(String(Number(item.amount)));
                      setHorizon(item.horizon);
                      setRiskProfile(item.risk_profile);
                    }}
                  >
                    Recarregar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Excluir avaliação"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="size-4 text-muted-foreground hover:text-loss" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhuma avaliação salva ainda. Clique em &ldquo;Salvar avaliação&rdquo; para guardar suas decisões.
          </div>
        )}
      </section>

      {showRegisterModal && matchedUserAsset && (
        <Dialog
          title={`Registrar compra · ${matchedUserAsset.ticker}`}
          onClose={() => setShowRegisterModal(false)}
        >
          <RecordForm
            entity="investment_transactions"
            data={data}
            initialValues={{
              asset_id: matchedUserAsset.id,
              type: "buy",
              quantity: "1",
              unit_price: String(parsedAmount),
              operation_date: new Date().toISOString().slice(0, 10),
            }}
            onDone={() => setShowRegisterModal(false)}
          />
        </Dialog>
      )}
    </div>
  );
}

