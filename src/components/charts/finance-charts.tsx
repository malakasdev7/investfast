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
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
  boxShadow: "var(--shadow-elevated)",
  fontSize: 12,
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
  return (
    <div className="chart-shell h-64 min-w-0" role="img" aria-label="Gráfico de evolução no período">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: 4 }}>
          <defs>
            {keys.map((k, idx) => (
              <linearGradient key={k.key} id={`grad-${k.key}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={k.color} stopOpacity={0.22} />
                <stop offset="95%" stopColor={k.color} stopOpacity={0.0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            fontSize={10}
            width={48}
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
              strokeWidth={2.25}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FlowChart({ data }: { data: Record<string, unknown>[] }) {
  return (
    <div className="chart-shell h-64 min-w-0" role="img" aria-label="Receitas e despesas por mês">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 4 }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickFormatter={compact}
            tickLine={false}
            axisLine={false}
            fontSize={10}
            width={48}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(String(v ?? 0))} />
          <Bar name="Receitas" dataKey="income" fill="var(--gain)" radius={[5, 5, 0, 0]} />
          <Bar name="Despesas" dataKey="expense" fill="var(--loss)" radius={[5, 5, 0, 0]} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
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
  return (
    <div className="chart-shell h-64 min-w-0" role="img" aria-label="Gráfico de alocação">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((r, i) => (
              <Cell key={i} fill={r.color || fallbackColors[i % fallbackColors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(String(v ?? 0))} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReturnChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-60 min-w-0" role="img" aria-label="Rentabilidade por carteira">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 20, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 5" horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickFormatter={(v) => `${v}%`}
            tickLine={false}
            axisLine={false}
            fontSize={10}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={90}
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tick={{ fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => `${Number(v).toFixed(2)}%`}
          />
          <Bar dataKey="value" name="Rentabilidade" radius={[0, 5, 5, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.value > 0 ? "var(--gain)" : entry.value < 0 ? "var(--loss)" : "var(--chart-1)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
