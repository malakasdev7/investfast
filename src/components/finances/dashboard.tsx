"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  TriangleAlert,
  ArrowRight,
  Target,
  ChartPie,
  Check,
  Clock,
  Sparkles,
  Coins,
  Calculator,
  Scale,
  Lightbulb,
} from "lucide-react";
import { useFinances, useRecordMutation } from "@/hooks/use-finances";
import {
  overview,
  flow,
  historical,
  allocation,
  positions,
  insights,
  goalProgress,
  num,
  budgetUsage,
} from "@/lib/calculations/finance";
import { entities, text, type Row, type Snapshot, labels } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RecordForm } from "@/components/forms/record-form";
import { Loading, Failure, Empty } from "@/components/ui/data-state";
import {
  EvolutionChart,
  FlowChart,
  AllocationChart,
  ReturnChart,
} from "@/components/charts/finance-charts";
import { PeriodFilter, initialPeriod } from "./period-filter";
import { cn } from "@/lib/utils";

export function Metric({
  label,
  value,
  caption,
  Icon,
  accent = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  caption?: string;
  Icon?: typeof Wallet;
  accent?: boolean;
  tone?: "neutral" | "gain" | "loss";
}) {
  return (
    <div
      className={cn(
        "card p-4 sm:p-5",
        accent && "hero-metric col-span-2 sm:col-span-1",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground sm:text-sm">
          {label}
        </p>
        {Icon && (
          <Icon
            className={cn(
              "size-4 shrink-0",
              tone === "gain"
                ? "text-gain"
                : tone === "loss"
                  ? "text-loss"
                  : "text-muted-foreground",
            )}
          />
        )}
      </div>
      <p
        className={cn(
          "metric-value mt-2.5 break-words text-xl font-semibold tracking-tight sm:text-2xl",
          tone === "gain" && "text-gain",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
      {caption && (
        <p className="mt-1.5 text-xs leading-4 text-muted-foreground">
          {caption}
        </p>
      )}
    </div>
  );
}

export function RecentTransactions({ rows, data }: { rows: Row[]; data: Snapshot }) {
  return !rows.length ? (
    <Empty
      title="Seu histórico começa aqui"
      description="Registre suas receitas e despesas para acompanhar os movimentos."
    />
  ) : (
    <div className="divide-y divide-border">
      {rows.map((t) => {
        const isIncome = t.type === "income";
        const isExpense = t.type === "expense";
        return (
          <div className="flex items-center gap-3.5 px-5 py-3.5 sm:px-6 sm:py-4" key={t.id}>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-glass-light-bg",
                isIncome
                  ? "text-gain"
                  : isExpense
                    ? "text-loss"
                    : "text-muted-foreground",
              )}
            >
              {isIncome ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{text(t.description)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {text(data.categories?.find((c) => c.id === t.category_id)?.name) ||
                  labels[text(t.type)]}{" "}
                · {formatDate(text(t.transaction_date))}
              </p>
            </div>
            <div className="text-right">
              <p
                className={cn(
                  "tabular text-sm font-semibold",
                  isIncome ? "text-gain" : isExpense ? "text-loss" : "text-foreground",
                )}
              >
                {isIncome ? "+ " : isExpense ? "− " : ""}
                {formatCurrency(text(t.amount))}
              </p>
              <span className="text-xs text-muted-foreground">{labels[text(t.status)]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const { data, isPending, error, refetch } = useFinances();
  const txMutation = useRecordMutation("transactions");
  const [period, setPeriod] = useState(initialPeriod);
  const [quickModal, setQuickModal] = useState<{
    entity: string;
    title: string;
    initialValues?: Record<string, string>;
  } | null>(null);

  if (isPending) return <Loading />;
  if (error || !data)
    return <Failure message={error?.message || "Dados indisponíveis"} retry={() => refetch()} />;

  const total = overview(data);
  const f = flow(data, period.start, period.end);
  const history = historical(data, period.start, period.end);
  const alloc = allocation(data);
  const alerts = insights(data, period.start, period.end);
  const ps = positions(data);

  const returns = (data.portfolios ?? []).map((p) => {
    const holdings = ps.filter((h) => h.row.portfolio_id === p.id);
    const cost = holdings.reduce((s, h) => s.plus(h.cost), num(0));
    const value = holdings.reduce((s, h) => h.value.plus(s), num(0));
    return {
      name: text(p.name),
      value: cost.gt(0) ? value.minus(cost).div(cost).mul(100).toNumber() : 0,
    };
  });

  const recent = (data.transactions ?? [])
    .filter((t) => text(t.transaction_date) >= period.start && text(t.transaction_date) <= period.end)
    .sort((a, b) => text(b.transaction_date).localeCompare(text(a.transaction_date)))
    .slice(0, 5);

  const pendingList = (data.transactions ?? [])
    .filter((t) => t.status === "pending")
    .sort((a, b) => text(a.transaction_date).localeCompare(text(b.transaction_date)))
    .slice(0, 5);

  const operations = (data.investment_transactions ?? [])
    .filter((o) => text(o.operation_date) >= period.start && text(o.operation_date) <= period.end)
    .sort((a, b) => text(b.operation_date).localeCompare(text(a.operation_date)))
    .slice(0, 5);

  const hasAccounts = (data.accounts ?? []).length > 0;
  const hasTransactions = (data.transactions ?? []).length > 0;
  const hasInvestments = (data.assets ?? []).length > 0;
  const showOnboarding = !hasAccounts || (!hasTransactions && !hasInvestments);

  const projectTx = (r: Row) =>
    Object.fromEntries(
      entities.transactions.fields.map((field) => [field.key, r[field.key] ?? field.default ?? ""]),
    );

  const resultTone = total.result.gt(0) ? "gain" : total.result.lt(0) ? "loss" : "neutral";
  const balanceTone = f.balance.gt(0) ? "gain" : f.balance.lt(0) ? "loss" : "neutral";
  const unrealizedTone = total.unrealized.gt(0) ? "gain" : total.unrealized.lt(0) ? "loss" : "neutral";
  const realizedTone = total.realized.gt(0) ? "gain" : total.realized.lt(0) ? "loss" : "neutral";

  const incomeNum = f.income.toNumber();
  const expenseNum = f.expense.toNumber();
  const flowTotal = incomeNum + expenseNum;
  const incomeShare = flowTotal > 0 ? Math.round((incomeNum / flowTotal) * 100) : 50;

  return (
    <div className="animate-fade-in space-y-6 lg:space-y-7">
      {/* Cabeçalho e Controles do Período */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "long",
              timeZone: "America/Sao_Paulo",
            }).format(new Date())}
          </p>
          <h1 className="page-heading">
            Olá, {text(data.profiles?.[0]?.name).split(" ")[0] || "bem-vindo"}
          </h1>
          <p className="subheading">
            Visão consolidada do seu patrimônio, investimentos e fluxo de caixa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <PeriodFilter value={period} onChange={setPeriod} />
          <div className="flex items-center gap-2">
            <Button
              size="default"
              variant="outline"
              onClick={() =>
                setQuickModal({
                  entity: "investment_transactions",
                  title: "Registrar operação",
                })
              }
            >
              <Coins className="size-4 text-primary" />
              <span>Operar</span>
            </Button>
            <Button
              size="default"
              onClick={() =>
                setQuickModal({
                  entity: "transactions",
                  title: "Nova transação",
                  initialValues: { type: "expense" },
                })
              }
            >
              <Plus className="size-4" />
              <span>Nova transação</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Barra Compacta de Ações e Ferramentas de Decisão (glass-navigation) */}
      <nav
        aria-label="Ferramentas de decisão e atalhos"
        className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1 lg:flex-wrap lg:overflow-visible"
      >
        <span className="hidden shrink-0 px-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:inline">
          Acesso rápido
        </span>
        {[
          {
            href: "/posso-comprar",
            title: "Posso comprar?",
            desc: "Simular viabilidade",
            Icon: Scale,
          },
          {
            href: "/calculadora",
            title: "Calculadora",
            desc: "Juros e metas",
            Icon: Calculator,
          },
          {
            href: "/assistente",
            title: "Assistente IA",
            desc: "Copiloto financeiro",
            Icon: Sparkles,
          },
          {
            href: "/analises",
            title: "Diagnóstico",
            desc: "Risco e reserva",
            Icon: Lightbulb,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass-control group inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-medium text-foreground transition-colors sm:text-sm"
          >
            <item.Icon className="size-4 text-primary transition-transform group-hover:scale-105" />
            <span className="font-semibold">{item.title}</span>
            <span className="hidden text-xs text-muted-foreground 2xl:inline">· {item.desc}</span>
          </Link>
        ))}

        <div className="mx-1 h-4 w-px shrink-0 bg-border sm:hidden" />
        {[
          ["/contas", "Contas", Wallet],
          ["/metas", "Metas", Target],
          ["/relatorios", "Relatórios", ChartPie],
          ["/mercado", "Mercado", TrendingUp],
        ].map(([href, label, Icon]) => {
          const I = Icon as typeof Wallet;
          return (
            <Link
              key={String(href)}
              href={String(href)}
              className="glass-control inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:hidden"
            >
              <I className="size-3.5 text-primary" />
              {String(label)}
            </Link>
          );
        })}
      </nav>

      {showOnboarding && (
        <section className="card border-primary/30 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Primeiros passos para organizar suas finanças</h2>
          </div>
          <div className="grid gap-3.5 sm:grid-cols-3 sm:divide-x sm:divide-border">
            <div className="flex items-center justify-between gap-3 border-b border-border py-3 sm:border-b-0 sm:py-1 sm:pr-4">
              <div>
                <p className="text-sm font-semibold">1. Crie sua primeira conta</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Banco, carteira ou corretora</p>
              </div>
              {hasAccounts ? (
                <span className="rounded-full bg-gain/15 p-1.5 text-gain" aria-label="Concluído">
                  <Check className="size-4" />
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setQuickModal({ entity: "accounts", title: "Adicionar conta" })}
                >
                  Criar
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-border py-3 sm:border-b-0 sm:px-4 sm:py-1">
              <div>
                <p className="text-sm font-semibold">2. Registre um lançamento</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Receita ou despesa do mês</p>
              </div>
              {hasTransactions ? (
                <span className="rounded-full bg-gain/15 p-1.5 text-gain" aria-label="Concluído">
                  <Check className="size-4" />
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasAccounts}
                  onClick={() =>
                    setQuickModal({
                      entity: "transactions",
                      title: "Nova transação",
                      initialValues: { type: "expense" },
                    })
                  }
                >
                  Lançar
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 py-3 sm:py-1 sm:pl-4">
              <div>
                <p className="text-sm font-semibold">3. Explore o Mercado ou Ativos</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Ações, FIIs, renda fixa e cripto</p>
              </div>
              {hasInvestments ? (
                <span className="rounded-full bg-gain/15 p-1.5 text-gain" aria-label="Concluído">
                  <Check className="size-4" />
                </span>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/mercado">Explorar</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Composição Principal: Patrimônio Protagonista + Fluxo Financeiro Unificado */}
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        {/* Painel Protagonista de Patrimônio */}
        <section
          aria-label="Resumo patrimonial"
          className="hero-metric flex flex-col justify-between rounded-3xl p-6 sm:p-7"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Patrimônio total</p>
                <p className="text-xs text-muted-foreground/80">
                  Contas + investimentos · posição atual
                </p>
              </div>

              <div
                className={cn(
                  "inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border px-3.5 py-2 text-xs font-semibold tabular sm:rounded-full sm:py-1.5",
                  resultTone === "gain"
                    ? "border-gain/30 bg-gain/12 text-gain"
                    : resultTone === "loss"
                      ? "border-loss/30 bg-loss/12 text-loss"
                      : "border-glass-border bg-glass-light-bg text-muted-foreground",
                )}
              >
                {resultTone === "loss" ? (
                  <TrendingDown className="size-3.5" />
                ) : (
                  <TrendingUp className="size-3.5" />
                )}
                <span className="whitespace-nowrap">
                  Resultado total:{" "}
                  {total.result.gt(0) ? "+" : ""}
                  {formatCurrency(total.result)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">
                  Valorização: {total.rate.gt(0) ? "+" : ""}
                  {total.rate.toFixed(2)}%
                </span>
              </div>
            </div>

            <p className="metric-value mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[42px]">
              {formatCurrency(total.wealth)}
            </p>
          </div>

          {/* Composição de Apoio: Contas e Investimentos */}
          <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2 sm:gap-0">
            <div className="sm:border-r sm:border-border sm:pr-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                  Saldo das contas
                </span>
                <Link
                  href="/contas"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {data.accounts?.length || 0} contas cadastradas
                </Link>
              </div>
              <p className="metric-value mt-2 text-xl font-semibold text-foreground sm:text-2xl">
                {formatCurrency(total.cash)}
              </p>
            </div>

            <div className="border-t border-border pt-4 sm:border-t-0 sm:py-0 sm:pl-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                  Investimentos
                </span>
                <span className="text-xs text-muted-foreground tabular">
                  Custo: {formatCurrency(total.cost)}
                </span>
              </div>
              <p className="metric-value mt-2 text-xl font-semibold text-foreground sm:text-2xl">
                {formatCurrency(total.value)}
              </p>
            </div>
          </div>

          {/* Desdobramento de Resultados da Carteira */}
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border/60 pt-5 min-[480px]:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Lucro realizado</p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold tabular sm:text-base",
                  realizedTone === "gain"
                    ? "text-gain"
                    : realizedTone === "loss"
                      ? "text-loss"
                      : "text-foreground",
                )}
              >
                {formatCurrency(total.realized)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro não realizado</p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold tabular sm:text-base",
                  unrealizedTone === "gain"
                    ? "text-gain"
                    : unrealizedTone === "loss"
                      ? "text-loss"
                      : "text-foreground",
                )}
              >
                {formatCurrency(total.unrealized)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dividendos e proventos</p>
              <p
                className={cn(
                  "mt-1 text-sm font-semibold tabular sm:text-base",
                  total.income.gt(0) ? "text-gain" : "text-foreground",
                )}
              >
                {formatCurrency(total.income)}
              </p>
            </div>
          </div>
        </section>

        {/* Conjunto Visual Unificado de Fluxo Financeiro */}
        <section
          aria-label="Fluxo financeiro do período"
          className="card flex flex-col justify-between rounded-3xl p-6 sm:p-7"
        >
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  Fluxo financeiro do período
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Comparativo entre entradas, saídas e resultado líquido
                </p>
              </div>
              <span
                className={cn(
                  "badge",
                  balanceTone === "gain"
                    ? "badge-gain"
                    : balanceTone === "loss"
                      ? "badge-loss"
                      : "badge-primary",
                )}
              >
                {balanceTone === "gain"
                  ? "Superávit"
                  : balanceTone === "loss"
                    ? "Déficit"
                    : "Equilíbrio"}
              </span>
            </div>

            <div className="mt-5 border-b border-border pb-5">
              <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                Saldo do período
              </p>
              <p
                className={cn(
                  "metric-value mt-1.5 text-2xl font-semibold tracking-tight sm:text-3xl",
                  balanceTone === "gain"
                    ? "text-gain"
                    : balanceTone === "loss"
                      ? "text-loss"
                      : "text-foreground",
                )}
              >
                {f.balance.gt(0) ? "+ " : f.balance.lt(0) ? "− " : ""}
                {formatCurrency(f.balance.abs())}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Receitas menos despesas pagas</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
                  <ArrowDownLeft className="size-4 text-gain" />
                  <span>Receitas no período</span>
                </div>
                <p
                  className={cn(
                    "metric-value text-lg font-semibold sm:text-xl",
                    f.income.gt(0) ? "text-gain" : "text-foreground",
                  )}
                >
                  {formatCurrency(f.income)}
                </p>
                <p className="text-xs text-muted-foreground">Receitas pagas</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
                  <ArrowUpRight className="size-4 text-loss" />
                  <span>Despesas no período</span>
                </div>
                <p
                  className={cn(
                    "metric-value text-lg font-semibold sm:text-xl",
                    f.expense.gt(0) ? "text-loss" : "text-foreground",
                  )}
                >
                  {formatCurrency(f.expense)}
                </p>
                <p className="text-xs text-muted-foreground">Despesas pagas</p>
              </div>
            </div>

            {/* Barra de proporção Receitas vs Despesas */}
            <div className="space-y-1.5 pt-1">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {flowTotal > 0 ? (
                  <>
                    <div
                      className="h-full bg-gain transition-all duration-300"
                      style={{ width: `${incomeShare}%` }}
                    />
                    <div
                      className="h-full bg-loss transition-all duration-300"
                      style={{ width: `${100 - incomeShare}%` }}
                    />
                  </>
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground tabular">
                <span>
                  Entradas: {flowTotal > 0 ? `${incomeShare}%` : "0%"}
                </span>
                <span>
                  Saídas: {flowTotal > 0 ? `${100 - incomeShare}%` : "0%"}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {pendingList.length > 0 && (
        <section className="card overflow-hidden border-warning/30">
          <div className="flex items-center justify-between border-b border-border bg-warning/8 px-5 py-3.5 sm:px-6">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-warning" />
              <h2 className="text-base font-semibold">Contas e lançamentos pendentes</h2>
            </div>
            <Link href="/transacoes" className="text-xs font-medium text-primary hover:underline">
              Ver todos ({data.transactions?.filter((t) => t.status === "pending").length})
            </Link>
          </div>
          <div className="divide-y divide-border">
            {pendingList.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{text(t.description)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Vencimento: {formatDate(text(t.transaction_date))} ·{" "}
                    {text(data.accounts?.find((a) => a.id === t.account_id)?.name)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "tabular text-sm font-semibold",
                      t.type === "income" ? "text-gain" : t.type === "expense" ? "text-loss" : "",
                    )}
                  >
                    {formatCurrency(text(t.amount))}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={txMutation.isPending}
                    onClick={() =>
                      txMutation.mutate({
                        method: "PATCH",
                        id: t.id,
                        values: { ...projectTx(t), status: "paid" },
                      })
                    }
                    className="h-8 px-3 text-xs"
                  >
                    <Check className="size-3.5 text-primary" />
                    Efetivar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gráficos Principais: Evolução e Alocação */}
      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="card min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Evolução do patrimônio</h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Consolidação de contas e investimentos no período
              </p>
            </div>
            <span className="badge">BRL (R$)</span>
          </div>
          {data.accounts?.length || data.holdings?.length ? (
            <EvolutionChart data={history} />
          ) : (
            <Empty
              title="Vamos começar sua história?"
              description="Adicione uma conta e seus primeiros investimentos para visualizar a evolução."
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Posições históricas sem cotação são estimadas pelo custo. Saldos iniciais passam a
            valer na criação da conta.
          </p>
        </section>

        <section className="card min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Alocação dos investimentos</h2>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Distribuição atual por classe de ativo
              </p>
            </div>
            <Link href="/investimentos" className="text-xs font-medium text-primary hover:underline">
              Carteira
            </Link>
          </div>
          <div>
            {alloc.length ? (
              <AllocationChart data={alloc} />
            ) : (
              <Empty
                title="Sua carteira, sua estratégia"
                description="Registre ativos e cotações para visualizar a distribuição."
              />
            )}
          </div>
        </section>
      </div>

      {/* Gráficos Secundários: Receitas x Despesas e Rentabilidade por Carteira */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card min-w-0 p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold tracking-tight">Receitas × despesas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Evolução do fluxo mensal efetivado
            </p>
          </div>
          <FlowChart data={history} />
        </section>

        <section className="card min-w-0 p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold tracking-tight">Rentabilidade por carteira</h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Valorização atual sobre o custo remanescente
            </p>
          </div>
          {ps.length ? (
            <ReturnChart data={returns} />
          ) : (
            <Empty title="Sem posições registradas" />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Valorização atual / custo remanescente. Não inclui proventos.
          </p>
        </section>
      </div>

      {/* Movimentações Recentes e Objetivos */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold tracking-tight">Últimas transações</h2>
            <Link
              href="/transacoes"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver todas <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <RecentTransactions rows={recent} data={data} />
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Seus próximos objetivos</h2>
            <Link href="/metas" className="text-xs font-medium text-primary hover:underline">
              Ver metas
            </Link>
          </div>
          {data.goals?.length ? (
            <div className="divide-y divide-border">
              {data.goals
                .filter((g) => g.status !== "cancelled")
                .slice(0, 4)
                .map((g) => {
                  const p = goalProgress(g);
                  const pct = Math.min(100, Math.max(0, p.percent));
                  return (
                    <div
                      key={g.id}
                      className="py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-foreground">{text(g.name)}</span>
                        <span className="tabular font-semibold text-primary">
                          {p.percent.toFixed(0)}%
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="my-2.5 h-2 w-full overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="tabular">
                          {formatCurrency(p.saved)} de {formatCurrency(p.target)}
                        </span>
                        <span>Prazo: {formatDate(text(g.deadline))}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <Empty
              title="Qual é sua próxima conquista?"
              description="Crie uma meta e acompanhe cada passo até ela."
            />
          )}
        </section>
      </div>

      {/* Últimas Operações e Radar de Alertas */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Últimas operações</h2>
            <Link href="/operacoes" className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {operations.length ? (
            <div className="divide-y divide-border">
              {operations.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between py-3.5 text-sm first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {text(data.assets?.find((a) => a.id === o.asset_id)?.ticker)} ·{" "}
                      {labels[text(o.type)]}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(text(o.operation_date))}
                    </p>
                  </div>
                  <span className="tabular font-semibold text-foreground">
                    {formatCurrency(text(o.total_amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Nenhuma operação no período" />
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">No seu radar</h2>
            <Link href="/analises" className="text-xs font-medium text-primary hover:underline">
              Análise completa
            </Link>
          </div>
          {alerts.length ? (
            <div className="space-y-3">
              {alerts.slice(0, 4).map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3 rounded-2xl border p-4",
                    a.severity === "danger"
                      ? "border-loss/30 bg-loss/8"
                      : "border-warning/30 bg-warning/8",
                  )}
                >
                  <TriangleAlert
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      a.severity === "danger" ? "text-loss" : "text-warning",
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{a.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum alerta para os dados registrados.
            </p>
          )}
          {budgetUsage(data).filter((b) => b.percent >= 100).length > 0 && (
            <Link
              href="/orcamentos"
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Revisar orçamentos <ArrowRight className="size-3.5" />
            </Link>
          )}
        </section>
      </div>

      {quickModal && (
        <Dialog title={quickModal.title} onClose={() => setQuickModal(null)}>
          <RecordForm
            entity={quickModal.entity}
            data={data}
            initialValues={quickModal.initialValues}
            onDone={() => setQuickModal(null)}
          />
        </Dialog>
      )}
    </div>
  );
}
