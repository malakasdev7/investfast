"use client";

import { useState, useMemo } from "react";
import {
  Calculator as CalcIcon,
  TrendingUp,
  Coins,
  Sparkles,
  Info,
  Percent,
  CircleDollarSign,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Scale,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/csv";
import { today } from "@/lib/domain";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ratePresets = [
  { label: "CDI 100%", rate: 10.75, desc: "Renda fixa básica pós-fixada" },
  { label: "Tesouro IPCA+", rate: 11.5, desc: "Proteção inflacionária + juro real" },
  { label: "Ações & FIIs", rate: 12.0, desc: "Renda variável histórica moderada" },
  { label: "Poupança", rate: 6.17, desc: "Rendimento tradicional conservador" },
];

export function InvestmentCalculator() {
  const [initialAmount, setInitialAmount] = useState<number>(5000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(500);
  const [periodYears, setPeriodYears] = useState<number>(10);
  const [annualRate, setAnnualRate] = useState<number>(10.75);
  const [inflationRate, setInflationRate] = useState<number>(4.0);
  const [adjustInflation, setAdjustInflation] = useState<boolean>(false);
  const [showTooltipInfo, setShowTooltipInfo] = useState<string | null>(null);
  const [showTable, setShowTable] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Cálculo de Juros Compostos Mês a Mês
  const calculation = useMemo(() => {
    const totalMonths = Math.max(1, Math.round(periodYears * 12));
    const effectiveAnnualRate = adjustInflation
      ? ((1 + annualRate / 100) / (1 + inflationRate / 100) - 1) * 100
      : annualRate;

    const monthlyRate = Math.pow(1 + Math.max(0, effectiveAnnualRate) / 100, 1 / 12) - 1;
    const poupancaMonthlyRate = Math.pow(1 + 0.0617, 1 / 12) - 1;

    let currentBalance = initialAmount;
    let poupancaBalance = initialAmount;
    let totalInvested = initialAmount;

    const historyData: Array<{
      period: string;
      year: number;
      invested: number;
      interest: number;
      total: number;
      poupanca: number;
    }> = [];

    const detailedTable: Array<{
      year: number;
      invested: number;
      interestEarnedYear: number;
      interestTotal: number;
      finalBalance: number;
    }> = [];

    // Ano 0 (Início)
    historyData.push({
      period: "Início",
      year: 0,
      invested: Math.round(initialAmount),
      interest: 0,
      total: Math.round(initialAmount),
      poupanca: Math.round(initialAmount),
    });

    let lastYearBalance = initialAmount;

    for (let m = 1; m <= totalMonths; m++) {
      const monthInterest = currentBalance * monthlyRate;
      currentBalance += monthInterest + monthlyContribution;

      const poupancaMonthInterest = poupancaBalance * poupancaMonthlyRate;
      poupancaBalance += poupancaMonthInterest + monthlyContribution;

      totalInvested += monthlyContribution;

      // Salva no gráfico a cada 12 meses ou no último mês
      if (m % 12 === 0 || m === totalMonths) {
        const yearNumber = Math.ceil(m / 12);
        const yearInterest = currentBalance - lastYearBalance - monthlyContribution * 12;

        historyData.push({
          period: `Ano ${yearNumber}`,
          year: yearNumber,
          invested: Math.round(totalInvested),
          interest: Math.round(Math.max(0, currentBalance - totalInvested)),
          total: Math.round(currentBalance),
          poupanca: Math.round(poupancaBalance),
        });

        detailedTable.push({
          year: yearNumber,
          invested: Math.round(totalInvested),
          interestEarnedYear: Math.round(Math.max(0, yearInterest)),
          interestTotal: Math.round(Math.max(0, currentBalance - totalInvested)),
          finalBalance: Math.round(currentBalance),
        });

        lastYearBalance = currentBalance;
      }
    }

    const totalInterest = Math.max(0, currentBalance - totalInvested);
    const monthlyPassiveIncome = currentBalance * (Math.pow(1 + annualRate / 100, 1 / 12) - 1);
    const differenceVsPoupanca = Math.max(0, currentBalance - poupancaBalance);

    return {
      totalFinal: currentBalance,
      totalInvested,
      totalInterest,
      poupancaFinal: poupancaBalance,
      differenceVsPoupanca,
      monthlyPassiveIncome,
      historyData,
      detailedTable,
      profitabilityRate: totalInvested > 0 ? (totalInterest / totalInvested) * 100 : 0,
    };
  }, [initialAmount, monthlyContribution, periodYears, annualRate, inflationRate, adjustInflation]);

  const handleExportCsv = () => {
    const rows = calculation.detailedTable.map((row) => ({
      Ano: `Ano ${row.year}`,
      "Total Aportado (R$)": row.invested.toFixed(2),
      "Rendimento no Ano (R$)": row.interestEarnedYear.toFixed(2),
      "Juros Acumulados (R$)": row.interestTotal.toFixed(2),
      "Saldo Acumulado (R$)": row.finalBalance.toFixed(2),
    }));
    downloadCsv(`investfast-simulacao-investimentos-${today()}.csv`, rows);
    toast.success("Simulação exportada em CSV com sucesso!");
  };

  const handleCopySummary = () => {
    const text = `Simulação de Investimentos · InvestFast\n\n- Aporte inicial: ${formatCurrency(
      initialAmount
    )}\n- Aporte mensal: ${formatCurrency(monthlyContribution)}\n- Prazo: ${periodYears} anos (${
      periodYears * 12
    } meses)\n- Taxa anual: ${annualRate}%\n\nResultado Final:\n- Total Investido: ${formatCurrency(
      calculation.totalInvested
    )}\n- Juros Compostos: ${formatCurrency(
      calculation.totalInterest
    )}\n- Montante Final: ${formatCurrency(
      calculation.totalFinal
    )}\n- Renda Passiva Estimada: ${formatCurrency(
      calculation.monthlyPassiveIncome
    )}/mês\n- Ganho extra vs Poupança: +${formatCurrency(calculation.differenceVsPoupanca)}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Resumo copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header da Calculadora */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <CalcIcon className="size-4" />
            <span>Simulador de Independência Financeira</span>
          </div>
          <h1 className="page-heading mt-1">Calculadora de Investimentos</h1>
          <p className="subheading">
            Projete o efeito multiplicador dos juros compostos, compare com a poupança e planeje sua renda passiva.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleCopySummary} className="h-9 gap-1.5 text-xs">
            {copied ? <Check className="size-3.5 text-gain" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Copiado!" : "Copiar resumo"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-9 gap-1.5 text-xs">
            <Download className="size-3.5" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Painel de Parâmetros e Inputs (5 cols no Desktop) */}
        <div className="space-y-5 lg:col-span-5">
          {/* Seção 1: Aportes */}
          <section className="card p-5 sm:p-6" aria-labelledby="section-contributions">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 id="section-contributions" className="text-sm font-semibold tracking-tight">
                1. Valores & Aportes
              </h2>
              <span className="badge">Passo 1</span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="initial-amount" className="field-label">
                    Valor inicial (R$)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowTooltipInfo(
                        showTooltipInfo === "initial"
                          ? null
                          : "Valor que você tem disponível para aplicar hoje, logo no início."
                      )
                    }
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Ajuda sobre valor inicial"
                  >
                    <Info className="size-3.5" />
                  </button>
                </div>
                {showTooltipInfo === "initial" && (
                  <p className="mt-1 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                    Valor que você já possui guardado ou aplicará no primeiro mês.
                  </p>
                )}
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    R$
                  </span>
                  <input
                    id="initial-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="500"
                    placeholder="Ex: 5.000"
                    value={initialAmount || ""}
                    onChange={(e) => setInitialAmount(Number(e.target.value) || 0)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="monthly-contribution" className="field-label">
                    Aporte mensal (R$)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setShowTooltipInfo(
                        showTooltipInfo === "monthly"
                          ? null
                          : "Valor poupado e reinvestido religiosamente todos os meses."
                      )
                    }
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Ajuda sobre aporte mensal"
                  >
                    <Info className="size-3.5" />
                  </button>
                </div>
                {showTooltipInfo === "monthly" && (
                  <p className="mt-1 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                    O hábito mais poderoso na construção de patrimônio. Aportes consistentes superam o tempo de mercado.
                  </p>
                )}
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    R$
                  </span>
                  <input
                    id="monthly-contribution"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="100"
                    placeholder="Ex: 500"
                    value={monthlyContribution || ""}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="period-years" className="field-label">
                    Prazo em anos: <strong className="text-foreground">{periodYears} ano(s)</strong>
                  </label>
                  <span className="text-xs text-muted-foreground">{periodYears * 12} meses</span>
                </div>
                <input
                  id="period-years"
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={periodYears}
                  onChange={(e) => setPeriodYears(Number(e.target.value))}
                  className="mt-2.5 w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1 ano</span>
                  <span>10 anos</span>
                  <span>20 anos</span>
                  <span>40 anos</span>
                </div>
              </div>
            </div>
          </section>

          {/* Seção 2: Rentabilidade & Indexador */}
          <section className="card p-5 sm:p-6" aria-labelledby="section-rates">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 id="section-rates" className="text-sm font-semibold tracking-tight">
                2. Rentabilidade & Cenários
              </h2>
              <span className="badge">Passo 2</span>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="annual-rate" className="field-label">
                  Taxa anual estimada (%)
                </label>
                <div className="relative mt-1">
                  <input
                    id="annual-rate"
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    min="0"
                    max="100"
                    placeholder="Ex: 10.75"
                    value={annualRate || ""}
                    onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
                    className="input pr-8"
                  />
                  <Percent className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Atalhos de mercado recomendados:
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {ratePresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setAnnualRate(preset.rate)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left text-xs transition-all",
                        annualRate === preset.rate
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{preset.label}</span>
                        <span className="text-[11px] font-bold">{preset.rate}%</span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">
                        {preset.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ajuste Opcional de Inflação */}
              <div className="border-t pt-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-medium text-foreground">
                    Descontar inflação estimada (Poder Real)
                  </span>
                  <input
                    type="checkbox"
                    checked={adjustInflation}
                    onChange={(e) => setAdjustInflation(e.target.checked)}
                    className="size-4 accent-primary rounded"
                  />
                </label>
                {adjustInflation && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">IPCA estimado a.a.:</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min="0"
                      max="30"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Number(e.target.value) || 0)}
                      className="input h-8 w-20 py-1 text-xs m-0"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Painel de Resultados & Gráfico (7 cols no Desktop) */}
        <div className="space-y-5 lg:col-span-7">
          {/* Cards de Métricas de Destaque */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2">
            {/* Total Acumulado (Card Hero) */}
            <div className="hero-metric col-span-2 rounded-2xl border p-5 sm:p-6 transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Montante Final {adjustInflation ? "(Poder Real)" : "Acumulado"}
                </span>
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white">
                  <Sparkles className="size-4" />
                </span>
              </div>
              <p className="metric-value mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {formatCurrency(calculation.totalFinal)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span>Rendimento total de {calculation.profitabilityRate.toFixed(1)}%</span>
                <span>•</span>
                <span>em {periodYears} anos</span>
                {adjustInflation && <span>(Descontando {inflationRate}% IPCA)</span>}
              </div>
            </div>

            {/* Total Investido */}
            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Total Investido</span>
                <span className="rounded-lg bg-muted p-1.5 text-muted-foreground">
                  <Coins className="size-4" />
                </span>
              </div>
              <p className="metric-value mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                {formatCurrency(calculation.totalInvested)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tirado do bolso (Aportes)
              </p>
            </div>

            {/* Juros Acumulados */}
            <div className="card p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Juros Compostos</span>
                <span className="rounded-lg bg-gain/10 text-gain p-1.5">
                  <TrendingUp className="size-4" />
                </span>
              </div>
              <p className="metric-value mt-2 text-xl font-bold tracking-tight text-gain sm:text-2xl">
                +{formatCurrency(calculation.totalInterest)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Dinheiro gerado pelos juros
              </p>
            </div>

            {/* Comparativo de Oportunidade vs Poupança */}
            <div className="card col-span-2 p-4 sm:p-5 border-primary/25 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="size-3.5" />
                    Ganho Extra em Relação à Poupança
                  </span>
                  <p className="metric-value text-2xl font-bold tracking-tight text-gain">
                    +{formatCurrency(calculation.differenceVsPoupanca)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Na Poupança (6,17% a.a.) você acumularia {formatCurrency(calculation.poupancaFinal)}. Com esta estratégia, seu patrimônio cresce {formatCurrency(calculation.differenceVsPoupanca)} a mais!
                  </p>
                </div>
              </div>
            </div>

            {/* Renda Passiva Estimada */}
            <div className="card col-span-2 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Renda Passiva Mensal Estimada no Final
                  </span>
                  <p className="metric-value mt-1 text-2xl font-bold tracking-tight text-primary">
                    {formatCurrency(calculation.monthlyPassiveIncome)}
                    <span className="text-xs font-normal text-muted-foreground"> /mês</span>
                  </p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CircleDollarSign className="size-5" />
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Estimativa de rendimento mensal bruto gerado pelo patrimônio acumulado sem queimar o valor principal.
              </p>
            </div>
          </div>

          {/* Gráfico de Evolução dos Juros */}
          <section className="card p-5 sm:p-6" aria-labelledby="chart-title">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 id="chart-title" className="text-sm font-semibold tracking-tight">
                  Evolução do Patrimônio Ano a Ano
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Aporte acumulado vs Efeito multiplicador dos juros
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTable((v) => !v)}
                className="h-8 gap-1.5 text-xs"
              >
                <TableIcon className="size-3.5" />
                <span>{showTable ? "Ocultar tabela" : "Ver tabela"}</span>
                {showTable ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </Button>
            </div>

            <div className="mt-4 h-72 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={calculation.historyData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 4"
                    vertical={false}
                    stroke="var(--border)"
                    opacity={0.7}
                  />
                  <XAxis
                    dataKey="period"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tick={{ fill: "var(--muted-foreground)" }}
                    dy={6}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("pt-BR", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(v)
                    }
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tick={{ fill: "var(--muted-foreground)" }}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: 14,
                      color: "var(--foreground)",
                      fontSize: 12,
                    }}
                    formatter={(v) => [formatCurrency(String(v ?? 0)), ""]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 10, color: "var(--muted-foreground)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    name="Total Investido"
                    stackId="1"
                    stroke="#64748b"
                    fill="url(#colorInvested)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="interest"
                    name="Juros Compostos"
                    stackId="1"
                    stroke="#2563eb"
                    fill="url(#colorInterest)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela de Evolução Expandível */}
            {showTable && (
              <div className="mt-5 border-t pt-4">
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Detalhamento Ano a Ano
                  </h3>
                  <Button variant="ghost" size="sm" onClick={handleExportCsv} className="h-7 text-xs">
                    <Download className="size-3 mr-1" />
                    Baixar CSV
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs font-medium text-muted-foreground border-b">
                      <tr>
                        <th className="p-2.5">Ano</th>
                        <th className="p-2.5 text-right">Aportado</th>
                        <th className="p-2.5 text-right">Juros no Ano</th>
                        <th className="p-2.5 text-right">Saldo Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {calculation.detailedTable.map((row) => (
                        <tr key={row.year} className="hover:bg-muted/30">
                          <td className="p-2.5 font-medium">Ano {row.year}</td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">
                            {formatCurrency(row.invested)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-gain">
                            +{formatCurrency(row.interestEarnedYear)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold">
                            {formatCurrency(row.finalBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Dica de Especialista */}
          <div className="card flex items-start gap-3.5 border-primary/20 bg-primary/5 p-4 sm:p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 text-xs leading-relaxed text-muted-foreground">
              <strong className="block font-semibold text-foreground">
                Regra de Ouro do InvestFast:
              </strong>
              Pequenos aumentos no aporte mensal (ex: +R$ 150 a R$ 300) têm um impacto monumental no longo prazo devido à curva exponencial dos juros. Experimente aumentar o valor do seu aporte mensal acima e observe o salto no montante final!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
