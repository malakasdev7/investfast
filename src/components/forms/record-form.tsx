"use client";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { LoaderCircle, Sparkles } from "lucide-react";
import { entities, type Row, type Snapshot, rowName, text, today } from "@/lib/domain";
import { entitySchema } from "@/lib/validations/entities";
import { useRecordMutation } from "@/hooks/use-finances";
import { formatCurrency } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const colorPalette = [
  "#2563eb",
  "#0284c7",
  "#0d9488",
  "#15803d",
  "#d97706",
  "#dc2626",
  "#475569",
  "#0f172a",
];

const iconOptions = [
  ["wallet", "Carteira"],
  ["landmark", "Banco"],
  ["credit-card", "Cartão"],
  ["piggy-bank", "Reserva"],
  ["briefcase", "Investimento"],
  ["tag", "Etiqueta"],
  ["shopping-bag", "Compras"],
  ["home", "Moradia"],
  ["car", "Transporte"],
  ["utensils", "Alimentação"],
  ["heart-pulse", "Saúde"],
  ["sparkles", "Lazer"],
];

const monthsPt = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function RecordForm({
  entity,
  row,
  data,
  onDone,
  duplicate = false,
  initialValues,
}: {
  entity: string;
  row?: Row;
  data: Snapshot;
  onDone: () => void;
  duplicate?: boolean;
  initialValues?: Record<string, string>;
}) {
  const config = entities[entity];
  const mutation = useRecordMutation(entity);

  const activeAccounts = (data.accounts ?? []).filter((a) => a.status !== "archived");
  const activePortfolios = (data.portfolios ?? []).filter((p) => p.status !== "archived");
  const activeGoals = (data.goals ?? []).filter((g) => g.status === "active");

  const defaults = Object.fromEntries(
    config.fields.map((f) => {
      if (row) return [f.key, text(row[f.key])];
      if (f.default !== undefined) return [f.key, f.default];
      if (f.kind === "date" && f.required) {
        return [f.key, f.key === "month" ? today().slice(0, 7) + "-01" : today()];
      }
      if (f.key === "account_id" && f.required && activeAccounts.length === 1) {
        return [f.key, activeAccounts[0].id];
      }
      if (f.key === "portfolio_id" && f.required && activePortfolios.length === 1) {
        return [f.key, activePortfolios[0].id];
      }
      if (f.key === "goal_id" && f.required && activeGoals.length === 1) {
        return [f.key, activeGoals[0].id];
      }
      return [f.key, ""];
    }),
  );

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors },
  } = useForm<Record<string, string>>({
    defaultValues: { ...defaults, ...initialValues },
  });

  const assetClass = useWatch({ control, name: "asset_class" });
  const type = useWatch({ control, name: "type" });
  const selectedColor = useWatch({ control, name: "color" });
  const selectedAssetId = useWatch({ control, name: "asset_id" });
  const quantityVal = useWatch({ control, name: "quantity" });
  const unitPriceVal = useWatch({ control, name: "unit_price" });
  const feesVal = useWatch({ control, name: "fees" });
  const monthVal = useWatch({ control, name: "month" });

  const isTx = entity === "transactions" || entity === "recurring_transactions";
  const isOp = entity === "investment_transactions";
  const isTransferOrCard = isTx && ["transfer", "card_payment"].includes(type);
  const isNoPriceOp = isOp && ["split", "reverse_split", "bonus", "transfer"].includes(type);
  const isPortfolioTransfer = isOp && type === "transfer";

  useEffect(() => {
    if (isTx) {
      if (isTransferOrCard) {
        setValue("category_id", "");
      } else {
        setValue("destination_account_id", "");
      }
    }
  }, [isTx, isTransferOrCard, setValue]);

  useEffect(() => {
    if (isOp) {
      if (isNoPriceOp) {
        setValue("unit_price", "0");
        setValue("fees", "0");
      }
      if (!isPortfolioTransfer) {
        setValue("destination_portfolio_id", "");
      }
    }
  }, [isOp, isNoPriceOp, isPortfolioTransfer, setValue]);

  useEffect(() => {
    if ((isOp || entity === "asset_prices") && selectedAssetId && !row) {
      const asset = (data.assets ?? []).find((a) => a.id === selectedAssetId);
      const currentPrice = Number(asset?.current_price || 0);
      if (currentPrice > 0) {
        if (entity === "asset_prices") {
          setValue("price", String(currentPrice));
        } else if (isOp && !isNoPriceOp && (!unitPriceVal || unitPriceVal === "0")) {
          setValue("unit_price", String(currentPrice));
        }
      }
    }
  }, [selectedAssetId, entity, isOp, isNoPriceOp, row, data.assets, setValue, unitPriceVal]);

  async function submit(values: Record<string, string>) {
    const cleaned = { ...values };
    if (entity === "budgets" && cleaned.month && cleaned.month.length >= 7) {
      cleaned.month = cleaned.month.slice(0, 7) + "-01";
    }
    const parsed = entitySchema(entity).safeParse(cleaned);
    if (!parsed.success) {
      parsed.error.issues.forEach((i) => setError(String(i.path[0]), { message: i.message }));
      return;
    }
    try {
      await mutation.mutateAsync({
        method: row && !duplicate ? "PATCH" : "POST",
        id: row && !duplicate ? row.id : undefined,
        values: parsed.data,
      });
      onDone();
    } catch {}
  }

  const previewTotal = (() => {
    if (!isOp || isNoPriceOp) return null;
    const q = Number(String(quantityVal || "0").replace(",", "."));
    const p = Number(String(unitPriceVal || "0").replace(",", "."));
    const fee = Number(String(feesVal || "0").replace(",", "."));
    if (!Number.isFinite(q) || !Number.isFinite(p) || !Number.isFinite(fee) || q <= 0) return null;
    const gross = q * p;
    const net = ["buy", "deposit"].includes(type) ? gross + fee : gross - fee;
    return { gross, fee, net };
  })();

  const currentYear = Number(today().slice(0, 4));
  const budgetMonthOptions = Array.from({ length: 16 }, (_, idx) => {
    const offset = idx - 3;
    const d = new Date(currentYear, Number(today().slice(5, 7)) - 1 + offset, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const label = `${monthsPt[d.getMonth()]} de ${d.getFullYear()}`;
    return { value: ym, label };
  });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      {isTx && (
        <div>
          <span className="field-label mb-2">Tipo de lançamento</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { id: "expense", label: "Despesa", active: "border-loss/40 bg-loss/10 text-loss" },
              { id: "income", label: "Receita", active: "border-gain/40 bg-gain/10 text-gain" },
              {
                id: "transfer",
                label: "Transferência",
                active: "border-primary/40 bg-primary/10 text-primary",
              },
              {
                id: "card_payment",
                label: "Pagar fatura",
                active: "border-warning/40 bg-warning/10 text-warning",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setValue("type", tab.id);
                  clearErrors();
                }}
                className={cn(
                  "cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all sm:text-sm",
                  type === tab.id
                    ? tab.active
                    : "border-glass-border bg-glass-light-bg text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {config.fields.map((f) => {
          if (f.key === "cdi_percent" && assetClass !== "cdi") return null;
          if (isTx && f.key === "type") return null;
          if (isTx && f.key === "destination_account_id" && !isTransferOrCard) return null;
          if (isTx && f.key === "category_id" && isTransferOrCard) return null;
          if (isOp && f.key === "destination_portfolio_id" && !isPortfolioTransfer) return null;
          if (isOp && (f.key === "unit_price" || f.key === "fees" || f.key === "account_id") && isNoPriceOp)
            return null;

          let choices = f.table ? (data[f.table] ?? []) : [];
          if (f.table === "categories") {
            choices = choices.filter((r) => (entity === "budgets" ? r.type === "expense" : r.type === type));
          }
          if (isTx && f.key === "destination_account_id" && type === "card_payment") {
            choices = choices.filter((r) => r.type === "credit");
          }

          if (entity === "budgets" && f.key === "month") {
            return (
              <label key={f.key} className="field-label">
                <span>
                  Mês de referência <span className="text-primary">*</span>
                </span>
                <select
                  className="input"
                  value={monthVal || today().slice(0, 7) + "-01"}
                  onChange={(e) => setValue("month", e.target.value)}
                >
                  {budgetMonthOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <span className="field-error">{errors[f.key]?.message}</span>
              </label>
            );
          }

          if (f.key === "icon") {
            return (
              <label key={f.key} className="field-label">
                <span>{f.label}</span>
                <select className="input" {...register(f.key)}>
                  {iconOptions.map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className="field-error">{errors[f.key]?.message}</span>
              </label>
            );
          }

          if (f.kind === "color") {
            return (
              <div key={f.key} className="field-label">
                <span>
                  {f.label}
                  {f.required && <span className="text-primary"> *</span>}
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {colorPalette.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`Escolher cor ${hex}`}
                      onClick={() => setValue("color", hex)}
                      style={{ backgroundColor: hex }}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform",
                        selectedColor === hex
                          ? "scale-110 border-foreground ring-2 ring-primary/30"
                          : "border-transparent",
                      )}
                    />
                  ))}
                  <input
                    aria-label="Cor personalizada"
                    type="color"
                    className="size-8 cursor-pointer rounded-lg border bg-transparent p-0.5"
                    {...register(f.key)}
                  />
                </div>
                <span className="field-error">{errors[f.key]?.message}</span>
              </div>
            );
          }

          const dynamicLabel =
            isOp && f.key === "quantity"
              ? ["split", "reverse_split"].includes(type)
                ? "Fator da operação (ex.: 2)"
                : "Quantidade"
              : isOp && f.key === "unit_price"
                ? ["dividend", "jcp", "interest"].includes(type)
                  ? "Provento por cota/ação (R$)"
                  : "Preço unitário (R$)"
                : isTx && f.key === "destination_account_id" && type === "card_payment"
                  ? "Cartão da fatura"
                  : f.label;

          return (
            <label
              key={f.key}
              className={cn(
                "field-label",
                f.kind === "textarea" || (isTx && f.key === "description") ? "sm:col-span-2" : "",
              )}
            >
              <span>
                {dynamicLabel}
                {(f.required || (isTx && f.key === "destination_account_id" && isTransferOrCard)) && (
                  <span className="text-primary"> *</span>
                )}
              </span>
              {f.kind === "select" || f.kind === "lookup" || f.kind === "checkbox" ? (
                <select className="input" {...register(f.key)}>
                  <option value="">Selecione</option>
                  {f.kind === "checkbox" ? (
                    <>
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </>
                  ) : f.kind === "lookup" ? (
                    choices.map((r) => (
                      <option key={r.id} value={r.id}>
                        {rowName(r)}
                        {r.status === "archived" ? " (arquivado)" : ""}
                      </option>
                    ))
                  ) : (
                    Object.entries(f.options ?? {}).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))
                  )}
                </select>
              ) : f.kind === "textarea" ? (
                <textarea className="input min-h-20" placeholder="Opcional…" {...register(f.key)} />
              ) : (
                <input
                  className="input"
                  type={f.kind === "date" ? "date" : "text"}
                  inputMode={f.kind === "decimal" ? "decimal" : undefined}
                  placeholder={f.kind === "decimal" ? "0,00" : undefined}
                  {...register(f.key, {
                    setValueAs:
                      f.kind === "decimal"
                        ? (v: string) => String(v ?? "").replace(",", ".")
                        : undefined,
                  })}
                />
              )}
              {f.help && (
                <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                  {f.help}
                </span>
              )}
              <span className="field-error">{errors[f.key]?.message}</span>
            </label>
          );
        })}
      </div>

      {previewTotal && (
        <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3.5 text-sm">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="size-4 text-primary" />
            Valor total estimado da operação
          </span>
          <span className="tabular text-base font-semibold text-foreground">
            {formatCurrency(previewTotal.net)}
          </span>
        </div>
      )}

      <div className="record-form-actions flex justify-end gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending && <LoaderCircle className="animate-spin" />}
          Salvar {config.singular}
        </Button>
      </div>
    </form>
  );
}
