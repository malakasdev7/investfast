import { ArrowUpRight, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-surface grid min-h-dvh lg:grid-cols-[1.08fr_1fr]">
      <aside className="auth-art relative hidden overflow-hidden border-r border-glass-border p-12 text-foreground lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="relative z-10 flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="brand-mark flex size-9 items-center justify-center rounded-xl">
            <ArrowUpRight className="size-5" />
          </span>
          <span>InvestFast</span>
        </div>

        <div className="relative z-10 my-auto py-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Mais clareza · Mais possibilidades
          </p>
          <h2 className="max-w-lg text-4xl font-semibold leading-[1.14] tracking-tight text-foreground xl:text-5xl">
            O controle de hoje.
            <br />
            <span className="text-primary">A liberdade de amanhã.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Suas contas, investimentos e objetivos em um único painel. Decisões
            patrimoniais mais claras, sem ruído.
          </p>
          <div className="glass-content mt-10 max-w-md rounded-2xl p-6">
            <div className="mb-3 flex items-center gap-2.5">
              <ChartNoAxesCombined className="size-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Cada passo faz diferença.</p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Organize o fluxo mensal, consolide sua carteira e acompanhe a evolução do seu
              patrimônio em tempo real.
            </p>
          </div>
        </div>

        <p className="relative z-10 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Seus dados pertencem exclusivamente a você, protegidos com isolamento por usuário.
        </p>
      </aside>

      <section className="flex flex-col justify-between px-4 py-6 sm:px-8 md:px-12 lg:px-14">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-base font-semibold tracking-tight lg:invisible">
            <span className="brand-mark flex size-8 items-center justify-center rounded-xl">
              <ArrowUpRight className="size-4" />
            </span>
            <span>InvestFast</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-6 sm:py-10">
          <div className="glass-content w-full rounded-3xl p-6 sm:p-8">
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
