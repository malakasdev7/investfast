"use client";
import { positions, overview, num } from "@/lib/calculations/finance";
import { type Snapshot, text, labels, today } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Empty } from "@/components/ui/data-state";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export function PositionsTable({
  data,
  portfolioId,
  assetId,
}: {
  data: Snapshot;
  portfolioId?: string;
  assetId?: string;
}) {
  const rows = positions(data).filter(
    (p) =>
      (!portfolioId || p.row.portfolio_id === portfolioId) &&
      (!assetId || p.row.asset_id === assetId),
  );
  const total = portfolioId
    ? rows.reduce((s, p) => s.plus(p.value), num(0))
    : overview(data).value;

  if (!rows.length) {
    return (
      <Empty
        title="Sua carteira começa com uma operação"
        description="Cadastre um ativo e registre sua primeira compra ou aporte."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="responsive-records positions-records w-full whitespace-nowrap text-left text-xs">
        <thead className="border-b bg-surface-subtle/70 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            {[
              "Ativo / carteira",
              "Quantidade",
              "Preço médio",
              "Custo",
              "Valor atual",
              "Resultado não realizado",
              "Realizado",
              "Proventos",
              "Retorno / anualizado¹",
              "Yield on cost",
              "Participação",
              "Primeira compra",
            ].map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((p) => {
            const days = p.row.first_purchase
              ? differenceInDays(parseISO(today()), parseISO(text(p.row.first_purchase)))
              : 0;
            const annual =
              days >= 30 &&
              p.cost.gt(0) &&
              p.value.gt(0) &&
              (data.investment_transactions ?? []).filter(
                (o) =>
                  o.asset_id === p.row.asset_id &&
                  o.portfolio_id === p.row.portfolio_id &&
                  ["buy", "deposit"].includes(text(o.type)),
              ).length === 1 &&
              !(data.investment_transactions ?? []).some(
                (o) =>
                  o.asset_id === p.row.asset_id &&
                  (o.portfolio_id === p.row.portfolio_id ||
                    o.destination_portfolio_id === p.row.portfolio_id) &&
                  ["sell", "withdraw", "transfer"].includes(text(o.type)),
              )
                ? p.value.div(p.cost).pow(num(365).div(days)).minus(1).mul(100)
                : null;

            return (
              <tr key={p.row.id} className="transition-colors hover:bg-muted/35">
                <td data-label="Ativo / carteira" className="px-4 py-3.5">
                  <p className="font-semibold text-foreground">{text(p.asset?.ticker)}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {text(data.portfolios?.find((c) => c.id === p.row.portfolio_id)?.name)} ·{" "}
                    {labels[text(p.asset?.asset_class)]}
                  </p>
                </td>
                <td data-label="Quantidade" className="tabular px-4">
                  {num(p.row.quantity).toFixed()}
                </td>
                <td data-label="Preço médio" className="tabular px-4">
                  {formatCurrency(text(p.row.average_price))}
                </td>
                <td data-label="Custo" className="tabular px-4">
                  {formatCurrency(p.cost)}
                </td>
                <td data-label="Valor atual" className="tabular px-4 font-semibold">
                  {formatCurrency(p.value)}
                  {!p.asset?.price_updated_at && (
                    <p className="text-[11px] font-normal text-warning">Sem cotação</p>
                  )}
                </td>
                <td
                  data-label="Resultado não realizado"
                  className={cn(
                    "tabular px-4 font-semibold",
                    p.profit.gt(0)
                      ? "text-gain"
                      : p.profit.lt(0)
                        ? "text-loss"
                        : "text-muted-foreground",
                  )}
                >
                  {formatCurrency(p.profit)}
                </td>
                <td
                  data-label="Realizado"
                  className={cn(
                    "tabular px-4 font-medium",
                    p.realized.gt(0) ? "text-gain" : p.realized.lt(0) ? "text-loss" : "",
                  )}
                >
                  {formatCurrency(p.realized)}
                </td>
                <td
                  data-label="Proventos"
                  className={cn("tabular px-4", p.income.gt(0) && "font-medium text-gain")}
                >
                  {formatCurrency(p.income)}
                </td>
                <td data-label="Retorno / anualizado" className="tabular px-4">
                  <span
                    className={cn(
                      "font-medium",
                      p.rate.gt(0) ? "text-gain" : p.rate.lt(0) ? "text-loss" : "",
                    )}
                  >
                    {p.rate.toFixed(2)}%
                  </span>{" "}
                  / {annual && annual.isFinite() ? `${annual.toFixed(2)}%` : "—"}
                </td>
                <td data-label="Yield on cost" className="tabular px-4">
                  {p.cost.gt(0) ? `${p.income.div(p.cost).mul(100).toFixed(2)}%` : "—"}
                </td>
                <td data-label="Participação" className="tabular px-4">
                  {total.gt(0) ? `${p.value.div(total).mul(100).toFixed(1)}%` : "—"}
                </td>
                <td data-label="Primeira compra" className="tabular px-4">
                  {p.row.first_purchase ? formatDate(text(p.row.first_purchase)) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t bg-surface-subtle/40 px-4 py-3 text-[11px] text-muted-foreground">
        ¹ Anualização simples desde a primeira compra; exibida a partir de 30 dias, para uma única
        compra/aporte e sem vendas ou transferências. Retorno é valorização sobre o custo
        remanescente. Yield on cost usa proventos recebidos sobre esse custo.
      </p>
    </div>
  );
}
