"use client";
import Link from "next/link";
import { useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { useFinances } from "@/hooks/use-finances";
import {
  flow,
  historical,
  allocation,
  categoriesSpending,
  insights,
  sum,
  num,
  positions,
} from "@/lib/calculations/finance";
import { text, type Snapshot, today, labels, rowName } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Loading, Failure, Empty } from "@/components/ui/data-state";
import { Metric } from "./dashboard";
import { PeriodFilter, initialPeriod } from "./period-filter";
import { FinancialAnalysis } from "./financial-analysis";
import {
  EvolutionChart,
  FlowChart,
  AllocationChart,
  ReturnChart,
} from "@/components/charts/finance-charts";
import { PositionsTable } from "@/components/investments/positions-table";
import { cn } from "@/lib/utils";

export function Reports({ analysis = false }: { analysis?: boolean }) {
  const { data, isPending, error, refetch } = useFinances();
  const [period, setPeriod] = useState(initialPeriod);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  if (isPending) return <Loading />;
  if (error || !data)
    return <Failure message={error?.message || "Dados indisponíveis"} retry={() => refetch()} />;

  const filtered: Snapshot = {
    ...data,
    transactions: (data.transactions ?? []).filter(
      (t) =>
        (!filters.account_id ||
          t.account_id === filters.account_id ||
          t.destination_account_id === filters.account_id) &&
        (!filters.category_id || t.category_id === filters.category_id) &&
        (!filters.type || t.type === filters.type),
    ),
    investment_transactions: (data.investment_transactions ?? []).filter(
      (o) =>
        (!filters.asset_id || o.asset_id === filters.asset_id) &&
        (!filters.portfolio_id ||
          o.portfolio_id === filters.portfolio_id ||
          o.destination_portfolio_id === filters.portfolio_id),
    ),
    holdings: (data.holdings ?? []).filter(
      (h) =>
        (!filters.asset_id || h.asset_id === filters.asset_id) &&
        (!filters.portfolio_id || h.portfolio_id === filters.portfolio_id),
    ),
    dividends: (data.dividends ?? []).filter(
      (d) =>
        (!filters.asset_id || d.asset_id === filters.asset_id) &&
        (!filters.portfolio_id || d.portfolio_id === filters.portfolio_id),
    ),
  };

  const f = flow(filtered, period.start, period.end);
  const categories = categoriesSpending(filtered, period.start, period.end);
  const alerts = insights(filtered, period.start, period.end);
  const history = historical(data, period.start, period.end);
  const dividends = filtered.dividends.filter(
    (d) => text(d.payment_date) >= period.start && text(d.payment_date) <= period.end,
  );
  const ranked = (type: string) =>
    f.rows
      .filter((r) => r.type === type)
      .sort((a, b) => num(b.amount).cmp(num(a.amount)))
      .slice(0, 8);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const exportReport = () => {
    const rows = [
      ...f.rows.map((t) => ({
        grupo: "Transação",
        data: text(t.transaction_date),
        descricao: text(t.description),
        tipo: labels[text(t.type)],
        valor: text(t.amount),
        conta: rowName(
          data.accounts?.find((a) => a.id === t.account_id) ?? {
            id: "",
            created_at: "",
            user_id: "",
          },
        ),
        carteira: "",
      })),
      ...filtered.investment_transactions
        .filter((o) => text(o.operation_date) >= period.start && text(o.operation_date) <= period.end)
        .map((o) => ({
          grupo: "Investimento",
          data: text(o.operation_date),
          descricao: text(data.assets?.find((a) => a.id === o.asset_id)?.ticker),
          tipo: labels[text(o.type)],
          valor: text(o.total_amount),
          conta: text(data.accounts?.find((a) => a.id === o.account_id)?.name),
          carteira: text(data.portfolios?.find((p) => p.id === o.portfolio_id)?.name),
        })),
    ];
    downloadCsv(`investfast-relatorio-${today()}.csv`, rows);
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <nav
        aria-label="Subnavegação de relatórios e análises"
        className="no-scrollbar -mx-3.5 flex gap-1.5 overflow-x-auto border-b px-3.5 pb-3 sm:mx-0 sm:border-0 sm:px-0 sm:pb-0"
      >
        {[
          ["/relatorios", "Relatórios", !analysis],
          ["/analises", "Análises & Recomendações", analysis],
          ["/posso-comprar", "Posso comprar?", false],
          ["/calculadora", "Calculadora", false],
          ["/metas", "Metas", false],
        ].map(([href, label, active]) => (
          <Link
            key={String(href)}
            href={String(href)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-xs"
                : "border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {String(label)}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.2em] text-primary">
            Perspectiva para decidir
          </p>
          <h1 className="page-heading">
            {analysis ? "Análises e recomendações" : "Relatórios"}
          </h1>
          <p className="subheading">
            {analysis
              ? "Diagnóstico completo do seu patrimônio, liquidez, reserva, dívidas e risco."
              : "Transforme seus registros em uma visão clara."}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          {!analysis && (
            <>
              <Button
                variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                className="md:hidden"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal />
                Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Button>
              <Button variant="outline" size="sm" onClick={exportReport}>
                <Download />
                <span className="hidden sm:inline">Exportar CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {!analysis && (
        <div
          className={cn(
            "card filter-grid flex-wrap gap-2.5 p-3.5 sm:p-4",
            showFilters || activeFilterCount > 0 ? "grid md:flex" : "hidden md:flex",
          )}
        >
          {[
            ["account_id", "accounts", "Conta"],
            ["category_id", "categories", "Categoria"],
            ["asset_id", "assets", "Ativo"],
            ["portfolio_id", "portfolios", "Carteira"],
          ].map(([key, table, label]) => (
            <select
              key={key}
              aria-label={`Filtrar ${label}`}
              className="input m-0 md:max-w-48"
              value={filters[key] || ""}
              onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
            >
              <option value="">{label}: todos</option>
              {data[table]?.map((r) => (
                <option key={r.id} value={r.id}>
                  {rowName(r)}
                </option>
              ))}
            </select>
          ))}
          <select
            aria-label="Tipo de transação"
            className="input m-0 md:max-w-48"
            value={filters.type || ""}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">Tipo: todos</option>
            {["income", "expense", "transfer", "card_payment"].map((t) => (
              <option key={t} value={t}>
                {labels[t]}
              </option>
            ))}
          </select>
        </div>
      )}

      {analysis ? (
        <FinancialAnalysis data={filtered} period={period} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Receitas do período" value={formatCurrency(f.income)} />
            <Metric label="Despesas do período" value={formatCurrency(f.expense)} />
            <Metric label="Saldo do período" value={formatCurrency(f.balance)} />
            <Metric label="Proventos do período" value={formatCurrency(sum(dividends, "amount"))} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="card min-w-0 p-5">
              <h2 className="mb-5 font-semibold">Receitas × despesas</h2>
              <FlowChart
                data={history.map((point) => {
                  const start = point.date.slice(0, 7) + "-01";
                  const result = flow(
                    filtered,
                    start < period.start ? period.start : start,
                    point.date,
                  );
                  return {
                    ...point,
                    income: result.income.toNumber(),
                    expense: result.expense.toNumber(),
                  };
                })}
              />
            </section>
            <section className="card min-w-0 p-5">
              <h2 className="mb-5 font-semibold">Gastos por categoria</h2>
              {categories.length ? (
                <AllocationChart data={categories} />
              ) : (
                <Empty title="Nenhuma despesa neste período" />
              )}
            </section>
            <section className="card min-w-0 p-5">
              <h2 className="mb-5 font-semibold">Evolução do patrimônio consolidado</h2>
              <EvolutionChart data={history} />
              <p className="text-[11px] text-muted-foreground">
                Todas as contas e carteiras. Posições sem cotação histórica são estimadas pelo custo.
              </p>
            </section>
            <section className="card min-w-0 p-5">
              <h2 className="mb-5 font-semibold">Alocação atual</h2>
              <AllocationChart data={allocation(filtered)} />
            </section>
          </div>

          <section className="card p-5">
            <h2 className="mb-5 font-semibold">Rentabilidade por carteira</h2>
            <ReturnChart
              data={(data.portfolios ?? [])
                .filter((p) => !filters.portfolio_id || p.id === filters.portfolio_id)
                .map((p) => {
                  const ps = positions(filtered).filter((h) => h.row.portfolio_id === p.id);
                  const cost = ps.reduce((s, h) => s.plus(h.cost), num(0));
                  const value = ps.reduce((s, h) => s.plus(h.value), num(0));
                  return {
                    name: text(p.name),
                    value: cost.gt(0) ? value.minus(cost).div(cost).mul(100).toNumber() : 0,
                  };
                })}
            />
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b p-5 font-semibold">Rentabilidade por ativo · posição atual</h2>
            <PositionsTable data={filtered} />
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              ["expense", "Maiores despesas"],
              ["income", "Maiores receitas"],
            ].map(([type, title]) => (
              <section key={type} className="card p-5">
                <h2 className="mb-3 font-semibold">{title}</h2>
                {ranked(type).length ? (
                  ranked(type).map((r) => (
                    <div key={r.id} className="flex justify-between gap-3 border-b py-3 text-sm">
                      <span>{text(r.description)}</span>
                      <span>{formatCurrency(text(r.amount))}</span>
                    </div>
                  ))
                ) : (
                  <Empty title="Sem registros no período" />
                )}
              </section>
            ))}
          </div>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Dividendos e proventos recebidos</h2>
            {dividends.length ? (
              dividends.map((d) => (
                <div key={d.id} className="flex justify-between border-b py-3 text-sm">
                  <span>
                    {text(data.assets?.find((a) => a.id === d.asset_id)?.ticker)} ·{" "}
                    {formatDate(text(d.payment_date))}
                  </span>
                  <span>{formatCurrency(text(d.amount))}</span>
                </div>
              ))
            ) : (
              <Empty title="Nenhum provento registrado no período" />
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Comparação com o mês anterior</h2>
            {alerts
              .filter((a) => a.title.startsWith("Despesas"))
              .map((a, i) => (
                <p className="text-sm text-muted-foreground" key={i}>
                  {a.title}. {a.description}
                </p>
              ))}
            {!alerts.some((a) => a.title.startsWith("Despesas")) && (
              <p className="text-sm text-muted-foreground">
                Ainda não há despesas no período anterior para comparar.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
