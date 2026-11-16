import { ArrowUpRight, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-surface grid min-h-dvh lg:grid-cols-2">
      <aside className="auth-art relative hidden overflow-hidden p-14 text-slate-100 lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="brand-mark flex size-9 items-center justify-center rounded-xl">
            <ArrowUpRight className="size-5" />
          </span>
          InvestFast
        </div>

        <div className="relative z-10">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300">
            Mais clareza. Mais possibilidades.
          </p>
          <h2 className="max-w-lg text-4xl font-semibold leading-[1.15] tracking-tight text-white xl:text-5xl">
            O controle de hoje.
            <br />
            <span className="text-blue-300">A liberdade de amanhã.</span>
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">
            Suas contas, investimentos e objetivos em um único painel. Decisões
            patrimoniais mais claras, sem ruído.
          </p>
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xs">
            <ChartNoAxesCombined className="mb-3.5 size-5 text-blue-300" />
            <p className="text-sm font-semibold text-white">Cada passo faz diferença.</p>
            <p className="mt-1.5 text-xs leading-5 text-slate-300">
              Organize o fluxo mensal e acompanhe a evolução do seu patrimônio em
              tempo real.
            </p>
          </div>
        </div>

        <p className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="size-4 text-blue-300" />
          Seus dados pertencem exclusivamente a você.
        </p>
      </aside>

      <section className="flex flex-col px-6 py-8 md:px-16">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight lg:invisible">
            <span className="brand-mark flex size-8 items-center justify-center rounded-xl">
              <ArrowUpRight className="size-4" />
            </span>
            InvestFast
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-8 sm:py-12">
          <div className="w-full">
            <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
              {children}
            </Suspense>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          InvestFast · Finanças pessoais e investimentos
        </p>
      </section>
    </main>
  );
}
