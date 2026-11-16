"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PiggyBank, Plus, ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/hooks/use-finances";
import { type Snapshot, type Row, text, today } from "@/lib/domain";
import { positions, num } from "@/lib/calculations/finance";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const moneyInput = (v: string) => num(/^\d+(?:[,.]\d*)?$/.test(v) ? v.replace(",", ".") : "0");
type Action = "create" | "deposit" | "withdraw" | "balance";

export function CdiPanel({ data }: { data: Snapshot }) {
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [form, setForm] = useState<{ action: Action; asset?: Row } | null>(null);
  const assets = (data.assets || []).filter((a) => a.asset_class === "cdi");
  const ps = positions(data);

  return (
    <section aria-label="Aplicações CDI" className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-4 border-primary/25 p-5 sm:p-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <PiggyBank className="size-4 text-primary" />
            CDI · Caixinhas e cofrinhos
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground sm:text-sm">
            Cadastre o dinheiro guardado no banco, acompanhe o saldo e movimente em reais.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setForm({ action: "create" })}>
          <Plus />
          Adicionar caixinha CDI
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((a) => {
          const pp = ps.filter((p) => p.row.asset_id === a.id);
          const value = pp.reduce((s, p) => s.plus(p.value), num(0));
          const cost = pp.reduce((s, p) => s.plus(p.cost), num(0));
          const realized = pp.reduce((s, p) => s.plus(num(p.row.realized_profit)), num(0));
          const status = (data.cdi_status || []).find((s) => s.asset_id === a.id);
          const yieldVal = value.minus(cost);

          return (
            <article key={a.id} className="card flex flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold tracking-tight">{text(a.name)}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {text(a.institution) || "Instituição não informada"}
                    </p>
                  </div>
                  <span className="badge badge-primary shrink-0">
                    {a.cdi_percent
                      ? `${Number(a.cdi_percent).toLocaleString("pt-BR")}% do CDI`
                      : "CDI"}
                  </span>
                </div>

                <p className="mt-5 text-xs text-muted-foreground">
                  {status?.source === "cdi_estimate" ? "Saldo bruto estimado" : "Saldo informado"} ·
                  todas as carteiras
                </p>
                <p className="metric-value mt-1 text-2xl font-semibold sm:text-3xl">{formatCurrency(value)}</p>
                <p className="tabular mt-1.5 text-xs text-muted-foreground">
                  Valor aplicado restante: {formatCurrency(cost)}
                </p>

                <div className="mt-4 rounded-2xl border border-glass-border bg-glass-light-bg p-4">
                  <p className="text-xs text-muted-foreground">
                    Rendimento na posição · antes de impostos
                  </p>
                  <p
                    className={cn(
                      "tabular mt-1 text-base font-semibold",
                      yieldVal.gt(0)
                        ? "text-gain"
                        : yieldVal.lt(0)
                          ? "text-loss"
                          : "text-foreground",
                    )}
                  >
                    {yieldVal.gt(0) ? "+" : ""}
                    {formatCurrency(yieldVal)}
                  </p>
                  <p className="tabular mt-1 text-xs text-muted-foreground">
                    Resultado dos resgates: {formatCurrency(realized)}
                  </p>
                </div>

                {status?.warning && (
                  <p role="status" className="mt-2.5 text-xs text-warning">
                    {text(status.warning)}
                  </p>
                )}
                <p className="mt-2.5 text-xs text-muted-foreground">
                  {status?.rate_date
                    ? `CDI diário até ${formatDate(text(status.rate_date))} · Banco Central`
                    : a.price_updated_at
                      ? `Atualizado em ${formatDate(
                          text(status?.price_date) || text(a.price_updated_at).slice(0, 10),
                        )}`
                      : "Saldo ainda não atualizado"}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setForm({ action: "deposit", asset: a })}
                >
                  <ArrowDownLeft />
                  Aportar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!value.gt(0)}
                  onClick={() => setForm({ action: "withdraw", asset: a })}
                >
                  <ArrowUpRight />
                  Resgatar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2"
                  disabled={!value.gt(0)}
                  onClick={() => setForm({ action: "balance", asset: a })}
                >
                  Atualizar saldo do banco
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-2 text-loss hover:bg-loss/10 hover:text-loss"
                  onClick={() => setDeleting(a)}
                >
                  <Trash2 />
                  Excluir caixinha
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {form && (
        <Dialog
          title={
            form.action === "create"
              ? "Nova caixinha CDI"
              : `${{ deposit: "Aportar", withdraw: "Resgatar", balance: "Atualizar saldo" }[form.action]} · ${text(form.asset?.name)}`
          }
          onClose={() => setForm(null)}
        >
          <CdiForm
            data={data}
            action={form.action}
            asset={form.asset}
            onDone={() => setForm(null)}
          />
        </Dialog>
      )}

      {deleting && <DeleteCdi asset={deleting} onDone={() => setDeleting(null)} />}
    </section>
  );
}

function CdiForm({
  data,
  action,
  asset,
  onDone,
}: {
  data: Snapshot;
  action: Action;
  asset?: Row;
  onDone: () => void;
}) {
  const accounts = (data.accounts || []).filter(
    (a) => a.status === "active" && a.type !== "credit" && a.currency === "BRL",
  );
  const [account, setAccount] = useState(
    accounts.some((a) => a.id === asset?.cdi_account_id) ? text(asset?.cdi_account_id) : "",
  );
  const [fees, setFees] = useState("0");
  const cache = useQueryClient();
  const portfolios = (data.portfolios || []).filter((p) => p.status === "active");
  const [name, setName] = useState("Minha caixinha");
  const [institution, setInstitution] = useState("");
  const [percent, setPercent] = useState("100");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [portfolio, setPortfolio] = useState(portfolios.length === 1 ? portfolios[0].id : "");

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<{ warnings?: string[] }>("/api/investments/cdi", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async (result) => {
      await cache.invalidateQueries({ queryKey: ["finances"] });
      toast.success(action === "balance" ? "Saldo atualizado." : "Aplicação atualizada.");
      for (const warning of result.warnings || []) toast.warning(warning);
      onDone();
    },
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({
          action,
          ...(asset ? { asset_id: asset.id } : {}),
          ...(action === "create"
            ? { name, institution, percent: percent.replace(",", ".") }
            : {}),
          ...(action !== "balance"
            ? {
                portfolio_id: portfolio,
                ...(account ? { account_id: account } : {}),
                ...(action === "withdraw" ? { fees: fees.replace(",", ".") || "0" } : {}),
              }
            : {}),
          amount: amount.replace(",", "."),
          date,
        });
      }}
    >
      {action === "create" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Nubank", "Caixinha Nubank"],
              ["Mercado Pago", "Cofrinho Mercado Pago"],
            ].map(([bank, label]) => (
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-11 whitespace-normal text-xs"
                key={bank}
                onClick={() => {
                  setInstitution(bank);
                  setName(label);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <label className="field-label">
            Nome da aplicação
            <input
              className="input"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="field-label">
            Instituição
            <input
              className="input"
              required
              maxLength={200}
              placeholder="Ex.: Nubank ou Mercado Pago"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </label>
          <label className="field-label">
            Percentual contratado do CDI
            <input
              className="input"
              required
              inputMode="decimal"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Informe o percentual contratado. O rendimento bruto é estimado diariamente pelo CDI
              publicado pelo Banco Central.
            </span>
          </label>
        </>
      )}

      {action !== "balance" && (
        <label className="field-label">
          Carteira
          <select
            className="input"
            required
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
          >
            <option value="">Selecione a carteira</option>
            {portfolios.map((p) => (
              <option value={p.id} key={p.id}>
                {text(p.name)}
              </option>
            ))}
          </select>
          {!portfolios.length && (
            <span className="field-error">Cadastre uma carteira antes de continuar.</span>
          )}
        </label>
      )}

      {action !== "balance" && (
        <label className="field-label">
          {action === "withdraw" ? "Creditar resgate na conta" : "Descontar aporte da conta"}
          <select className="input" value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Não movimentar conta — dinheiro externo ou já aplicado</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {text(a.name)} · {formatCurrency(num(a.current_balance))}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {account
              ? action === "withdraw"
                ? "O valor líquido será somado ao saldo da conta."
                : "O aporte será descontado do saldo disponível da conta."
              : "Sem alteração nas contas cadastradas."}
          </span>
        </label>
      )}

      <label className="field-label">
        {action === "balance"
          ? "Saldo total atual no banco (R$)"
          : action === "withdraw"
            ? "Valor bruto do resgate (R$)"
            : "Valor do aporte (R$)"}
        <input
          autoFocus={action !== "create"}
          className="input"
          inputMode="decimal"
          required
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>

      {action === "withdraw" && (
        <label className="field-label">
          Impostos e taxas retidos (R$)
          <input
            className="input"
            inputMode="decimal"
            required
            value={fees}
            onChange={(e) => setFees(e.target.value)}
          />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            Informe o desconto efetivo do banco. Valor líquido:{" "}
            {formatCurrency(moneyInput(amount).minus(moneyInput(fees)))}
          </span>
        </label>
      )}

      <label className="field-label">
        Data
        <input
          className="input"
          type="date"
          required
          max={today()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      <p className="rounded-2xl border border-glass-border bg-glass-light-bg p-4 text-xs leading-5 text-muted-foreground">
        {action === "balance"
          ? "Copie o saldo da aplicação exibido pelo banco, incluindo os rendimentos. Se ela estiver em mais de uma carteira, informe a soma. Esta atualização não é um novo aporte."
          : "Ao confirmar, a aplicação e a conta selecionada serão atualizadas juntas. Rendimentos são estimativas brutas, antes de IR e IOF; regras específicas do banco podem alterar o valor."}
      </p>

      {mutation.error && (
        <p role="alert" className="field-error">
          {mutation.error.message}
        </p>
      )}

      <div className="record-form-actions flex gap-3 border-t pt-4">
        <Button className="flex-1" type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          className="flex-1"
          disabled={mutation.isPending || (action !== "balance" && !portfolios.length)}
        >
          {mutation.isPending ? "Salvando…" : "Confirmar"}
        </Button>
      </div>
    </form>
  );
}

function DeleteCdi({ asset, onDone }: { asset: Row; onDone: () => void }) {
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api("/api/investments/cdi", {
        method: "DELETE",
        body: JSON.stringify({ asset_id: asset.id }),
      }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: ["finances"] });
      toast.success("Caixinha excluída. Saldos recalculados.");
      onDone();
    },
  });

  return (
    <Dialog
      title="Excluir caixinha"
      onClose={() => {
        if (!mutation.isPending) onDone();
      }}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!mutation.isPending) mutation.mutate();
        }}
      >
        <p className="text-sm">
          Excluir <strong className="break-words">{text(asset.name)}</strong>?
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          A caixinha e seu histórico de aportes, resgates e rendimentos serão apagados. Os débitos
          e créditos desses lançamentos serão desfeitos nas contas vinculadas. Esta ação não pode
          ser desfeita.
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          Para apenas retirar o dinheiro e manter o histórico, use Resgatar.
        </p>
        {mutation.error && (
          <p role="alert" className="field-error">
            {mutation.error.message}
          </p>
        )}
        <div className="record-form-actions flex gap-3 border-t pt-4">
          <Button
            autoFocus
            type="button"
            variant="outline"
            className="flex-1"
            disabled={mutation.isPending}
            onClick={onDone}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Excluindo…" : "Excluir definitivamente"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
