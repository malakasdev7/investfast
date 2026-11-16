"use client";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Layers,
  Droplets,
  Gauge,
  Lightbulb,
  ArrowRight,
  TriangleAlert,
  Sparkles,
  Calculator,
  Target,
  Coins,
  BookmarkPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/hooks/use-finances";
import { analyzeFinances } from "@/lib/calculations/analytics";
import { insights } from "@/lib/calculations/finance";
import { type Snapshot } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { AllocationChart } from "@/components/charts/finance-charts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CLASS_COLORS = [
  "#2563eb",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#64748b",
];

export function FinancialAnalysis({
  data,
  period,
}: {
  data: Snapshot;
  period: { start: string; end: string };
}) {
  const queryClient = useQueryClient();
  const report = analyzeFinances(data, period.start, period.end);
  const alerts = insights(data, period.start, period.end);

  const savedAnalysesQuery = useQuery({
    queryKey: ["saved-analyses"],
    queryFn: () =>
      api<{
        insights: {
          id: string;
          type: string;
          severity: string;
          title: string;
          summary: string;
          created_at: string;
        }[];
        migrationPending?: boolean;
      }>("/api/analyses"),
    retry: false,
  });

  const saveAnalysisMutation = useMutation({
    mutationFn: () =>
      api("/api/analyses", {
        method: "POST",
        body: JSON.stringify({ start: period.start, end: period.end }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-analyses"] });
      toast.success("Diagnóstico salvo em Análises & Recomendações.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteInsightMutation = useMutation({
    mutationFn: (id: string) =>
      api("/api/analyses", {
        method: "DELETE",
        body: JSON.stringify({ id, kind: "insight" }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["saved-analyses"] });
      toast.success("Análise removida.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allocData = report.portfolio.byClass.map((c, idx) => ({
    name: c.name,
    value: c.value,
    color: CLASS_COLORS[idx % CLASS_COLORS.length],
  }));

  return (
    <div className="space-y-6">
      {/* 1. Resumo Financeiro Executivo */}
      <section className="card relative overflow-hidden border-primary/25 bg-gradient-to-br from-primary/[0.06] via-card to-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Lightbulb className="size-3.5" />
              Diagnóstico Financeiro Baseado em Dados Reais
            </div>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Patrimônio consolidado de {formatCurrency(report.summary.wealth)} com taxa de poupança de{" "}
              {report.summary.savingsRatePct.toFixed(1)}% no período
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              No intervalo selecionado, você registrou{" "}
              <strong className="font-semibold text-foreground">
                {formatCurrency(report.summary.income)}
              </strong>{" "}
              em receitas e{" "}
              <strong className="font-semibold text-foreground">
                {formatCurrency(report.summary.expense)}
              </strong>{" "}
              em despesas, gerando saldo líquido de{" "}
              <strong
                className={cn(
                  "font-semibold",
                  report.summary.balance >= 0 ? "text-gain" : "text-loss",
                )}
              >
                {formatCurrency(report.summary.balance)}
              </strong>
              .{" "}
              {report.summary.topCategory
                ? `Sua principal categoria de gasto foi ${report.summary.topCategory.name} (${formatCurrency(report.summary.topCategory.value)}).`
                : "Categorize seus lançamentos para acompanhar o peso de cada despesa."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={saveAnalysisMutation.isPending}
              onClick={() => saveAnalysisMutation.mutate()}
            >
              <BookmarkPlus className="size-4 text-primary" />
              {saveAnalysisMutation.isPending ? "Salvando…" : "Salvar diagnóstico"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/calculadora">
                <Calculator className="size-4 text-primary" />
                Calculadora
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/assistente">
                <Sparkles className="size-4" />
                Perguntar à IA
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Capacidade de Investimento + Reserva de Emergência + Risco Estimado */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Capacidade de Investimento */}
        <article className="card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Capacidade de Aporte
              </span>
              <span className="rounded-xl bg-primary/10 p-2 text-primary">
                <Wallet className="size-4" />
              </span>
            </div>
            <p className="metric-value mt-3 text-2xl font-semibold text-primary">
              {formatCurrency(report.capacity.safeMonthlyInvestment)}
              <span className="text-xs font-normal text-muted-foreground"> /mês</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Equivale a {report.capacity.currentCapacityPct.toFixed(1)}% da sua renda mensal média (referência ideal: 20%)
            </p>
            <dl className="mt-4 space-y-2 border-t pt-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Renda média (3m):</dt>
                <dd className="tabular font-medium">
                  {formatCurrency(report.capacity.avgMonthlyIncome)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Custo mensal considerado:</dt>
                <dd className="tabular font-medium">
                  {formatCurrency(report.capacity.avgMonthlyExpense)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Recorrências ativas:</dt>
                <dd className="tabular font-medium">
                  {formatCurrency(report.capacity.recurringMonthlyExpense)}
                </dd>
              </div>
            </dl>
          </div>
          <Link
            href="/calculadora?tab=monthly_contributions"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Projetar aportes na Calculadora <ArrowRight className="size-3.5" />
          </Link>
        </article>

        {/* Reserva de Emergência */}
        <article className="card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reserva de Emergência
              </span>
              <span
                className={cn(
                  "rounded-xl p-2",
                  report.emergency.status === "adequada"
                    ? "bg-gain/10 text-gain"
                    : report.emergency.status === "parcial"
                      ? "bg-warning/10 text-warning"
                      : "bg-loss/10 text-loss",
                )}
              >
                <ShieldCheck className="size-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <p className="metric-value text-2xl font-semibold">
                {report.emergency.monthsCovered.toFixed(1)} meses
              </p>
              <span
                className={cn(
                  "badge",
                  report.emergency.status === "adequada"
                    ? "badge-gain"
                    : report.emergency.status === "parcial"
                      ? "badge-warning"
                      : "badge-loss",
                )}
              >
                {report.emergency.status === "adequada"
                  ? "Completa (≥ 6m)"
                  : report.emergency.status === "parcial"
                    ? "Em formação"
                    : report.emergency.status === "baixa"
                      ? "Abaixo do ideal"
                      : "Sem base"}
              </span>
            </div>
            <div className="my-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  report.emergency.status === "adequada"
                    ? "bg-gain"
                    : report.emergency.status === "parcial"
                      ? "bg-warning"
                      : "bg-loss",
                )}
                style={{ width: `${Math.min(100, report.emergency.progressPct)}%` }}
              />
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Reserva líquida disponível:</dt>
                <dd className="tabular font-medium">
                  {formatCurrency(report.emergency.effectiveReserve)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Meta recomendada (6 meses):</dt>
                <dd className="tabular font-medium">
                  {formatCurrency(report.emergency.targetSixMonths)}
                </dd>
              </div>
            </dl>
          </div>
          <Link
            href="/metas"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Gerenciar metas e reservas <ArrowRight className="size-3.5" />
          </Link>
        </article>

        {/* Risco Estimado */}
        <article className="card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Risco Estimado da Carteira
              </span>
              <span className="rounded-xl bg-primary/10 p-2 text-primary">
                <Gauge className="size-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <p className="metric-value text-2xl font-semibold">{report.risk.profile}</p>
              <span className="badge">Score {report.risk.score}/100</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{report.risk.explanation}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
              <div className="rounded-xl bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground">Renda Fixa</p>
                <p className="tabular mt-0.5 font-semibold">{report.risk.fixedIncomePct}%</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground">Variável</p>
                <p className="tabular mt-0.5 font-semibold">{report.risk.variableIncomePct}%</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-2">
                <p className="text-[10px] text-muted-foreground">Cripto</p>
                <p className="tabular mt-0.5 font-semibold">{report.risk.cryptoPct}%</p>
              </div>
            </div>
          </div>
          <Link
            href="/calculadora?tab=portfolio_rebalance"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Rebalancear carteira <ArrowRight className="size-3.5" />
          </Link>
        </article>
      </div>

      {/* 3. Recomendações Explicadas */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Recomendações explicadas para o seu momento</h2>
            <p className="text-xs text-muted-foreground">
              Priorizadas automaticamente a partir do seu fluxo de caixa, reserva, dívidas e carteira
            </p>
          </div>
          <span className="badge">{report.recommendations.length} ações sugeridas</span>
        </div>

        {report.recommendations.length > 0 ? (
          <div className="grid gap-3.5 md:grid-cols-2">
            {report.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-col justify-between rounded-2xl border bg-background/60 p-4 transition-colors hover:border-primary/30"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "badge",
                        rec.priority === "alta"
                          ? "badge-loss"
                          : rec.priority === "media"
                            ? "badge-warning"
                            : "badge-gain",
                      )}
                    >
                      Prioridade {rec.priority}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-semibold">{rec.title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    <strong className="text-foreground">Por quê:</strong> {rec.why}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    <strong className="text-foreground">Impacto:</strong> {rec.impact}
                  </p>
                </div>
                <div className="mt-3.5 pt-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={rec.actionHref}>
                      {rec.actionLabel}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Seus indicadores principais estão equilibrados no momento.
          </p>
        )}
      </section>

      {/* 4. Comparação Mensal e Dívidas / Compromissos */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Comparação Mensal */}
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Comparação com o período anterior</h2>
              <p className="text-xs text-muted-foreground">
                Base comparativa: {report.comparison.previousStart} até {report.comparison.previousEnd}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-background/60 p-3.5">
              <p className="text-xs text-muted-foreground">Variação de Receitas</p>
              <p className="tabular mt-1 text-lg font-semibold">
                {formatCurrency(report.comparison.currentIncome)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs">
                {report.comparison.incomeDeltaPct === null ? (
                  <span className="text-muted-foreground">Sem base anterior</span>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      report.comparison.incomeDeltaPct >= 0 ? "text-gain" : "text-loss",
                    )}
                  >
                    {report.comparison.incomeDeltaPct >= 0 ? (
                      <TrendingUp className="size-3.5" />
                    ) : (
                      <TrendingDown className="size-3.5" />
                    )}
                    {report.comparison.incomeDeltaPct > 0 ? "+" : ""}
                    {report.comparison.incomeDeltaPct}% vs. anterior
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-xl border bg-background/60 p-3.5">
              <p className="text-xs text-muted-foreground">Variação de Despesas</p>
              <p className="tabular mt-1 text-lg font-semibold">
                {formatCurrency(report.comparison.currentExpense)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs">
                {report.comparison.expenseDeltaPct === null ? (
                  <span className="text-muted-foreground">Sem base anterior</span>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 font-medium",
                      report.comparison.expenseDeltaPct <= 0 ? "text-gain" : "text-loss",
                    )}
                  >
                    {report.comparison.expenseDeltaPct > 0 ? (
                      <TrendingUp className="size-3.5" />
                    ) : (
                      <TrendingDown className="size-3.5" />
                    )}
                    {report.comparison.expenseDeltaPct > 0 ? "+" : ""}
                    {report.comparison.expenseDeltaPct}% vs. anterior
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground">
              Evolução por categoria de gasto
            </p>
            {report.comparison.categoryDeltas.length > 0 ? (
              report.comparison.categoryDeltas.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between border-b py-2 text-xs last:border-0"
                >
                  <span className="font-medium">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="tabular text-muted-foreground">
                      Ant: {formatCurrency(cat.previous)}
                    </span>
                    <span className="tabular font-semibold">{formatCurrency(cat.current)}</span>
                    {cat.deltaPct !== null && (
                      <span
                        className={cn(
                          "tabular w-14 text-right font-medium",
                          cat.deltaPct > 0 ? "text-loss" : "text-gain",
                        )}
                      >
                        {cat.deltaPct > 0 ? "+" : ""}
                        {cat.deltaPct}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-4 text-xs text-muted-foreground">
                Nenhuma despesa registrada para comparação.
              </p>
            )}
          </div>
        </section>

        {/* Dívidas, Cartões e Compromissos */}
        <section className="card flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Dívidas, cartões e obrigações</h2>
                <p className="text-xs text-muted-foreground">
                  Comprometimento da renda e pendências financeiras
                </p>
              </div>
              <span
                className={cn(
                  "badge",
                  report.debts.pressure === "baixa"
                    ? "badge-gain"
                    : report.debts.pressure === "moderada"
                      ? "badge-warning"
                      : "badge-loss",
                )}
              >
                Pressão {report.debts.pressure}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-background/60 p-3.5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CreditCard className="size-3.5 text-primary" />
                  Saldo em cartões
                </p>
                <p className="tabular mt-1.5 text-lg font-semibold">
                  {formatCurrency(report.debts.creditCardBalance)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Faturas pagas no período: {formatCurrency(report.debts.cardPaymentsInPeriod)}
                </p>
              </div>

              <div className="rounded-xl border bg-background/60 p-3.5">
                <p className="text-xs text-muted-foreground">Comprometimento da renda</p>
                <p className="tabular mt-1.5 text-lg font-semibold">
                  {report.debts.debtToIncomePct.toFixed(1)}%
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Limite saudável recomendado: até 25%
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-2.5 border-t pt-3.5 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  Contas pendentes vencidas ({report.debts.overduePendingCount}):
                </dt>
                <dd
                  className={cn(
                    "tabular font-semibold",
                    report.debts.overduePendingCount > 0 ? "text-loss" : "text-foreground",
                  )}
                >
                  {formatCurrency(report.debts.overduePendingAmount)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  Próximos vencimentos pendentes ({report.debts.upcomingPendingCount}):
                </dt>
                <dd className="tabular font-semibold">
                  {formatCurrency(report.debts.upcomingPendingAmount)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" asChild>
              <Link href="/calculadora?tab=debt_payoff">
                <Calculator className="size-3.5 text-primary" />
                Simular quitação de dívidas
              </Link>
            </Button>
          </div>
        </section>
      </div>

      {/* 5. Alocação, Concentração, Diversificação e Liquidez */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Diversificação e Concentração */}
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Layers className="size-4 text-primary" />
                Alocação, concentração e diversificação
              </h2>
              <p className="text-xs text-muted-foreground">
                {report.portfolio.assetCount} ativo(s) em {report.portfolio.classCount} classe(s)
              </p>
            </div>
            <span className="badge">
              Diversificação: {report.portfolio.diversificationLevel} (
              {report.portfolio.diversificationScore}/100)
            </span>
          </div>

          {allocData.length > 0 ? (
            <>
              <AllocationChart data={allocData} />
              <div className="mt-4 space-y-2 border-t pt-3.5 text-xs">
                {report.portfolio.topAsset && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maior posição individual:</span>
                    <span className="font-semibold">
                      {report.portfolio.topAsset.ticker} ({report.portfolio.topAsset.sharePct}% ·{" "}
                      {formatCurrency(report.portfolio.topAsset.value)})
                    </span>
                  </div>
                )}
                {report.portfolio.topClass && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Maior classe de ativo:</span>
                    <span className="font-semibold">
                      {report.portfolio.topClass.name} ({report.portfolio.topClass.sharePct}%)
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Adicione ativos e operações para analisar a diversificação da sua carteira.
            </p>
          )}
        </section>

        {/* Liquidez do Patrimônio */}
        <section className="card flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Droplets className="size-4 text-primary" />
                  Perfil de liquidez do patrimônio
                </h2>
                <p className="text-xs text-muted-foreground">
                  Velocidade de conversão do seu patrimônio em dinheiro disponível
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Liquidez Imediata (D+0 / D+1)",
                  desc: "Saldo em contas, cofrinhos CDI e Tesouro Direto",
                  amount: report.liquidity.immediateAmount,
                  pct: report.liquidity.immediatePct,
                  color: "bg-gain",
                },
                {
                  label: "Curto Prazo (D+2 a D+5)",
                  desc: "Ações, FIIs, ETFs, BDRs, fundos líquidos e cripto",
                  amount: report.liquidity.shortTermAmount,
                  pct: report.liquidity.shortTermPct,
                  color: "bg-primary",
                },
                {
                  label: "Médio e Longo Prazo (Vencimento / Carência)",
                  desc: "CDB, LCI, LCA, CRI, CRA, debêntures e previdência",
                  amount: report.liquidity.mediumLongAmount,
                  pct: report.liquidity.mediumLongPct,
                  color: "bg-warning",
                },
              ].map((tier) => (
                <div key={tier.label} className="rounded-xl border bg-background/60 p-3.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>{tier.label}</span>
                    <span className="tabular">
                      {formatCurrency(tier.amount)} ({tier.pct}%)
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{tier.desc}</p>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", tier.color)}
                      style={{ width: `${Math.min(100, tier.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Alertas automáticos ativos ({alerts.length})
              </p>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((a, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2.5 rounded-xl border p-3 text-xs",
                      a.severity === "danger"
                        ? "border-loss/25 bg-loss/5"
                        : "border-warning/25 bg-warning/5",
                    )}
                  >
                    <TriangleAlert
                      className={cn(
                        "mt-0.5 size-3.5 shrink-0",
                        a.severity === "danger" ? "text-loss" : "text-warning",
                      )}
                    />
                    <div>
                      <span className="font-semibold">{a.title}: </span>
                      <span className="text-muted-foreground">{a.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 6. Principais Categorias de Gasto, Metas, Rentabilidade e Dividendos */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Principais categorias de gasto + Metas */}
        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <h2 className="text-sm font-semibold">Principais categorias de gasto no período</h2>
            <p className="text-xs text-muted-foreground">
              Distribuição dos maiores centros de despesa para priorizar cortes ou limites
            </p>
            {report.summary.topSpendingCategories.length > 0 ? (
              <div className="mt-3.5 space-y-2.5">
                {report.summary.topSpendingCategories.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{cat.name}</span>
                      <span className="tabular font-semibold">
                        {formatCurrency(cat.value)} ({cat.sharePct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, cat.sharePct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Nenhuma despesa paga registrada neste intervalo.
              </p>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Target className="size-4 text-primary" />
                Metas financeiras ({report.goals.activeCount} ativa(s))
              </h3>
              <span className="badge">{report.goals.overallProgressPct}% atingido</span>
            </div>
            {report.goals.items.length > 0 ? (
              <div className="space-y-2.5">
                {report.goals.items.map((g) => (
                  <div key={g.id} className="rounded-xl border bg-background/60 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2 font-semibold">
                      <span>{g.name}</span>
                      <span className="tabular">
                        {formatCurrency(g.saved)} / {formatCurrency(g.target)} ({g.percent}%)
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gain"
                        style={{ width: `${Math.min(100, g.percent)}%` }}
                      />
                    </div>
                    {g.monthlyRequired > 0 && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Aporte sugerido: {formatCurrency(g.monthlyRequired)}/mês
                        {g.deadline ? ` · Prazo: ${formatDate(g.deadline)}` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Crie metas em{" "}
                <Link href="/metas" className="font-semibold text-primary hover:underline">
                  Metas financeiras
                </Link>{" "}
                para acompanhar o progresso aqui.
              </p>
            )}
          </div>
        </section>

        {/* Rentabilidade e Dividendos */}
        <section className="card space-y-5 p-5 sm:p-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-primary" />
                Rentabilidade consolidada da carteira
              </h2>
              <span
                className={cn(
                  "badge",
                  report.profitability.returnPct >= 0 ? "badge-gain" : "badge-loss",
                )}
              >
                {report.profitability.returnPct >= 0 ? "+" : ""}
                {report.profitability.returnPct.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border bg-background/60 p-3">
                <span className="text-muted-foreground">Custo total investido</span>
                <p className="tabular mt-1 text-base font-semibold">
                  {formatCurrency(report.profitability.totalCost)}
                </p>
              </div>
              <div className="rounded-xl border bg-background/60 p-3">
                <span className="text-muted-foreground">Ganho / variação acumulada</span>
                <p
                  className={cn(
                    "tabular mt-1 text-base font-semibold",
                    report.profitability.capitalGain >= 0 ? "text-gain" : "text-loss",
                  )}
                >
                  {report.profitability.capitalGain >= 0 ? "+" : ""}
                  {formatCurrency(report.profitability.capitalGain)}
                </p>
              </div>
            </div>

            {(report.profitability.bestAsset || report.profitability.worstAsset) && (
              <div className="mt-3 space-y-1.5 text-xs">
                {report.profitability.bestAsset && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Melhor desempenho:</span>
                    <span className="font-semibold text-gain">
                      {report.profitability.bestAsset.ticker} (+
                      {report.profitability.bestAsset.returnPct}%)
                    </span>
                  </div>
                )}
                {report.profitability.worstAsset && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Menor desempenho:</span>
                    <span
                      className={cn(
                        "font-semibold",
                        report.profitability.worstAsset.returnPct >= 0 ? "text-gain" : "text-loss",
                      )}
                    >
                      {report.profitability.worstAsset.ticker} (
                      {report.profitability.worstAsset.returnPct}%)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Coins className="size-4 text-primary" />
                Dividendos e proventos (12 meses)
              </h3>
              <span className="badge badge-gain">
                DY 12m: {report.dividends.trailingYieldPct.toFixed(2)}%
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="rounded-xl border bg-background/60 p-3">
                <span className="text-muted-foreground">No período</span>
                <p className="tabular mt-1 font-semibold">
                  {formatCurrency(report.dividends.periodTotal)}
                </p>
              </div>
              <div className="rounded-xl border bg-background/60 p-3">
                <span className="text-muted-foreground">Últimos 12m</span>
                <p className="tabular mt-1 font-semibold text-gain">
                  {formatCurrency(report.dividends.twelveMonthsTotal)}
                </p>
              </div>
              <div className="rounded-xl border bg-background/60 p-3">
                <span className="text-muted-foreground">Média mensal</span>
                <p className="tabular mt-1 font-semibold">
                  {formatCurrency(report.dividends.monthlyAvgTwelveMonths)}
                </p>
              </div>
            </div>

            {report.dividends.topPayers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {report.dividends.topPayers.map((p) => (
                  <span key={p.ticker} className="badge">
                    {p.ticker}: {formatCurrency(p.total)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Histórico de Diagnósticos Salvos */}
      {savedAnalysesQuery.data?.insights && savedAnalysesQuery.data.insights.length > 0 && (
        <section className="card overflow-hidden">
          <div className="border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Histórico de diagnósticos salvos</h2>
            <p className="text-xs text-muted-foreground">
              Snapshots financeiros registrados na sua conta para acompanhar evolução ao longo dos meses
            </p>
          </div>
          <div className="divide-y">
            {savedAnalysesQuery.data.insights.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {item.summary} · {formatDate(item.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Excluir diagnóstico"
                  disabled={deleteInsightMutation.isPending}
                  onClick={() => deleteInsightMutation.mutate(item.id)}
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-loss" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs leading-5 text-muted-foreground">
        Análises geradas por regras determinísticas auditáveis sobre seus dados reais no InvestFast.
        As informações têm caráter educativo e de planejamento financeiro, não configurando recomendação
        regulatória de valores mobiliários.
      </p>
    </div>
  );
}
