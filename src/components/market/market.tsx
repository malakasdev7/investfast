"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Star,
  Plus,
  Clock3,
  Scale,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { api, useFinances } from "@/hooks/use-finances";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { RecordForm } from "@/components/forms/record-form";
import { type Row, type Snapshot, labels } from "@/lib/domain";
import {
  marketPath,
  periods,
  type Period,
  type MarketItem,
  type MarketResult,
  type MarketType,
} from "@/lib/market/types";

const tabs = [
  ["acoes", "Ações"],
  ["fiis", "FIIs"],
  ["cripto", "Criptomoedas"],
  ["indices", "Índices"],
  ["favoritos", "Favoritos"],
] as const;

const money = (n: string | null | undefined, points = false) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: points ? "decimal" : "currency",
        currency: "BRL",
        maximumFractionDigits: points ? 2 : Number(n) < 1 ? 8 : 2,
      }).format(Number(n)) + (points ? " pts" : "");

const number = (n: string | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(Number(n));

const timestamp = (s: string | undefined) =>
  s ? new Date(s).toLocaleString("pt-BR") : "Sem cotação";

function Change({ value }: { value: string | null | undefined }) {
  return (
    <span
      className={
        value == null
          ? "text-muted-foreground"
          : Number(value) > 0
            ? "text-gain"
            : Number(value) < 0
              ? "text-loss"
              : "text-muted-foreground"
      }
    >
      {value == null
        ? "—"
        : `${Number(value) > 0 ? "+" : ""}${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
    </span>
  );
}

function Skeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando mercado"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="card h-64 animate-pulse p-5">
          <div className="h-5 w-24 rounded bg-muted" />
          <div className="mt-8 h-8 w-36 rounded bg-muted" />
          <div className="mt-8 h-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function Warning({ messages, retry }: { messages: string[]; retry: () => void }) {
  return messages.length ? (
    <div className="card flex flex-wrap items-center justify-between gap-3 border-warning/25 p-4">
      <div className="space-y-1 text-xs leading-5 text-muted-foreground">
        {messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={retry}>
        <RefreshCw />
        Tentar novamente
      </Button>
    </div>
  ) : null;
}

function Sources() {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      Dados informativos de{" "}
      <a
        href="https://brapi.dev"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        brapi.dev
      </a>{" "}
      e{" "}
      <a
        href="https://www.coingecko.com"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        CoinGecko
      </a>
      . Atualização a cada 60 segundos enquanto esta página estiver aberta. Cotações podem ter
      atraso. Preços manuais são particulares à sua conta.
    </p>
  );
}

type Prepared = {
  asset: Row;
  defaults: Record<string, string>;
  quoteTime: string | null;
};

function useActions() {
  const cache = useQueryClient();
  const finances = useFinances();
  const [operation, setOperation] = useState<Prepared | null>(null);
  const [manual, setManual] = useState<MarketItem | null>(null);
  const [price, setPrice] = useState("");

  const action = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<Prepared>("/api/market", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async (result, variables) => {
      await cache.invalidateQueries({ queryKey: ["market"] });
      if (variables.action === "prepare") {
        setOperation(result);
        await cache.invalidateQueries({ queryKey: ["finances"] });
      } else if (variables.action === "manual") {
        setManual(null);
        toast.success("Preço manual salvo no Mercado.");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const perform = (
    a: MarketItem,
    kind: string,
    extra: Record<string, unknown> = {},
  ) => action.mutate({ type: a.type, ticker: a.provider_id, action: kind, ...extra });

  function buttons(a: MarketItem, detail = false) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={action.isPending}
          onClick={() => perform(a, "favorite", { enabled: !a.favorite })}
          aria-label={
            a.favorite
              ? `Remover ${a.ticker} dos favoritos`
              : `Favoritar ${a.ticker}`
          }
          aria-pressed={a.favorite}
        >
          <Star className={a.favorite ? "fill-amber-400 text-amber-400" : ""} />
          {detail ? (a.favorite ? "Remover favorito" : "Adicionar aos favoritos") : null}
        </Button>

        {!detail && (
          <Button variant="outline" size="sm" asChild>
            <Link href={marketPath(a)}>
              Ver detalhes
              <ArrowUpRight />
            </Link>
          </Button>
        )}

        {a.type !== "indices" && (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/posso-comprar?ticker=${encodeURIComponent(a.ticker)}&name=${encodeURIComponent(a.name)}&class=${encodeURIComponent(a.asset_class)}`}
            >
              <Scale className="size-3.5 text-primary" />
              Posso comprar?
            </Link>
          </Button>
        )}

        <Button
          size="sm"
          disabled={action.isPending || a.type === "indices"}
          title={a.type === "indices" ? "Índice de referência não é negociável" : undefined}
          onClick={() => perform(a, "prepare")}
        >
          <Plus />
          Registrar operação
        </Button>

        {detail && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPrice(a.quote?.price || "");
              setManual(a);
            }}
          >
            Atualizar preço manualmente
          </Button>
        )}
      </div>
    );
  }

  const snapshot: Snapshot = {
    ...finances.data,
    assets: operation
      ? [
          ...(finances.data?.assets || []).filter((a) => a.id !== operation.asset.id),
          operation.asset,
        ]
      : finances.data?.assets || [],
  };

  const dialogs = (
    <>
      {operation && (
        <Dialog title="Registrar operação" onClose={() => setOperation(null)}>
          <p className="mb-2 font-semibold">
            {operation.asset.ticker} · {operation.asset.name}
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            {labels[String(operation.asset.asset_class)]} · Cotação:{" "}
            {timestamp(operation.quoteTime || undefined)}. Confira o preço. A operação só será
            criada ao clicar em Salvar operação.
          </p>
          {finances.isPending ? (
            <p>Carregando carteiras…</p>
          ) : finances.error ? (
            <p role="alert">
              Não foi possível carregar as carteiras. Feche e tente novamente.
            </p>
          ) : (
            <RecordForm
              entity="investment_transactions"
              data={snapshot}
              initialValues={operation.defaults}
              onDone={() => setOperation(null)}
            />
          )}
        </Dialog>
      )}

      {manual && (
        <Dialog
          title={`Preço manual · ${manual.ticker}`}
          onClose={() => setManual(null)}
        >
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              perform(manual, "manual", { price: price.replace(",", ".") });
            }}
          >
            <p className="text-sm text-muted-foreground">
              Este preço será salvo no histórico do Mercado. Não altera sua carteira nem as
              cotações dos investimentos.
            </p>
            <label className="field-label">
              {manual.currency === "POINTS" ? "Valor em pontos" : "Preço em reais"}
              <input
                className="input"
                inputMode="decimal"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <Button disabled={action.isPending}>Salvar preço manual</Button>
          </form>
        </Dialog>
      )}
    </>
  );

  return { buttons, dialogs };
}

export function MarketPage() {
  const [tab, setTab] = useState<MarketType | "favoritos">("acoes");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [assetClass, setAssetClass] = useState("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 450);
    return () => clearTimeout(timer);
  }, [search]);

  const result = useQuery({
    queryKey: ["market", "list", tab, debounced],
    queryFn: () =>
      api<MarketResult>(
        `/api/market?${new URLSearchParams({ type: tab, search: debounced })}`,
      ),
    refetchInterval: 60000,
    staleTime: 30000,
    retry: false,
  });

  const actions = useActions();

  const items = useMemo(
    () =>
      [...(result.data?.items || [])]
        .filter((a) => tab !== "acoes" || assetClass === "all" || a.asset_class === assetClass)
        .sort((a, b) => {
          if (sort === "name")
            return a.name.localeCompare(b.name, "pt-BR") * (direction === "asc" ? 1 : -1);
          const va = a.quote?.[sort as "price" | "volume" | "change_percent"];
          const vb = b.quote?.[sort as "price" | "volume" | "change_percent"];
          if (va == null) return vb == null ? 0 : 1;
          if (vb == null) return -1;
          return (Number(va) - Number(vb)) * (direction === "asc" ? 1 : -1);
        }),
    [result.data, sort, direction, assetClass, tab],
  );

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <p className="mb-1 text-xs uppercase tracking-widest text-primary">
          Acompanhe o mercado
        </p>
        <h1 className="page-heading">Mercado</h1>
        <p className="subheading">
          Bolsa brasileira e criptomoedas, conectadas aos seus investimentos.
        </p>
      </div>

      <nav
        aria-label="Tipos de mercado"
        className="glass-navigation no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto rounded-2xl border p-1.5 sm:w-fit"
      >
        {tabs.map(([id, name]) => (
          <Button
            key={id}
            size="sm"
            className="shrink-0"
            variant={tab === id ? "default" : "ghost"}
            onClick={() => {
              setTab(id);
              setSearch("");
              setDebounced("");
            }}
            aria-pressed={tab === id}
          >
            {name}
          </Button>
        ))}
      </nav>

      <div className="card grid gap-2.5 p-3.5 sm:gap-3 sm:p-4 md:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <span className="sr-only">Buscar ticker ou nome</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input m-0 pl-9"
            placeholder="Buscar ticker ou nome"
            maxLength={80}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div
          className={`grid gap-2 ${tab === "acoes" ? "grid-cols-3" : "grid-cols-2"} md:contents`}
        >
          {tab === "acoes" && (
            <select
              className="input m-0 min-w-0 text-xs sm:text-sm"
              aria-label="Classe do ativo"
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="stock">Ações</option>
              <option value="etf">ETFs</option>
              <option value="bdr">BDRs</option>
            </select>
          )}
          <select
            className="input m-0 min-w-0 text-xs sm:text-sm"
            aria-label="Ordenar por"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Nome</option>
            <option value="change_percent">Variação</option>
            <option value="price">Preço</option>
            <option value="volume">Volume</option>
          </select>
          <select
            className="input m-0 min-w-0 text-xs sm:text-sm"
            aria-label="Direção da ordenação"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <option value="asc">Crescente</option>
            <option value="desc">Decrescente</option>
          </select>
        </div>
      </div>

      <Warning
        messages={result.error ? [result.error.message] : result.data?.warnings || []}
        retry={() => void result.refetch()}
      />

      {result.isPending ? (
        <Skeleton />
      ) : items.length ? (
        <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((a) => (
            <article
              key={a.id}
              className="card flex flex-col gap-4 p-4 sm:gap-5 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={marketPath(a)} className="font-semibold text-primary">
                    {a.ticker}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">{a.name}</p>
                </div>
                <span className="badge">
                  {a.asset_class === "index" ? "Índice" : labels[a.asset_class]}
                </span>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="metric-value text-2xl font-semibold">
                  {money(a.quote?.price, a.currency === "POINTS")}
                </p>
                <div className="text-right text-sm">
                  <Change value={a.quote?.change_percent} />
                  <p className="text-xs text-muted-foreground">
                    {money(a.quote?.change, a.currency === "POINTS")}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-glass-border bg-glass-light-bg p-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Máxima</dt>
                  <dd className="mt-1 font-medium tabular text-foreground">
                    {money(a.quote?.high, a.currency === "POINTS")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mínima</dt>
                  <dd className="mt-1 font-medium tabular text-foreground">
                    {money(a.quote?.low, a.currency === "POINTS")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    Volume{a.type === "cripto" ? " (R$)" : ""}
                  </dt>
                  <dd className="mt-1 font-medium tabular text-foreground">{number(a.quote?.volume)}</dd>
                </div>
              </dl>

              <p className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="size-3" />
                {timestamp(a.quote?.timestamp)}
                {a.quote?.source === "manual" ? " · manual" : ""}
              </p>

              {actions.buttons(a)}
            </article>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center text-muted-foreground">
          {tab === "favoritos"
            ? "Você ainda não tem favoritos nesta busca. Use a estrela de um ativo."
            : "Nenhum ativo encontrado. Tente outro ticker ou nome."}
        </div>
      )}

      <Sources />
      {actions.dialogs}
    </div>
  );
}

export function MarketDetail({
  type,
  ticker,
}: {
  type: MarketType;
  ticker: string;
}) {
  const [period, setPeriod] = useState<Period>("1mo");
  const result = useQuery({
    queryKey: ["market", "detail", type, ticker, period],
    queryFn: () =>
      api<MarketResult>(
        `/api/market?${new URLSearchParams({ type, ticker, period })}`,
      ),
    refetchInterval: 60000,
    staleTime: 30000,
    retry: false,
  });

  const actions = useActions();
  const a = result.data?.items[0];
  const chart = (result.data?.history || []).map((p) => ({
    timestamp: Date.parse(p.timestamp),
    price: Number(p.price),
  }));

  if (result.isPending) return <Skeleton />;
  if (!a)
    return (
      <div className="space-y-5">
        <Link href="/mercado">← Mercado</Link>
        <Warning
          messages={[result.error?.message || "Ativo não encontrado."]}
          retry={() => void result.refetch()}
        />
      </div>
    );

  const dividends = Array.isArray(a.metadata?.dividends)
    ? (a.metadata.dividends as {
        label: string;
        rate: string;
        paymentDate: string;
      }[])
    : [];

  return (
    <div className="space-y-6">
      <Link
        href="/mercado"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        Mercado
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-heading">{a.ticker}</h1>
          <p className="subheading">
            {a.name} ·{" "}
            {a.asset_class === "index" ? "Índice" : labels[a.asset_class]}
          </p>
        </div>
        {actions.buttons(a, true)}
      </header>

      <Warning
        messages={result.error ? [result.error.message] : result.data?.warnings || []}
        retry={() => void result.refetch()}
      />

      <section className="hero-metric rounded-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {a.currency === "POINTS" ? "Valor do índice" : "Preço atual"}
            </p>
            <p className="metric-value mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[42px]">
              {money(a.quote?.price, a.currency === "POINTS")}
            </p>
            <p className="mt-2.5 text-sm font-medium">
              <Change value={a.quote?.change_percent} />{" "}
              <span className="text-muted-foreground">
                ({money(a.quote?.change, a.currency === "POINTS")}) ·{" "}
                {a.type === "cripto" ? "24 horas" : "dia"}
              </span>
            </p>
          </div>
          <p className="rounded-full border border-glass-border bg-glass-light-bg px-3.5 py-1.5 text-xs text-muted-foreground">
            {timestamp(a.quote?.timestamp)} · {a.quote?.source || "Sem fonte disponível"}
          </p>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["7 dias", <Change key="7" value={a.quote?.change_7d} />],
            ["30 dias", <Change key="30" value={a.quote?.change_30d} />],
            ["Máxima", money(a.quote?.high, a.currency === "POINTS")],
            ["Mínima", money(a.quote?.low, a.currency === "POINTS")],
            [
              "Volume" + (a.type === "cripto" ? " 24h (R$)" : ""),
              number(a.quote?.volume),
            ],
            ["Valor de mercado (R$)", number(a.quote?.market_cap)],
          ].map(([label, value]) => (
            <div
              className="rounded-2xl border border-glass-border bg-glass-light-bg p-3.5"
              key={String(label)}
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1.5 break-words text-sm font-semibold tabular text-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Histórico de preços</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Evolução das cotações registradas no intervalo selecionado
            </p>
          </div>
          <div className="glass-navigation flex flex-wrap gap-1.5 rounded-2xl border p-1.5">
            {Object.entries(periods).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={key === period ? "default" : "ghost"}
                onClick={() => setPeriod(key as Period)}
                aria-pressed={key === period}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {chart.length === 1 ? (
            <div
              className="flex flex-col justify-between gap-4 rounded-2xl border border-glass-border bg-glass-light-bg p-5"
              role="img"
              aria-label={`Gráfico histórico de ${a.ticker}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cotação única registrada no período ·{" "}
                  {new Date(chart[0].timestamp).toLocaleString("pt-BR")}
                </span>
                <span className="badge badge-primary">1 registro no período</span>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Preço registrado</p>
                <p className="metric-value mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
                  {money(String(chart[0].price), a.currency === "POINTS")}
                </p>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Apenas um ponto de cotação está disponível para este intervalo. O gráfico de curva
                histórica é traçado automaticamente a partir do segundo registro.
              </p>
            </div>
          ) : chart.length > 1 ? (
            <div
              className="h-64 min-w-0"
              role="img"
              aria-label={`Gráfico histórico de ${a.ticker}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chart}
                  margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="3 5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    }
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    minTickGap={35}
                  />
                  <YAxis
                    width={65}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => number(String(v))}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    labelFormatter={(v) => new Date(Number(v)).toLocaleString("pt-BR")}
                    formatter={(v) => [
                      money(String(v), a.currency === "POINTS"),
                      "Preço",
                    ]}
                    contentStyle={{
                      background: "var(--glass-overlay-surface)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 14,
                      boxShadow: "var(--shadow-elevated)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.16}
                    strokeWidth={2.25}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sem preços salvos neste período. Configure a fonte automática ou registre um preço
              manual.
            </p>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {result.data?.historyNote} Pontos exibidos: {chart.length}.
        </p>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold tracking-tight">Últimos preços salvos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-glass-light-bg text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Data e hora</th>
                <th className="px-5 py-3.5 font-semibold">Preço</th>
                <th className="px-5 py-3.5 font-semibold">Fonte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(result.data?.history || [])
                .slice(-12)
                .reverse()
                .map((p, i) => (
                  <tr key={`${p.timestamp}-${i}`} className="transition-colors hover:bg-muted/35">
                    <td className="px-5 py-3.5 tabular">{timestamp(p.timestamp)}</td>
                    <td className="px-5 py-3.5 font-semibold tabular">
                      {money(p.price, a.currency === "POINTS")}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge">{p.source}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {a.type !== "cripto" && a.type !== "indices" && (
        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-semibold tracking-tight">
            Dividendos informados pelo provedor
          </h2>
          {dividends.length ? (
            <div className="mt-3 divide-y divide-border">
              {dividends.map((d, i) => (
                <div
                  key={i}
                  className="flex flex-wrap justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <span className="font-medium text-foreground">
                    {d.label || "Provento"} · {d.paymentDate?.slice(0, 10)}
                  </span>
                  <span className="font-semibold tabular text-gain">
                    {money(d.rate)} por unidade
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum dividendo disponível nesta consulta.
            </p>
          )}
        </section>
      )}

      <Sources />
      {actions.dialogs}
    </div>
  );
}
