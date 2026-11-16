"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Copy,
  Check,
  Archive,
  Download,
  Eye,
  ArrowUpRight,
  Paperclip,
  SlidersHorizontal,
  Coins,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import { entities, fieldLabels, labels, type Row, type Snapshot, rowName, text, today } from "@/lib/domain";
import { useFinances, useRecordMutation } from "@/hooks/use-finances";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { budgetUsage, goalProgress, positions, num, historical, sum } from "@/lib/calculations/finance";
import { downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Empty, Loading, Failure } from "@/components/ui/data-state";
import { RecordForm } from "@/components/forms/record-form";
import { PositionsTable } from "@/components/investments/positions-table";
import { EvolutionChart, AllocationChart } from "@/components/charts/finance-charts";
import { Attachments } from "@/components/finances/attachments";
import { CdiPanel } from "@/components/investments/cdi-panel";
import { cn } from "@/lib/utils";

export function displayValue(entity: string, key: string, row: Row, data: Snapshot) {
  const value = row[key];
  const f = entities[entity]?.fields.find((field) => field.key === key);
  if (value == null || value === "") return "—";
  if (f?.table) {
    return rowName(data[f.table]?.find((r) => r.id === value) ?? { id: "Removido", user_id: "", created_at: "" });
  }
  if (
    [
      "amount",
      "current_balance",
      "initial_balance",
      "current_price",
      "target_amount",
      "accumulated_amount",
      "price",
      "unit_price",
      "fees",
      "total_amount",
    ].includes(key)
  ) {
    return formatCurrency(text(value));
  }
  if (f?.kind === "date" || key === "next_date") return formatDate(text(value));
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return labels[text(value)] || text(value);
}

const sectionTabs: Record<string, [string, string][]> = {
  finance: [
    ["/transacoes", "Transações"],
    ["/contas", "Contas"],
    ["/recorrencias", "Recorrências"],
    ["/orcamentos", "Orçamentos"],
    ["/categorias", "Categorias"],
  ],
  investment: [
    ["/investimentos", "Ativos"],
    ["/operacoes", "Operações"],
    ["/cotacoes", "Cotações"],
    ["/carteiras", "Carteiras"],
  ],
  goals: [
    ["/metas", "Metas"],
    ["/aportes", "Aportes"],
  ],
};

function getBadgeStyle(key: string, val: unknown) {
  const v = text(val);
  if (key === "type") {
    if (v === "income") return "badge-gain";
    if (v === "expense") return "badge-loss";
    if (v === "transfer" || v === "card_payment") return "badge-primary";
  }
  if (key === "status") {
    if (v === "pending") return "badge-warning";
    if (v === "cancelled" || v === "closed") return "badge-loss";
    if (v === "active" || v === "paid" || v === "completed") return "badge-primary";
  }
  return "";
}

export function RecordPage({ entity }: { entity: string }) {
  const pathname = usePathname();
  const { data, isPending, error, refetch } = useFinances();
  const mutation = useRecordMutation(entity);
  const config = entities[entity];
  const [form, setForm] = useState<{
    entity?: string;
    title?: string;
    row?: Row;
    duplicate?: boolean;
    initialValues?: Record<string, string>;
  } | null>(null);
  const [remove, setRemove] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [files, setFiles] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  if (isPending) return <Loading />;
  if (error || !data) {
    return <Failure message={error?.message || "Resposta inválida"} retry={() => refetch()} />;
  }

  const dateField = config.fields.find((f) =>
    ["transaction_date", "operation_date", "price_date", "contribution_date", "month"].includes(f.key),
  )?.key;

  const rows = (data[entity] ?? [])
    .filter(
      (r) =>
        (!search ||
          Object.values(r).some((v) =>
            text(v).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")),
          )) &&
        Object.entries(filters).every(([k, v]) => !v || text(r[k]) === v) &&
        (!dateField ||
          ((!start || text(r[dateField]) >= start) && (!end || text(r[dateField]) <= end))),
    )
    .sort((a, b) =>
      dateField
        ? text(b[dateField]).localeCompare(text(a[dateField]))
        : text(b.created_at).localeCompare(text(a.created_at)),
    );

  const filterFields = config.fields.filter((f) => f.kind === "select" || f.kind === "lookup");
  const activeFilterCount =
    Object.values(filters).filter(Boolean).length + (start ? 1 : 0) + (end ? 1 : 0);

  const project = (r: Row) =>
    Object.fromEntries(config.fields.map((f) => [f.key, r[f.key] ?? f.default ?? ""]));

  const exportRows = () =>
    downloadCsv(
      `investfast-${entity}-${today()}.csv`,
      rows.map((r) =>
        Object.fromEntries(config.columns.map((c) => [fieldLabels[c] || c, displayValue(entity, c, r, data)])),
      ),
    );

  const investment = ["assets", "investment_transactions", "asset_prices", "portfolios"].includes(entity);
  const goals = ["goals", "goal_contributions"].includes(entity);
  const tabs = investment ? sectionTabs.investment : goals ? sectionTabs.goals : sectionTabs.finance;

  const txIncome =
    entity === "transactions" ? sum(rows.filter((r) => r.type === "income" && r.status === "paid"), "amount") : num(0);
  const txExpense =
    entity === "transactions" ? sum(rows.filter((r) => r.type === "expense" && r.status === "paid"), "amount") : num(0);
  const txPending = entity === "transactions" ? rows.filter((r) => r.status === "pending").length : 0;
  const txNet = txIncome.minus(txExpense);

  return (
    <div className="animate-fade-in space-y-6">
      <nav
        aria-label="Subnavegação da seção"
        className="glass-navigation no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl border p-1.5 sm:w-fit"
      >
        {tabs.map(([href, label]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex shrink-0 items-center rounded-xl px-4 py-2 text-xs font-medium transition-colors sm:text-sm",
                active
                  ? "glass-nav-active font-semibold text-foreground"
                  : "text-muted-foreground hover:bg-glass-light-bg hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="section-kicker">
            {investment ? "Seu patrimônio" : goals ? "Seus objetivos" : "Gestão financeira"}
          </p>
          <h1 className="page-heading">{config.title}</h1>
          <p className="subheading">{config.description}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {entity === "assets" && (
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => setForm({ entity: "investment_transactions", title: "Registrar operação" })}
            >
              <Coins />
              Registrar operação
            </Button>
          )}
          <Button className="flex-1 sm:flex-none" onClick={() => setForm({})}>
            <Plus />
            Adicionar {config.singular}
          </Button>
        </div>
      </div>

      {entity === "assets" && <CdiPanel data={data} />}

      {entity === "transactions" && rows.length > 0 && (
        <section className="card grid grid-cols-2 gap-5 p-5 md:grid-cols-4 sm:p-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              Receitas pagas (filtro)
            </p>
            <p className="metric-value text-xl font-semibold text-gain sm:text-2xl">
              {formatCurrency(txIncome)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
              Despesas pagas (filtro)
            </p>
            <p className="metric-value text-xl font-semibold text-loss sm:text-2xl">
              {formatCurrency(txExpense)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">Saldo líquido</p>
            <p
              className={cn(
                "metric-value text-xl font-semibold sm:text-2xl",
                txNet.gt(0) ? "text-gain" : txNet.lt(0) ? "text-loss" : "text-foreground",
              )}
            >
              {txNet.gt(0) ? "+" : ""}
              {formatCurrency(txNet)}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setFilters((f) => ({ ...f, status: f.status === "pending" ? "" : "pending" }))
            }
            className={cn(
              "cursor-pointer rounded-xl p-1 text-left transition-colors hover:bg-glass-light-bg",
              filters.status === "pending" && "glass-nav-active",
            )}
          >
            <p className="text-xs font-medium text-muted-foreground sm:text-sm">Pendentes</p>
            <p className="metric-value mt-1 text-lg font-semibold text-warning sm:text-xl">
              {txPending} lançamento(s)
            </p>
          </button>
        </section>
      )}

      {entity === "accounts" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="card card-interactive flex flex-col justify-between p-5 sm:p-6">
              <button className="cursor-pointer text-left" onClick={() => setDetail(r)}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
                    <span style={{ background: text(r.color) }} className="size-3 rounded-full" />
                    {text(r.name)}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </div>
                <p className="metric-value mt-4 text-2xl font-semibold sm:text-3xl">
                  {formatCurrency(text(r.current_balance))}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {labels[text(r.type)]} · {labels[text(r.status)]}
                </p>
              </button>
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() =>
                    setForm({
                      entity: "transactions",
                      title: `Lançamento · ${text(r.name)}`,
                      initialValues: { account_id: r.id, type: "expense" },
                    })
                  }
                >
                  <Plus />
                  Despesa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() =>
                    setForm({
                      entity: "transactions",
                      title: `Receita · ${text(r.name)}`,
                      initialValues: { account_id: r.id, type: "income" },
                    })
                  }
                >
                  <Plus />
                  Receita
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {entity === "budgets" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgetUsage(data, rows[0] ? text(rows[0].month).slice(0, 7) : today().slice(0, 7)).map(
            (b) => {
              const pct = Math.min(100, Math.max(0, b.percent));
              const barColor =
                b.percent >= 100
                  ? "bg-loss"
                  : b.percent >= 80
                    ? "bg-warning"
                    : "bg-primary";
              return (
                <div key={b.row.id} className="card p-5 sm:p-6">
                  <p className="text-base font-semibold tracking-tight">{b.name}</p>
                  <p className="metric-value mt-3 text-2xl font-semibold">
                    {formatCurrency(b.spent)}{" "}
                    <span className="text-xs font-normal text-muted-foreground sm:text-sm">
                      de {formatCurrency(b.limit)}
                    </span>
                  </p>
                  <div
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", barColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p
                    className={cn(
                      "mt-2.5 text-xs",
                      b.percent >= 100
                        ? "font-medium text-loss"
                        : b.percent >= 80
                          ? "font-medium text-warning"
                          : "text-muted-foreground",
                    )}
                  >
                    {b.percent.toFixed(0)}% utilizado · {b.remaining.gte(0) ? "Restam" : "Excedeu"}{" "}
                    {formatCurrency(b.remaining.abs())}
                  </p>
                </div>
              );
            },
          )}
        </div>
      )}

      {entity === "goals" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((g) => {
            const p = goalProgress(g);
            const pct = Math.min(100, Math.max(0, p.percent));
            return (
              <div key={g.id} className="card p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate text-base font-semibold tracking-tight">{text(g.name)}</h2>
                  <span className="badge">{labels[text(g.status)]}</span>
                </div>
                <p className="metric-value mt-4 text-2xl font-semibold">
                  {formatCurrency(p.saved)}{" "}
                  <span className="text-xs font-normal text-muted-foreground sm:text-sm">
                    / {formatCurrency(p.target)}
                  </span>
                </p>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2.5 text-xs text-muted-foreground">
                  {p.percent.toFixed(0)}% · Faltam {formatCurrency(p.remaining)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.overdue
                    ? "Prazo encerrado"
                    : `${formatCurrency(p.monthly)}/mês até ${formatDate(text(g.deadline))}`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full sm:w-auto"
                  onClick={() =>
                    setForm({
                      entity: "goal_contributions",
                      title: `Novo aporte · ${text(g.name)}`,
                      initialValues: { goal_id: g.id },
                    })
                  }
                >
                  <PiggyBank />
                  Registrar aporte
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {entity === "portfolios" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const ps = positions(data).filter((p) => p.row.portfolio_id === r.id);
            const value = ps.reduce((s, p) => s.plus(p.value), num(0));
            const cost = ps.reduce((s, p) => s.plus(p.cost), num(0));
            const diff = value.minus(cost);
            return (
              <button
                onClick={() => setDetail(r)}
                key={r.id}
                className="card card-interactive cursor-pointer p-5 text-left sm:p-6"
              >
                <p className="text-base font-semibold tracking-tight">{text(r.name)}</p>
                <p className="metric-value mt-3 text-2xl font-semibold sm:text-3xl">
                  {formatCurrency(value)}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {ps.filter((p) => num(p.row.quantity).gt(0)).length} ativos · Custo{" "}
                  {formatCurrency(cost)}
                </p>
                <p
                  className={cn(
                    "tabular mt-3 text-sm font-semibold",
                    diff.gt(0) ? "text-gain" : diff.lt(0) ? "text-loss" : "text-muted-foreground",
                  )}
                >
                  {diff.gt(0) ? "+" : ""}
                  {formatCurrency(diff)} ({cost.gt(0) ? diff.div(cost).mul(100).toFixed(2) : "0.00"}%)
                </p>
              </button>
            );
          })}
        </div>
      )}

      {(entity === "assets" || entity === "portfolios") && (
        <section className="card overflow-hidden">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold tracking-tight">Posições consolidadas</h2>
          </div>
          <PositionsTable data={data} />
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2.5 border-b p-4">
          <div className="relative min-w-44 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Buscar registros"
              placeholder="Buscar registros…"
              className="input m-0 pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(filterFields.length > 0 || dateField) && (
            <Button
              variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
              size="sm"
              className="md:hidden"
              onClick={() => setShowFilters((v) => !v)}
            >
              <SlidersHorizontal />
              Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportRows} disabled={!rows.length}>
            <Download />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>

        {(filterFields.length > 0 || dateField) && (
          <div
            className={cn(
              "filter-grid flex-wrap gap-2.5 border-b border-border bg-glass-light-bg p-4",
              showFilters || activeFilterCount > 0 ? "grid md:flex" : "hidden md:flex",
            )}
          >
            {filterFields.map((f) => (
              <select
                key={f.key}
                aria-label={`Filtrar ${f.label}`}
                className="input m-0 bg-card md:max-w-48"
                value={filters[f.key] || ""}
                onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
              >
                <option value="">{f.label}: todos</option>
                {f.table
                  ? (data[f.table] ?? []).map((r) => (
                      <option key={r.id} value={r.id}>
                        {rowName(r)}
                      </option>
                    ))
                  : Object.entries(f.options ?? {}).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
              </select>
            ))}
            {dateField && (
              <>
                <input
                  aria-label="Filtrar a partir de"
                  type="date"
                  className="input m-0 bg-card md:max-w-40"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
                <input
                  aria-label="Filtrar até"
                  type="date"
                  className="input m-0 bg-card md:max-w-40"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </>
            )}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({});
                  setStart("");
                  setEnd("");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {!rows.length ? (
          <Empty
            description={
              (data[entity] ?? []).length
                ? "Nenhum registro corresponde aos filtros."
                : `Adicione ${config.singular} para começar.`
            }
          >
            <Button onClick={() => setForm({})}>
              <Plus />
              Adicionar {config.singular}
            </Button>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="responsive-records w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-border bg-glass-light-bg text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  {config.columns.map((c) => (
                    <th key={c} className="px-5 py-3.5 font-semibold">
                      {fieldLabels[c] || c}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-muted/35">
                    {config.columns.map((c) => (
                      <td
                        key={c}
                        data-label={fieldLabels[c] || c}
                        className="tabular max-w-64 truncate px-5 py-3.5"
                      >
                        {c === "status" || c === "type" ? (
                          <span className={cn("badge", getBadgeStyle(c, r[c]))}>
                            {displayValue(entity, c, r, data)}
                          </span>
                        ) : (
                          displayValue(entity, c, r, data)
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-0.5">
                        {entity === "assets" && (
                          <>
                            <Button
                              title="Registrar operação"
                              aria-label={`Operar ${rowName(r)}`}
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setForm({
                                  entity: "investment_transactions",
                                  title: `Nova operação · ${text(r.ticker)}`,
                                  initialValues: { asset_id: r.id },
                                })
                              }
                            >
                              <Coins />
                            </Button>
                            <Button
                              title="Atualizar cotação"
                              aria-label={`Atualizar cotação de ${rowName(r)}`}
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setForm({
                                  entity: "asset_prices",
                                  title: `Atualizar cotação · ${text(r.ticker)}`,
                                  initialValues: { asset_id: r.id },
                                })
                              }
                            >
                              <TrendingUp />
                            </Button>
                          </>
                        )}
                        {entity === "goals" && (
                          <Button
                            title="Registrar aporte"
                            aria-label={`Aportar em ${rowName(r)}`}
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setForm({
                                entity: "goal_contributions",
                                title: `Novo aporte · ${text(r.name)}`,
                                initialValues: { goal_id: r.id },
                              })
                            }
                          >
                            <PiggyBank />
                          </Button>
                        )}
                        <Button
                          title="Editar"
                          aria-label={`Editar ${rowName(r)}`}
                          size="icon"
                          variant="ghost"
                          onClick={() => setForm({ row: r })}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          title="Ver detalhes"
                          aria-label={`Detalhes de ${rowName(r)}`}
                          size="icon"
                          variant="ghost"
                          onClick={() => setDetail(r)}
                        >
                          <Eye />
                        </Button>
                        {entity === "transactions" && (
                          <>
                            <Button
                              title="Duplicar"
                              aria-label="Duplicar transação"
                              size="icon"
                              variant="ghost"
                              onClick={() => setForm({ row: r, duplicate: true })}
                            >
                              <Copy />
                            </Button>
                            <Button
                              title="Anexos"
                              aria-label="Gerenciar anexos"
                              size="icon"
                              variant="ghost"
                              onClick={() => setFiles(r)}
                            >
                              <Paperclip />
                            </Button>
                            {r.status === "pending" && (
                              <Button
                                title="Marcar como paga"
                                aria-label="Marcar como paga"
                                disabled={mutation.isPending}
                                size="icon"
                                variant="ghost"
                                className="text-primary"
                                onClick={() =>
                                  mutation.mutate({
                                    method: "PATCH",
                                    id: r.id,
                                    values: { ...project(r), status: "paid" },
                                  })
                                }
                              >
                                <Check />
                              </Button>
                            )}
                          </>
                        )}
                        {config.archive && r.status === "active" && (
                          <Button
                            title="Arquivar"
                            aria-label="Arquivar registro"
                            size="icon"
                            variant="ghost"
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({
                                method: "PATCH",
                                id: r.id,
                                values: { ...project(r), status: "archived" },
                              })
                            }
                          >
                            <Archive />
                          </Button>
                        )}
                        <Button
                          title="Excluir"
                          aria-label={`Excluir ${rowName(r)}`}
                          size="icon"
                          variant="ghost"
                          onClick={() => setRemove(r)}
                          className="text-loss hover:bg-loss/10 hover:text-loss"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-border bg-glass-light-bg px-5 py-3 text-xs text-muted-foreground">
          {rows.length} registro(s)
        </div>
      </section>

      {form && (
        <Dialog
          title={
            form.title ||
            `${form.row && !form.duplicate ? "Editar" : "Adicionar"} ${
              entities[form.entity || entity].singular
            }`
          }
          onClose={() => setForm(null)}
        >
          <RecordForm
            entity={form.entity || entity}
            row={form.row}
            duplicate={form.duplicate}
            initialValues={form.initialValues}
            data={data}
            onDone={() => setForm(null)}
          />
        </Dialog>
      )}

      {remove && (
        <Dialog title={`Excluir ${config.singular}?`} onClose={() => setRemove(null)}>
          <p className="text-sm leading-6 text-muted-foreground">
            Você está excluindo <strong className="text-foreground">{rowName(remove)}</strong>. Esta
            ação não pode ser desfeita. Saldos e posições serão recalculados. Registros com
            vínculos podem exigir a remoção prévia desses vínculos.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRemove(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={async () => {
                try {
                  await mutation.mutateAsync({ method: "DELETE", id: remove.id });
                  setRemove(null);
                } catch {}
              }}
            >
              Confirmar exclusão
            </Button>
          </div>
        </Dialog>
      )}

      {detail && (
        <Dialog title={rowName(detail)} onClose={() => setDetail(null)}>
          <RecordDetails entity={entity} row={detail} data={data} />
        </Dialog>
      )}

      {files && (
        <Dialog title="Anexos da transação" onClose={() => setFiles(null)}>
          <Attachments transactionId={files.id} data={data} />
        </Dialog>
      )}
    </div>
  );
}

function RecordDetails({
  entity,
  row,
  data,
}: {
  entity: string;
  row: Row;
  data: Snapshot;
}) {
  const account = entity === "accounts";
  const portfolio = entity === "portfolios";
  const asset = entity === "assets";

  const transactions = (data.transactions ?? [])
    .filter((t) => t.account_id === row.id || t.destination_account_id === row.id)
    .sort((a, b) => text(b.transaction_date).localeCompare(text(a.transaction_date)));

  const prices = (data.asset_prices ?? [])
    .filter((p) => p.asset_id === row.id)
    .sort((a, b) => text(a.price_date).localeCompare(text(b.price_date)))
    .map((p) => ({ label: formatDate(text(p.price_date)), wealth: num(p.price).toNumber() }));

  const ps = positions(data).filter((p) => p.row.portfolio_id === row.id);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-glass-border bg-glass-light-bg p-4 text-sm">
        {entities[entity].fields.map((f) => (
          <div key={f.key}>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-1 break-words font-medium text-foreground">
              {displayValue(entity, f.key, row, data)}
            </dd>
          </div>
        ))}
      </dl>

      {account && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Extrato da conta</h3>
            <span className="tabular text-sm font-semibold">
              Saldo: {formatCurrency(text(row.current_balance))}
            </span>
          </div>
          {transactions.length ? (
            <div className="divide-y rounded-xl border">
              {transactions.map((t) => {
                const isCredit = t.destination_account_id === row.id || t.type === "income";
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{text(t.description)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(text(t.transaction_date))} · {labels[text(t.type)]} ·{" "}
                        {labels[text(t.status)]}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "tabular font-semibold",
                        isCredit ? "text-gain" : "text-loss",
                      )}
                    >
                      {isCredit ? "+" : "−"}
                      {formatCurrency(text(t.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title="Sem movimentações" />
          )}

          {(data.investment_transactions ?? [])
            .filter((o) => o.account_id === row.id)
            .map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm"
              >
                <span>
                  {labels[text(o.type)]} · {formatDate(text(o.operation_date))}
                </span>
                <span className="tabular font-medium">{formatCurrency(text(o.total_amount))}</span>
              </div>
            ))}
        </div>
      )}

      {(portfolio || asset) && (
        <div className="overflow-hidden rounded-xl border">
          <PositionsTable
            data={data}
            portfolioId={portfolio ? row.id : undefined}
            assetId={asset ? row.id : undefined}
          />
        </div>
      )}

      {asset && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Histórico de preços</h3>
          {prices.length ? (
            <EvolutionChart
              data={prices}
              keys={[{ key: "wealth", name: "Preço", color: "var(--chart-1)" }]}
            />
          ) : (
            <Empty title="Sem cotações registradas" />
          )}
          <p className="text-xs text-muted-foreground">
            Última atualização:{" "}
            {row.price_updated_at ? formatDate(text(row.price_updated_at)) : "não informada"}
          </p>
        </div>
      )}

      {portfolio && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Alocação da carteira</h3>
          <AllocationChart
            data={ps
              .filter((p) => p.value.gt(0))
              .map((p, i) => ({
                name: text(p.asset?.ticker),
                value: p.value.toNumber(),
                color: [
                  "var(--chart-1)",
                  "var(--chart-2)",
                  "var(--chart-3)",
                  "var(--chart-4)",
                  "var(--chart-5)",
                ][i % 5],
              }))}
          />
          <h3 className="text-sm font-semibold">Evolução da carteira</h3>
          <EvolutionChart
            data={historical(data, today().slice(0, 4) + "-01", today())}
            keys={[{ key: row.id, name: text(row.name), color: "var(--chart-1)" }]}
          />
          <p className="text-xs text-muted-foreground">
            Na ausência de cotação histórica, a posição é estimada pelo custo.
          </p>
          <p className="tabular text-sm font-medium">
            Proventos acumulados: {formatCurrency(ps.reduce((s, p) => s.plus(p.income), num(0)))}
          </p>
        </div>
      )}
    </div>
  );
}
