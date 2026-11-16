"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  ChartNoAxesCombined,
  Plus,
  TrendingUp,
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
  Icon = Wallet,
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
        <p
          className={cn(
            "truncate text-xs font-medium",
            accent ? "text-slate-300" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "shrink-0 rounded-xl p-2",
            accent
              ? "bg-white/10 text-blue-200"
              : tone === "gain"
                ? "bg-gain/10 text-gain"
                : tone === "loss"
                  ? "bg-loss/10 text-loss"
                  : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p
        className={cn(
          "metric-value mt-3 break-words font-semibold tracking-tight",
          accent ? "text-2xl md:text-[26px]" : "text-lg sm:text-2xl md:text-[26px]",
          !accent && tone === "gain" && "text-gain",
          !accent && tone === "loss" && "text-loss",
        )}
      >
        {value}
      </p>
      {caption && (
        <p
          className={cn(
            "mt-1.5 text-[11px] leading-4",
            accent ? "text-slate-300" : "text-muted-foreground",
          )}
        >
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
    <div className="divide-y">
      {rows.map((t) => {
        const isIncome = t.type === "income";
        const isExpense = t.type === "expense";
        return (
          <div className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5 sm:py-4" key={t.id}>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                isIncome
                  ? "bg-gain/10 text-gain"
                  : isExpense
                    ? "bg-loss/10 text-loss"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isIncome ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{text(t.description)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
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
                {isIncome ? "+" : isExpense ? "−" : ""}
                {formatCurrency(text(t.amount))}
              </p>
              <span className="text-[10px] text-muted-foreground">{labels[text(t.status)]}</span>
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

  return (
    <div className="animate-fade-in space-y-6 md:space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            {new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "long",
              timeZone: "America/Sao_Paulo",
            }).format(new Date())}
          </p>
          <h1 className="page-heading">
            Olá, {text(data.profiles?.[0]?.name).split(" ")[0] || "bem-vindo"}
          </h1>
          <p className="subheading">Resumo patrimonial e movimentações do período.</p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-2.5 sm:w-auto">
          <PeriodFilter value={period} onChange={setPeriod} />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex sm:h-10 sm:px-3.5"
              onClick={() =>
                setQuickModal({
                  entity: "investment_transactions",
                  title: "Registrar operação",
                })
              }
            >
              <Coins />
              Operar
            </Button>
            <Button
              size="sm"
              className="sm:h-10 sm:px-4"
              onClick={() =>
                setQuickModal({
                  entity: "transactions",
                  title: "Nova transação",
                  initialValues: { type: "expense" },
                })
              }
            >
              <Plus />
              Nova transação
            </Button>
          </div>
        </div>
      </div>

      {/* Ferramentas de Decisão & Inteligência */}
      <section aria-label="Ferramentas de decisão" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
        {[
          {
            href: "/posso-comprar",
            title: "Posso comprar?",
            desc: "Avalie qualquer ativo na carteira",
            Icon: Scale,
          },
          {
            href: "/calculadora",
            title: "Calculadora",
            desc: "10 simuladores financeiros",
            Icon: Calculator,
          },
          {
            href: "/assistente",
            title: "Assistente IA",
            desc: "Análise conversacional dos dados",
            Icon: Sparkles,
          },
          {
            href: "/analises",
            title: "Diagnóstico",
            desc: "Risco, reserva e recomendações",
            Icon: Lightbulb,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card group flex items-center gap-3 p-3.5 transition-all hover:border-primary/40 hover:bg-primary/[0.02]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <item.Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground sm:text-sm">{item.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.desc}</p>
            </div>
          </Link>
        ))}
      </section>

      <nav
        aria-label="Atalhos rápidos"
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:hidden"
      >
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
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-2xs active:scale-95"
            >
              <I className="size-3.5 text-primary" />
              {String(label)}
            </Link>
          );
        })}
      </nav>

      {showOnboarding && (
        <section className="card border-primary/25 bg-primary/[0.03] p-5">
          <div className="mb-3.5 flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <h2 className="text-sm font-semibold">Primeiros passos para organizar suas finanças</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5">
              <div>
                <p className="text-xs font-semibold">1. Crie sua primeira conta</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Banco, carteira ou corretora</p>
              </div>
              {hasAccounts ? (
                <span className="rounded-full bg-primary/10 p-1.5 text-primary">
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

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5">
              <div>
                <p className="text-xs font-semibold">2. Registre um lançamento</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Receita ou despesa do mês</p>
              </div>
              {hasTransactions ? (
                <span className="rounded-full bg-primary/10 p-1.5 text-primary">
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

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3.5">
              <div>
                <p className="text-xs font-semibold">3. Explore o Mercado ou Ativos</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Ações, FIIs, renda fixa e cripto</p>
              </div>
              {hasInvestments ? (
                <span className="rounded-full bg-primary/10 p-1.5 text-primary">
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

      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 xl:grid-cols-4">
        <Metric
          label="Patrimônio total"
          value={formatCurrency(total.wealth)}
          caption="Contas + investimentos · posição atual"
          Icon={Wallet}
          accent
        />
        <Metric
          label="Saldo das contas"
          value={formatCurrency(total.cash)}
          caption={`${data.accounts?.length || 0} contas cadastradas`}
          Icon={Wallet}
        />
        <Metric
          label="Investimentos"
          value={formatCurrency(total.value)}
          caption={`Custo: ${formatCurrency(total.cost)}`}
          Icon={ChartNoAxesCombined}
        />
        <Metric
          label="Resultado total"
          value={formatCurrency(total.result)}
          caption={`Valorização: ${total.rate.toFixed(2)}%`}
          Icon={TrendingUp}
          tone={resultTone}
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4">
        <Metric
          label="Receitas no período"
          value={formatCurrency(f.income)}
          Icon={ArrowDownLeft}
          caption="Receitas pagas"
          tone={f.income.gt(0) ? "gain" : "neutral"}
        />
        <Metric
          label="Despesas no período"
          value={formatCurrency(f.expense)}
          Icon={ArrowUpRight}
          caption="Despesas pagas"
          tone={f.expense.gt(0) ? "loss" : "neutral"}
        />
        <div className="col-span-2 sm:col-span-1">
          <Metric
            label="Saldo do período"
            value={formatCurrency(f.balance)}
            caption="Receitas menos despesas"
            tone={balanceTone}
          />
        </div>
      </div>

      {pendingList.length > 0 && (
        <section className="card overflow-hidden border-warning/30">
          <div className="flex items-center justify-between border-b bg-warning/5 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-warning" />
              <h2 className="text-sm font-semibold">Contas e lançamentos pendentes</h2>
            </div>
            <Link href="/transacoes" className="text-xs font-medium text-primary hover:underline">
              Ver todos ({data.transactions?.filter((t) => t.status === "pending").length})
            </Link>
          </div>
          <div className="divide-y">
            {pendingList.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
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
                    className="h-8 px-2.5 text-xs"
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

      <div className="grid gap-5 md:gap-6 xl:grid-cols-[1.65fr_1fr]">
        <section className="card min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Evolução do patrimônio</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Consolidação de contas e investimentos no período
              </p>
            </div>
            <span className="badge">R$</span>
          </div>
          {data.accounts?.length || data.holdings?.length ? (
            <EvolutionChart data={history} />
          ) : (
            <Empty
              title="Vamos começar sua história?"
              description="Adicione uma conta e seus primeiros investimentos para visualizar a evolução."
            />
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Posições históricas sem cotação são estimadas pelo custo. Saldos iniciais passam a
            valer na criação da conta.
          </p>
        </section>

        <section className="card min-w-0 p-5 sm:p-6">
          <h2 className="text-sm font-semibold">Alocação dos investimentos</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Distribuição atual por classe de ativo
          </p>
          <div className="mt-4">
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

      <div className="grid gap-5 md:gap-6 xl:grid-cols-2">
        <section className="card min-w-0 p-5 sm:p-6">
          <h2 className="mb-5 text-sm font-semibold">Receitas × despesas</h2>
          <FlowChart data={history} />
        </section>
        <section className="card min-w-0 p-5 sm:p-6">
          <h2 className="mb-5 text-sm font-semibold">Rentabilidade por carteira</h2>
          {ps.length ? (
            <ReturnChart data={returns} />
          ) : (
            <Empty title="Sem posições registradas" />
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Valorização atual / custo remanescente. Não inclui proventos.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4">
        <Metric
          label="Lucro realizado"
          value={formatCurrency(total.realized)}
          caption="Acumulado nas vendas"
          tone={realizedTone}
        />
        <Metric
          label="Lucro não realizado"
          value={formatCurrency(total.unrealized)}
          caption="Valor atual menos custo"
          tone={unrealizedTone}
        />
        <div className="col-span-2 sm:col-span-1">
          <Metric
            label="Dividendos e proventos"
            value={formatCurrency(total.income)}
            caption="Rendimentos acumulados"
            tone={total.income.gt(0) ? "gain" : "neutral"}
          />
        </div>
      </div>

      <div className="grid gap-5 md:gap-6 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Últimas transações</h2>
            <Link
              href="/transacoes"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Ver todas <ArrowRight className="size-3" />
            </Link>
          </div>
          <RecentTransactions rows={recent} data={data} />
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Seus próximos objetivos</h2>
            <Link href="/metas" className="text-xs font-medium text-primary hover:underline">
              Ver metas
            </Link>
          </div>
          {data.goals?.length ? (
            data.goals
              .filter((g) => g.status !== "cancelled")
              .slice(0, 4)
              .map((g) => {
                const p = goalProgress(g);
                const pct = Math.min(100, Math.max(0, p.percent));
                return (
                  <div key={g.id} className="mb-5 last:mb-0">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{text(g.name)}</span>
                      <span className="tabular font-semibold text-primary">
                        {p.percent.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="my-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span className="tabular">
                        {formatCurrency(p.saved)} de {formatCurrency(p.target)}
                      </span>
                      <span>{formatDate(text(g.deadline))}</span>
                    </div>
                  </div>
                );
              })
          ) : (
            <Empty
              title="Qual é sua próxima conquista?"
              description="Crie uma meta e acompanhe cada passo até ela."
            />
          )}
        </section>
      </div>

      <div className="grid gap-5 md:gap-6 xl:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Últimas operações</h2>
            <Link href="/operacoes" className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {operations.length ? (
            <div className="divide-y">
              {operations.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">
                      {text(data.assets?.find((a) => a.id === o.asset_id)?.ticker)} ·{" "}
                      {labels[text(o.type)]}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(text(o.operation_date))}
                    </p>
                  </div>
                  <span className="tabular font-medium">{formatCurrency(text(o.total_amount))}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Nenhuma operação no período" />
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">No seu radar</h2>
            <Link href="/analises" className="text-xs font-medium text-primary hover:underline">
              Análise completa
            </Link>
          </div>
          {alerts.length ? (
            <div className="space-y-2.5">
              {alerts.slice(0, 4).map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3.5",
                    a.severity === "danger"
                      ? "border-loss/25 bg-loss/5"
                      : "border-warning/25 bg-warning/5",
                  )}
                >
                  <TriangleAlert
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      a.severity === "danger" ? "text-loss" : "text-warning",
                    )}
                  />
                  <div>
                    <p className="text-xs font-semibold">{a.title}</p>
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
              Revisar orçamentos <ArrowRight className="size-3" />
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
