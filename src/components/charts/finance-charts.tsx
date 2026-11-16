"use client";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";

const compact = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const tooltipStyle = {
  background: "var(--glass-overlay-surface)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--glass-border)",
  borderRadius: 14,
  color: "var(--foreground)",
  boxShadow: "var(--shadow-elevated)",
  fontSize: 12,
  padding: "10px 14px",
};

const fallbackColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#64748b",
];

export function EvolutionChart({
  data,
  keys = [{ key: "wealth", name: "Patrimônio", color: "var(--chart-1)" }],
}: {
  data: Record<string, unknown>[];
  keys?: { key: string; name: string; color: string }[];
}) {
  if (data.length === 1) {
    const point = data[0];
    return (
      <div
        className="flex flex-col justify-between gap-4 border-t border-border pt-4"
        role="img"
        aria-label="Gráfico de evolução no período"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Posição registrada · {String(point.label ?? "Período atual")}
          </span>
          <span className="badge badge-primary">1 ponto no período</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {keys.map((k) => (
            <div
              key={k.key}
              className="border-l border-border pl-4 first:border-l-0 first:pl-0"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: k.color }}
                />
                {k.name}
              </div>
              <p className="mt-1.5 text-xl font-semibold tracking-tight tabular text-foreground sm:text-2xl">
                {formatCurrency(String(point[k.key] ?? 0))}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          O histórico comparativo ainda está sendo formado. Novos pontos aparecerão
          automaticamente conforme os próximos períodos forem registrados.
        </p>
      </div>
    );
  }

  return (
    <div className="chart-shell h-60 min-w-0" role="img" aria-label="Gráfico de evolução no período">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 4 }}>
          <defs>
            {keys.map((k, idx) => (
              <linearGradient key={k.key} id={`grad-${k.key}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={k.color} stopOpacity={0.28} />
                <stop offset="95%" stopColor={k.color} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={52}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(String(v ?? 0))} />
          {keys.map((k, idx) => (
            <Area
              key={k.key}
              type="monotone"
              dataKey={k.key}
              name={k.name}
              stroke={k.color}
              fill={`url(#grad-${k.key}-${idx})`}
              strokeWidth={2.5}
              activeDot={{ r: 4 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FlowChart({ data }: { data: Record<string, unknown>[] }) {
  if (data.length === 1) {
    const point = data[0];
    const income = Number(point.income ?? 0);
    const expense = Number(point.expense ?? 0);
    const maxVal = Math.max(income, expense, 1);
    const incomePct = Math.min(100, Math.round((income / maxVal) * 100));
    const expensePct = Math.min(100, Math.round((expense / maxVal) * 100));

    return (
      <div
        className="flex flex-col justify-between gap-4 border-t border-border pt-4"
        role="img"
        aria-label="Receitas e despesas por mês"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Movimento mensal · {String(point.label ?? "Período atual")}
          </span>
          <span className="badge">Comparativo do mês</span>
        </div>

        <div className="space-y-3.5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="size-2.5 rounded-full bg-gain" />
                Receitas
              </span>
              <span className="font-semibold tabular text-gain">
                {formatCurrency(String(income))}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gain transition-all duration-300"
                style={{ width: `${income > 0 ? Math.max(incomePct, 4) : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs sm:text-sm">
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="size-2.5 rounded-full bg-loss" />
                Despesas
              </span>
              <span className="font-semibold tabular text-loss">
                {formatCurrency(String(expense))}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-loss transition-all duration-300"
                style={{ width: `${expense > 0 ? Math.max(expensePct, 4) : 0}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Exibindo o resumo de {String(point.label ?? "este período")}. Selecione um intervalo maior
          para comparar vários meses lado a lado.
        </p>
      </div>
    );
  }

  return (
    <div className="chart-shell h-60 min-w-0" role="img" aria-label="Receitas e despesas por mês">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={52}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(String(v ?? 0))} />
          <Bar name="Receitas" dataKey="income" fill="var(--gain)" radius={[6, 6, 0, 0]} />
          <Bar name="Despesas" dataKey="expense" fill="var(--loss)" radius={[6, 6, 0, 0]} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AllocationChart({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);

  if (data.length === 1) {
    const single = data[0];
    const color = single.color || fallbackColors[0];
    return (
      <div
        className="flex flex-col justify-between gap-4 border-t border-border pt-4"
        role="img"
        aria-label="Gráfico de alocação"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-primary/80 bg-primary/10">
              <span className="text-sm font-bold tabular text-foreground">100%</span>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Classe única na carteira
              </span>
              <h3 className="mt-0.5 text-base font-semibold text-foreground sm:text-lg">
                {single.name}
              </h3>
              <p className="text-sm font-medium tabular text-muted-foreground">
                {formatCurrency(String(single.value))}
              </p>
            </div>
          </div>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full w-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          100% do patrimônio investido está concentrado em <strong>{single.name}</strong>. Adicione
          outras classes de ativos para acompanhar a diversificação.
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid items-center gap-4 sm:grid-cols-[180px_1fr]"
      role="img"
      aria-label="Gráfico de alocação"
    >
      <div className="h-44 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={74}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((r, i) => (
                <Cell key={i} fill={r.color || fallbackColors[i % fallbackColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(String(v ?? 0))} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2.5">
        {data.map((r, i) => {
          const pct = total > 0 ? (Number(r.value) / total) * 100 : 0;
          const color = r.color || fallbackColors[i % fallbackColors.length];
          return (
            <div key={r.name} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{r.name}</span>
                </span>
                <span className="shrink-0 font-semibold tabular text-foreground">
                  {pct.toFixed(1)}% ·{" "}
                  <span className="font-normal text-muted-foreground">
                    {formatCurrency(String(r.value))}
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(pct, 2))}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReturnChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-56 min-w-0" role="img" aria-label="Rentabilidade por carteira">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={96}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => `${Number(v).toFixed(2)}%`}
          />
          <Bar dataKey="value" name="Rentabilidade" radius={[0, 6, 6, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={
                  entry.value > 0
                    ? "var(--gain)"
                    : entry.value < 0
                      ? "var(--loss)"
                      : "var(--chart-1)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
