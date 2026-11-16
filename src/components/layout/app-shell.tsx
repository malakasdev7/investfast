"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  Target,
  ChartPie,
  Lightbulb,
  Settings,
  Tags,
  Receipt,
  Repeat,
  Menu,
  LogOut,
  X,
  ChevronRight,
  Bell,
  Plus,
  Coins,
  PiggyBank,
  TrendingUp,
  Calculator,
  Scale,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/forms/record-form";
import { api, useFinances } from "@/hooks/use-finances";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navigation = [
  { label: "Visão geral", href: "/dashboard", Icon: LayoutDashboard },
  { label: "Mercado", href: "/mercado", Icon: TrendingUp },
  { label: "Contas", href: "/contas", Icon: Wallet },
  { label: "Transações", href: "/transacoes", Icon: ArrowLeftRight },
  { label: "Orçamentos", href: "/orcamentos", Icon: Receipt },
  { label: "Categorias", href: "/categorias", Icon: Tags },
  { label: "Recorrências", href: "/recorrencias", Icon: Repeat },
  { label: "Investimentos", href: "/investimentos", Icon: ChartNoAxesCombined },
  { label: "Carteiras", href: "/carteiras", Icon: BriefcaseBusiness },
  { label: "Metas", href: "/metas", Icon: Target },
  { label: "Relatórios", href: "/relatorios", Icon: ChartPie },
  { label: "Análises", href: "/analises", Icon: Lightbulb },
  { label: "Calculadora", href: "/calculadora", Icon: Calculator },
  { label: "Posso comprar?", href: "/posso-comprar", Icon: Scale },
  { label: "Assistente IA", href: "/assistente", Icon: Sparkles },
];

const navGroups = [
  {
    title: "Dia a dia",
    items: [
      { label: "Visão geral", desc: "Resumo e indicadores", href: "/dashboard", Icon: LayoutDashboard },
      { label: "Transações", desc: "Receitas, despesas e extratos", href: "/transacoes", Icon: ArrowLeftRight },
      { label: "Contas", desc: "Saldos bancários e cartões", href: "/contas", Icon: Wallet },
      { label: "Orçamentos", desc: "Limites de gastos mensais", href: "/orcamentos", Icon: Receipt },
      { label: "Recorrências", desc: "Contas fixas e assinaturas", href: "/recorrencias", Icon: Repeat },
      { label: "Categorias", desc: "Organização de lançamentos", href: "/categorias", Icon: Tags },
    ],
  },
  {
    title: "Patrimônio & Mercado",
    items: [
      { label: "Investimentos", desc: "Ativos e posições consolidadas", href: "/investimentos", Icon: ChartNoAxesCombined },
      { label: "Operações", desc: "Compras, vendas e proventos", href: "/operacoes", Icon: Coins },
      { label: "Cotações", desc: "Histórico manual de preços", href: "/cotacoes", Icon: TrendingUp },
      { label: "Carteiras", desc: "Estratégias e alocação", href: "/carteiras", Icon: BriefcaseBusiness },
      { label: "Mercado", desc: "Bolsa, FIIs e criptomoedas", href: "/mercado", Icon: TrendingUp },
    ],
  },
  {
    title: "Planejamento & Inteligência",
    items: [
      { label: "Assistente IA", desc: "Copiloto financeiro inteligente", href: "/assistente", Icon: Sparkles },
      { label: "Posso comprar?", desc: "Avalie se um ativo cabe na carteira", href: "/posso-comprar", Icon: Scale },
      { label: "Calculadora", desc: "Simulador de juros compostos e aportes", href: "/calculadora", Icon: Calculator },
      { label: "Análises", desc: "Diagnóstico e recomendações", href: "/analises", Icon: Lightbulb },
      { label: "Metas", desc: "Objetivos e reservas", href: "/metas", Icon: Target },
      { label: "Aportes", desc: "Depósitos nas suas metas", href: "/aportes", Icon: PiggyBank },
      { label: "Relatórios", desc: "Gráficos e exportação CSV", href: "/relatorios", Icon: ChartPie },
    ],
  },
];

const subRoutes: Record<string, { label: string; group: string }> = {
  "/operacoes": { label: "Operações", group: "/investimentos" },
  "/cotacoes": { label: "Cotações", group: "/investimentos" },
  "/aportes": { label: "Aportes", group: "/metas" },
  "/configuracoes": { label: "Configurações", group: "/configuracoes" },
};

function isRouteActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/dashboard" && pathname.startsWith(href + "/")) return true;
  if (href === "/transacoes" && pathname === "/recorrencias") return true;
  if (href === "/investimentos" && ["/operacoes", "/cotacoes", "/carteiras"].includes(pathname)) return true;
  if (href === "/metas" && pathname === "/aportes") return true;
  return false;
}

export function AppShell({
  children,
  name,
  email,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
}) {
  const path = usePathname();
  const router = useRouter();
  const cache = useQueryClient();
  const { data } = useFinances();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickEntity, setQuickEntity] = useState<{ entity: string; title: string } | null>(null);

  useEffect(() => {
    if (!menuOpen && !quickOpen) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setQuickOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, quickOpen]);

  const current =
    navigation.find(
      (n) => n.href === path || (n.href !== "/dashboard" && path.startsWith(n.href + "/")),
    )?.label ||
    subRoutes[path]?.label ||
    "InvestFast";

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
      cache.clear();
      router.replace("/login");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const dockTabs = [
    { label: "Início", href: "/dashboard", Icon: LayoutDashboard },
    { label: "Transações", href: "/transacoes", Icon: ArrowLeftRight },
    { label: "Investir", href: "/investimentos", Icon: ChartNoAxesCombined },
    { label: "IA", href: "/assistente", Icon: Sparkles },
  ];

  const isMoreActive = !dockTabs.some((t) => isRouteActive(path, t.href));

  const sidebarGroups = [
    {
      title: "Principal",
      items: [
        { label: "Visão geral", href: "/dashboard", Icon: LayoutDashboard },
        { label: "Transações", href: "/transacoes", Icon: ArrowLeftRight },
        { label: "Contas", href: "/contas", Icon: Wallet },
        { label: "Investimentos", href: "/investimentos", Icon: ChartNoAxesCombined },
        { label: "Mercado", href: "/mercado", Icon: TrendingUp },
      ],
    },
    {
      title: "Inteligência & Decisão",
      items: [
        { label: "Assistente IA", href: "/assistente", Icon: Sparkles },
        { label: "Posso comprar?", href: "/posso-comprar", Icon: Scale },
        { label: "Calculadora", href: "/calculadora", Icon: Calculator },
        { label: "Análises", href: "/analises", Icon: Lightbulb },
      ],
    },
    {
      title: "Planejamento & Controle",
      items: [
        { label: "Metas", href: "/metas", Icon: Target },
        { label: "Orçamentos", href: "/orcamentos", Icon: Receipt },
        { label: "Recorrências", href: "/recorrencias", Icon: Repeat },
        { label: "Relatórios", href: "/relatorios", Icon: ChartPie },
        { label: "Categorias", href: "/categorias", Icon: Tags },
      ],
    },
  ];

  const initials = (name || email || "IF").slice(0, 2).toUpperCase();

  const sidebar = (
    <>
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
          <span className="brand-mark flex size-8 items-center justify-center rounded-xl">
            <ArrowUpRight className="size-4 stroke-[2.25]" />
          </span>
          <span className="tracking-tight text-foreground">InvestFast</span>
        </Link>
      </div>

      <div className="px-4 pt-3.5 pb-2">
        <Button
          type="button"
          onClick={() => setQuickEntity({ entity: "transactions", title: "Nova transação" })}
          className="w-full justify-center"
        >
          <Plus className="size-4" />
          Novo lançamento
        </Button>
      </div>

      <nav aria-label="Navegação principal" className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-2.5">
        {sidebarGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {group.title}
            </div>
            {group.items.map(({ label, href, Icon }) => {
              const active = isRouteActive(path, href);
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  key={href}
                  href={href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm transition-colors duration-150",
                    active
                      ? "glass-nav-active font-semibold text-foreground"
                      : "font-medium text-muted-foreground hover:bg-glass-light-bg hover:text-foreground",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
                    />
                  )}
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border p-3">
        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            path === "/configuracoes"
              ? "glass-nav-active font-semibold text-foreground"
              : "text-muted-foreground hover:bg-glass-light-bg hover:text-foreground",
          )}
        >
          <Settings className="size-4 shrink-0" />
          Configurações
        </Link>
        <button
          onClick={logout}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-loss/10 hover:text-loss"
        >
          <LogOut className="size-4 shrink-0" />
          Sair da conta
        </button>
      </div>
    </>
  );

  return (
    <div className="app-canvas min-h-dvh">
      {/* Sidebar com material glass-navigation */}
      <aside className="app-sidebar glass-navigation fixed inset-y-0 left-0 z-30 hidden w-60 flex-col lg:flex">
        {sidebar}
      </aside>

      <div className="lg:pl-60">
        {/* Header limpo com material glass-navigation */}
        <header className="app-header glass-navigation sticky top-0 z-20 flex h-14 items-center justify-between gap-3 px-4 md:h-16 md:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 lg:hidden"
              aria-label="Início InvestFast"
            >
              <span className="brand-mark flex size-8 items-center justify-center rounded-xl">
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
            <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
              InvestFast
            </span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground/60 sm:block" />
            <span className="truncate text-sm font-semibold tracking-tight text-foreground md:text-base">
              {current}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/assistente"
              aria-label="Assistente IA"
              className={cn(
                "hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors sm:inline-flex",
                path === "/assistente"
                  ? "glass-nav-active font-semibold text-primary"
                  : "glass-control text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="size-3.5 text-primary" />
              Assistente IA
            </Link>

            <Link
              href="/analises"
              aria-label="Ver alertas e análises"
              title="Diagnóstico e alertas"
              className={cn(
                "glass-control flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-foreground",
                path === "/analises" && "glass-nav-active text-primary",
              )}
            >
              <Bell className="size-4" />
            </Link>

            <ThemeToggle />

            <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" />

            <Link
              href="/configuracoes"
              className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-muted/50"
            >
              <span className="flex size-8 items-center justify-center rounded-full border border-primary/30 bg-primary/12 text-xs font-semibold text-primary">
                {initials}
              </span>
              <span className="hidden text-xs font-medium text-foreground xl:block">
                {name || "Minha conta"}
              </span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full min-w-0 max-w-[1480px] px-4 pt-6 pb-[calc(6.5rem_+_env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Quick Action Bottom Sheet (Mobile) com glass-overlay */}
      {quickOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setQuickOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Novo lançamento rápido"
            onClick={(e) => e.stopPropagation()}
            className="glass-overlay fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-glass-border p-5 pb-[calc(5.5rem_+_env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Ação rápida</h2>
                <p className="text-xs text-muted-foreground">O que você deseja registrar agora?</p>
              </div>
              <button
                onClick={() => setQuickOpen(false)}
                aria-label="Fechar ações rápidas"
                className="rounded-full bg-muted/80 p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  entity: "transactions",
                  title: "Nova transação",
                  desc: "Receita, despesa ou transferência",
                  Icon: ArrowLeftRight,
                },
                {
                  entity: "investment_transactions",
                  title: "Nova operação",
                  desc: "Compra, venda ou provento",
                  Icon: Coins,
                },
                {
                  entity: "accounts",
                  title: "Nova conta",
                  desc: "Banco, corretora ou carteira",
                  Icon: Wallet,
                },
                {
                  entity: "goal_contributions",
                  title: "Novo aporte",
                  desc: "Guardar dinheiro em uma meta",
                  Icon: PiggyBank,
                },
              ].map((item) => (
                <button
                  key={item.entity}
                  onClick={() => {
                    setQuickOpen(false);
                    setQuickEntity({ entity: item.entity, title: item.title });
                  }}
                  className="glass-content flex cursor-pointer flex-col items-start rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] hover:border-border-strong"
                >
                  <span className="mb-2 rounded-xl border border-glass-border bg-glass-light-bg p-2 text-primary">
                    <item.Icon className="size-4" />
                  </span>
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="mt-0.5 text-xs leading-4 text-muted-foreground">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Full Hub Menu Sheet ("Menu / Mais") com glass-overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu completo"
            onClick={(e) => e.stopPropagation()}
            className="glass-overlay fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] flex-col rounded-t-3xl border-t border-glass-border"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/12 text-sm font-semibold text-primary">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{name || "Minha conta"}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Fechar menu"
                className="rounded-full bg-muted/80 p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-[calc(6rem_+_env(safe-area-inset-bottom))]">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map(({ label, desc, href, Icon }) => {
                      const active = path === href || (href !== "/dashboard" && path.startsWith(href + "/"));
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex items-start gap-2.5 rounded-2xl border p-3 transition-all active:scale-[0.98]",
                            active
                              ? "border-primary/40 bg-primary/14 text-foreground"
                              : "border-glass-border bg-glass-light-bg hover:border-border-strong",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 rounded-xl p-2",
                              active
                                ? "glass-nav-active text-primary"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-foreground">
                              {label}
                            </span>
                            <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                              {desc}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="border-t border-border pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/configuracoes"
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-semibold transition-colors",
                      path === "/configuracoes"
                        ? "border-primary/40 bg-primary/14 text-primary"
                        : "border-glass-border bg-glass-light-bg text-foreground hover:border-border-strong",
                    )}
                  >
                    <Settings className="size-4" />
                    Configurações
                  </Link>
                  <button
                    onClick={logout}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-loss/25 bg-loss/10 py-3 text-xs font-semibold text-loss transition-colors hover:bg-loss/15"
                  >
                    <LogOut className="size-4" />
                    Sair da conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {quickEntity && data && (
        <Dialog title={quickEntity.title} onClose={() => setQuickEntity(null)}>
          <RecordForm
            entity={quickEntity.entity}
            data={data}
            onDone={() => setQuickEntity(null)}
          />
        </Dialog>
      )}

      {/* Bottom Mobile Dock Navigation com glass-navigation */}
      <nav
        aria-label="Navegação inferior no celular"
        className="mobile-dock fixed inset-x-0 bottom-0 z-50 px-2 pt-1.5 lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-6 items-center gap-0.5">
          {dockTabs.slice(0, 2).map(({ href, label, Icon }) => {
            const active = !menuOpen && !quickOpen && isRouteActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  setMenuOpen(false);
                  setQuickOpen(false);
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-colors",
                  active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-0.5 h-0.5 w-5 rounded-full bg-primary" />}
                <Icon className="size-5" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}

          <div className="flex items-center justify-center">
            <button
              type="button"
              aria-label="Novo registro rápido"
              aria-expanded={quickOpen}
              onClick={() => {
                setMenuOpen(false);
                setQuickOpen((v) => !v);
              }}
              className={cn(
                "brand-mark flex size-11 cursor-pointer items-center justify-center rounded-2xl shadow-md transition-transform active:scale-95",
                quickOpen && "rotate-45",
              )}
            >
              <Plus className="size-5 stroke-[2.5]" />
            </button>
          </div>

          {dockTabs.slice(2, 4).map(({ href, label, Icon }) => {
            const active = !menuOpen && !quickOpen && isRouteActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  setMenuOpen(false);
                  setQuickOpen(false);
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-colors",
                  active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-0.5 h-0.5 w-5 rounded-full bg-primary" />}
                <Icon className="size-5" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-expanded={menuOpen}
            onClick={() => {
              setQuickOpen(false);
              setMenuOpen((v) => !v);
            }}
            className={cn(
              "relative flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-colors",
              menuOpen || isMoreActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {(menuOpen || isMoreActive) && (
              <span className="absolute top-0.5 h-0.5 w-5 rounded-full bg-primary" />
            )}
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
