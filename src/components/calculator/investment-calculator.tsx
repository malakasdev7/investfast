"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calculator,
  Download,
  BookmarkPlus,
  Trash2,
  WandSparkles,
  Scale,
  Sparkles,
  Copy,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, useFinances } from "@/hooks/use-finances";
import {
  calculateCompoundInterest,
  calculateFinancialGoal,
  calculateFinancialIndependence,
  calculateRealReturn,
  compareCustomInvestments,
  calculateFixedIncomeAndComparator,
  calculatePortfolioRebalance,
  calculateDebtPayoff,
  calculateStocksFiisSnowball,
  calculateCryptoScenarios,
  type CalculatorType,
  type ComparableInvestmentOption,
  type CompoundingMode,
  type RatePeriod,
  type RebalanceSlice,
  type TermUnit,
} from "@/lib/calculations/calculators";
import { analyzeFinances } from "@/lib/calculations/analytics";
import { today } from "@/lib/domain";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { downloadCsv } from "@/lib/csv";
import { EvolutionChart } from "@/components/charts/finance-charts";
import { Button } from "@/components/ui/button";
import { Loading, Failure } from "@/components/ui/data-state";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";

type SavedSimulation = {
  id: string;
  name: string;
  calculator_type: CalculatorType;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  created_at: string;
};

const TABS: { id: CalculatorType; label: string; desc: string }[] = [
  {
    id: "compound_interest",
    label: "Juros compostos",
    desc: "Evolução patrimonial com juros sobre juros e poder de compra real",
  },
  {
    id: "monthly_contributions",
    label: "Aportes mensais",
    desc: "Aportes constantes com reajuste anual automático pela inflação ou carreira",
  },
  {
    id: "financial_goal",
    label: "Meta financeira",
    desc: "Descubra exatamente quanto aportar por mês para alcançar seu objetivo no prazo",
  },
  {
    id: "financial_independence",
    label: "Independência financeira",
    desc: "Calcule o patrimônio necessário para viver de renda passiva sustentável",
  },
  {
    id: "real_return",
    label: "Rentabilidade real",
    desc: "Desconte a inflação (IPCA) e o Imposto de Renda para ver seu ganho real",
  },
  {
    id: "investment_comparator",
    label: "Comparador",
    desc: "Compare CDB, LCI/LCA isenta, Tesouro IPCA+ e Poupança líquidos de IR",
  },
  {
    id: "portfolio_rebalance",
    label: "Rebalanceamento",
    desc: "Distribua seu próximo aporte para alinhar os pesos ideais da carteira",
  },
  {
    id: "debt_payoff",
    label: "Empréstimos e dívidas",
    desc: "Compare Price vs. SAC e veja quanto economiza com amortizações extras",
  },
  {
    id: "stocks_fiis",
    label: "Ações e FIIs",
    desc: "Efeito bola de neve, número mágico de cotas e Yield on Cost",
  },
  {
    id: "fixed_income",
    label: "Renda fixa",
    desc: "Simulador detalhado de CDB, LCI/LCA e Tesouro com tabela regressiva de IR",
  },
  {
    id: "crypto",
    label: "Criptomoedas",
    desc: "Preço médio (DCA), cenários Bear/Base/Bull e limite prudencial na carteira",
  },
];

const n = (v: string, fallback = 0) => {
  const parsed = Number(String(v).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function InvestmentCalculator({ initialTab }: { initialTab?: string }) {
  const { data, isPending, error, refetch } = useFinances();
  const queryClient = useQueryClient();

  const validTab = TABS.some((t) => t.id === initialTab)
    ? (initialTab as CalculatorType)
    : "compound_interest";

  const [tab, setTab] = useState<CalculatorType>(validTab);
  const [simName, setSimName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados dos simuladores
  const [initialAmount, setInitialAmount] = useState("10000");
  const [monthlyContribution, setMonthlyContribution] = useState("1000");
  const [annualRatePct, setAnnualRatePct] = useState("11.5");
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>("yearly");
  const [annualInflationPct, setAnnualInflationPct] = useState("4.5");
  const [annualStepUpPct, setAnnualStepUpPct] = useState("5");
  const [months, setMonths] = useState("60");
  const [termUnit, setTermUnit] = useState<TermUnit>("months");
  const [compounding, setCompounding] = useState<CompoundingMode>("monthly");
  const [adminFeePct, setAdminFeePct] = useState("0");

  // Meta financeira
  const [goalTarget, setGoalTarget] = useState("100000");
  const [plannedGoalMonthly, setPlannedGoalMonthly] = useState("1500");

  // Independência financeira
  const [desiredIncome, setDesiredIncome] = useState("8000");
  const [swrPct, setSwrPct] = useState("4.5");

  // Rentabilidade real & Renda fixa
  const [taxRatePct, setTaxRatePct] = useState("15");
  const [cdiRate, setCdiRate] = useState("11.25");
  const [selicRate, setSelicRate] = useState("11.25");
  const [cdbPctCdi, setCdbPctCdi] = useState("110");
  const [lciPctCdi, setLciPctCdi] = useState("92");
  const [tesouroSpread, setTesouroSpread] = useState("6.4");
  const [tesouroPrefixado, setTesouroPrefixado] = useState("12.2");

  // Comparador de até 5 investimentos
  const [compareOptions, setCompareOptions] = useState<ComparableInvestmentOption[]>([
    { name: "Tesouro Selic", annualRatePct: 11.25, taxFree: false, adminFeePct: 0.2 },
    { name: "CDB 110% CDI", annualRatePct: 12.38, taxFree: false, adminFeePct: 0 },
    { name: "LCI / LCA 92% CDI", annualRatePct: 10.35, taxFree: true, adminFeePct: 0 },
  ]);

  // Rebalanceamento
  const [rebalanceSlices, setRebalanceSlices] = useState<RebalanceSlice[]>([
    { name: "Renda Fixa / CDI", currentValue: 18000, targetPct: 45 },
    { name: "FIIs", currentValue: 9000, targetPct: 25 },
    { name: "Ações Brasileiras", currentValue: 8000, targetPct: 20 },
    { name: "ETFs / Exterior / Cripto", currentValue: 2000, targetPct: 10 },
  ]);
  const [rebalanceContribution, setRebalanceContribution] = useState("2000");

  // Dívidas
  const [debtPrincipal, setDebtPrincipal] = useState("25000");
  const [debtMonthlyRate, setDebtMonthlyRate] = useState("1.65");
  const [debtMonths, setDebtMonths] = useState("36");
  const [debtExtra, setDebtExtra] = useState("400");

  // Ações e FIIs
  const [sharePrice, setSharePrice] = useState("10.50");
  const [monthlyDivPerShare, setMonthlyDivPerShare] = useState("0.10");
  const [initialShares, setInitialShares] = useState("100");
  const [monthlyNewShares, setMonthlyNewShares] = useState("20");
  const [shareAppreciation, setShareAppreciation] = useState("5.0");
  const [desiredYieldPct, setDesiredYieldPct] = useState("8.0");
  const [reinvestDividends, setReinvestDividends] = useState(true);

  // Criptomoedas
  const [cryptoPrice, setCryptoPrice] = useState("480000");
  const [cryptoInitialBrl, setCryptoInitialBrl] = useState("1500");
  const [cryptoMonthlyDca, setCryptoMonthlyDca] = useState("300");
  const [cryptoTargetPrice, setCryptoTargetPrice] = useState("650000");
  const [cryptoBearPct, setCryptoBearPct] = useState("-35");
  const [cryptoBasePct, setCryptoBasePct] = useState("45");
  const [cryptoBullPct, setCryptoBullPct] = useState("140");

  const simulationsQuery = useQuery({
    queryKey: ["simulations"],
    queryFn: () =>
      api<{ items: SavedSimulation[]; migrationPending?: boolean }>("/api/simulations"),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api("/api/simulations", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      }),
    onSuccess: async () => {
      const wasEditing = Boolean(editingId);
      setSimName("");
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ["simulations"] });
      await queryClient.invalidateQueries({ queryKey: ["finances"] });
      toast.success(wasEditing ? "Simulação atualizada com sucesso." : "Simulação salva com sucesso.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (sim: SavedSimulation) =>
      api("/api/simulations", {
        method: "POST",
        body: JSON.stringify({
          name: `${sim.name} (cópia)`.slice(0, 150),
          calculator_type: sim.calculator_type,
          inputs: sim.inputs,
          results: sim.results,
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["simulations"] });
      toast.success("Simulação duplicada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api("/api/simulations", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
    onSuccess: async (_, deletedId) => {
      if (editingId === deletedId) {
        setEditingId(null);
        setSimName("");
      }
      await queryClient.invalidateQueries({ queryKey: ["simulations"] });
      toast.success("Simulação excluída.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <Loading />;
  if (error || !data)
    return <Failure message={error?.message || "Dados indisponíveis"} retry={() => refetch()} />;

  function prefillFromUserSnapshot() {
    if (!data) return;
    const end = today();
    const start = format(subMonths(new Date(), 1), "yyyy-MM-dd");
    const report = analyzeFinances(data, start, end);

    if (report.summary.wealth > 0) {
      setInitialAmount(String(Math.round(report.summary.wealth)));
    }
    if (report.capacity.safeMonthlyInvestment > 0) {
      const cap = String(Math.round(report.capacity.safeMonthlyInvestment));
      setMonthlyContribution(cap);
      setRebalanceContribution(cap);
    }
    if (report.emergency.monthlyCostReference > 0) {
      setDesiredIncome(String(Math.round(report.emergency.monthlyCostReference)));
      setGoalTarget(String(Math.round(report.emergency.targetSixMonths)));
    }
    if (report.portfolio.byClass.length > 0) {
      const equalWeight = Number((100 / report.portfolio.byClass.length).toFixed(1));
      setRebalanceSlices(
        report.portfolio.byClass.map((c) => ({
          name: c.name,
          currentValue: c.value,
          targetPct: equalWeight,
        })),
      );
    }
    toast.success("Campos preenchidos com os dados reais da sua conta InvestFast.");
  }

  // Resultados calculados sob demanda
  const effectiveMonths = termUnit === "years" ? n(months, 5) * 12 : n(months, 60);

  const compoundResult = calculateCompoundInterest({
    initialAmount: n(initialAmount),
    monthlyContribution: n(monthlyContribution),
    annualRatePct: n(annualRatePct),
    ratePeriod,
    annualInflationPct: n(annualInflationPct),
    months: n(months, 60),
    termUnit,
    compounding,
    taxRatePct: n(taxRatePct),
    adminFeePct: n(adminFeePct),
    annualStepUpPct: tab === "monthly_contributions" ? n(annualStepUpPct) : 0,
  });

  const goalResult = calculateFinancialGoal({
    targetAmount: n(goalTarget),
    currentAmount: n(initialAmount),
    annualRatePct: n(annualRatePct),
    ratePeriod,
    months: n(months, 60),
    termUnit,
    plannedMonthlyContribution: n(plannedGoalMonthly, n(monthlyContribution)),
  });

  const fiResult = calculateFinancialIndependence({
    desiredMonthlyIncome: n(desiredIncome),
    currentPatrimony: n(initialAmount),
    monthlyContribution: n(monthlyContribution),
    annualNominalReturnPct: n(annualRatePct),
    annualInflationPct: n(annualInflationPct),
    safeWithdrawalRateAnnualPct: n(swrPct, 4.5),
  });

  const realReturnResult = calculateRealReturn({
    nominalAnnualPct: n(annualRatePct),
    inflationAnnualPct: n(annualInflationPct),
    taxRatePct: n(taxRatePct),
    adminFeePct: n(adminFeePct),
    amount: n(initialAmount),
    years: Math.max(1, Math.round(effectiveMonths / 12)),
  });

  const customCompareResult = compareCustomInvestments({
    initialAmount: n(initialAmount),
    monthlyContribution: n(monthlyContribution),
    months: effectiveMonths,
    inflationAnnualPct: n(annualInflationPct, 4.5),
    options: compareOptions,
  });

  const comparatorResult = calculateFixedIncomeAndComparator({
    amount: n(initialAmount),
    monthlyContribution: n(monthlyContribution),
    months: effectiveMonths,
    cdiAnnualPct: n(cdiRate, 11.25),
    selicAnnualPct: n(selicRate, 11.25),
    ipcaAnnualPct: n(annualInflationPct, 4.5),
    cdbPctOfCdi: n(cdbPctCdi, 110),
    lciLcaPctOfCdi: n(lciPctCdi, 92),
    tesouroIpcaSpreadPct: n(tesouroSpread, 6.4),
    tesouroPrefixadoPct: n(tesouroPrefixado, 12.2),
  });

  const rebalanceResult = calculatePortfolioRebalance({
    slices: rebalanceSlices,
    newContribution: n(rebalanceContribution),
  });

  const debtResult = calculateDebtPayoff({
    principal: n(debtPrincipal),
    monthlyRatePct: n(debtMonthlyRate),
    months: n(debtMonths, 36),
    extraMonthlyPayment: n(debtExtra),
  });

  const snowballResult = calculateStocksFiisSnowball({
    sharePrice: n(sharePrice, 10.5),
    monthlyDividendPerShare: n(monthlyDivPerShare, 0.1),
    initialShares: n(initialShares, 100),
    monthlyNewShares: n(monthlyNewShares, 20),
    annualPriceAppreciationPct: n(shareAppreciation, 5),
    months: effectiveMonths,
    reinvestDividends,
    desiredAnnualYieldPct: n(desiredYieldPct, 8),
  });

  const cryptoResult = calculateCryptoScenarios({
    currentPriceBrl: n(cryptoPrice, 480000),
    initialInvestmentBrl: n(cryptoInitialBrl, 1500),
    monthlyDcaBrl: n(cryptoMonthlyDca, 300),
    months: effectiveMonths,
    bearChangePct: n(cryptoBearPct, -35),
    baseChangePct: n(cryptoBasePct, 45),
    bullChangePct: n(cryptoBullPct, 140),
    totalPortfolioBrl: n(initialAmount, 20000),
    targetPriceBrl: n(cryptoTargetPrice, 0),
  });

  function loadSimulation(sim: SavedSimulation, editMode = false) {
    setTab(sim.calculator_type);
    const inp = sim.inputs || {};
    if (inp.initialAmount !== undefined) setInitialAmount(String(inp.initialAmount));
    if (inp.monthlyContribution !== undefined) setMonthlyContribution(String(inp.monthlyContribution));
    if (inp.annualRatePct !== undefined) setAnnualRatePct(String(inp.annualRatePct));
    if (inp.ratePeriod === "monthly" || inp.ratePeriod === "yearly") setRatePeriod(inp.ratePeriod);
    if (inp.annualInflationPct !== undefined) setAnnualInflationPct(String(inp.annualInflationPct));
    if (inp.annualStepUpPct !== undefined) setAnnualStepUpPct(String(inp.annualStepUpPct));
    if (inp.months !== undefined) setMonths(String(inp.months));
    if (inp.termUnit === "months" || inp.termUnit === "years") setTermUnit(inp.termUnit);
    if (
      inp.compounding === "monthly" ||
      inp.compounding === "yearly" ||
      inp.compounding === "continuous"
    ) {
      setCompounding(inp.compounding);
    }
    if (inp.taxRatePct !== undefined) setTaxRatePct(String(inp.taxRatePct));
    if (inp.adminFeePct !== undefined) setAdminFeePct(String(inp.adminFeePct));
    if (inp.goalTarget !== undefined) setGoalTarget(String(inp.goalTarget));
    if (inp.plannedGoalMonthly !== undefined) setPlannedGoalMonthly(String(inp.plannedGoalMonthly));
    if (inp.desiredIncome !== undefined) setDesiredIncome(String(inp.desiredIncome));
    if (inp.swrPct !== undefined) setSwrPct(String(inp.swrPct));
    if (inp.cdiRate !== undefined) setCdiRate(String(inp.cdiRate));
    if (inp.selicRate !== undefined) setSelicRate(String(inp.selicRate));
    if (inp.cdbPctCdi !== undefined) setCdbPctCdi(String(inp.cdbPctCdi));
    if (inp.lciPctCdi !== undefined) setLciPctCdi(String(inp.lciPctCdi));
    if (inp.tesouroSpread !== undefined) setTesouroSpread(String(inp.tesouroSpread));
    if (inp.tesouroPrefixado !== undefined) setTesouroPrefixado(String(inp.tesouroPrefixado));
    if (Array.isArray(inp.compareOptions)) {
      setCompareOptions(inp.compareOptions as ComparableInvestmentOption[]);
    }
    if (Array.isArray(inp.rebalanceSlices)) {
      setRebalanceSlices(inp.rebalanceSlices as RebalanceSlice[]);
    }
    if (inp.rebalanceContribution !== undefined) {
      setRebalanceContribution(String(inp.rebalanceContribution));
    }
    if (inp.debtPrincipal !== undefined) setDebtPrincipal(String(inp.debtPrincipal));
    if (inp.debtMonthlyRate !== undefined) setDebtMonthlyRate(String(inp.debtMonthlyRate));
    if (inp.debtMonths !== undefined) setDebtMonths(String(inp.debtMonths));
    if (inp.debtExtra !== undefined) setDebtExtra(String(inp.debtExtra));
    if (inp.sharePrice !== undefined) setSharePrice(String(inp.sharePrice));
    if (inp.monthlyDivPerShare !== undefined) setMonthlyDivPerShare(String(inp.monthlyDivPerShare));
    if (inp.initialShares !== undefined) setInitialShares(String(inp.initialShares));
    if (inp.monthlyNewShares !== undefined) setMonthlyNewShares(String(inp.monthlyNewShares));
    if (inp.shareAppreciation !== undefined) setShareAppreciation(String(inp.shareAppreciation));
    if (inp.desiredYieldPct !== undefined) setDesiredYieldPct(String(inp.desiredYieldPct));
    if (inp.cryptoPrice !== undefined) setCryptoPrice(String(inp.cryptoPrice));
    if (inp.cryptoInitialBrl !== undefined) setCryptoInitialBrl(String(inp.cryptoInitialBrl));
    if (inp.cryptoMonthlyDca !== undefined) setCryptoMonthlyDca(String(inp.cryptoMonthlyDca));
    if (inp.cryptoTargetPrice !== undefined) setCryptoTargetPrice(String(inp.cryptoTargetPrice));
    if (inp.cryptoBearPct !== undefined) setCryptoBearPct(String(inp.cryptoBearPct));
    if (inp.cryptoBasePct !== undefined) setCryptoBasePct(String(inp.cryptoBasePct));
    if (inp.cryptoBullPct !== undefined) setCryptoBullPct(String(inp.cryptoBullPct));

    if (editMode) {
      setEditingId(sim.id);
      setSimName(sim.name);
      toast.info(`Modo edição ativado para "${sim.name}".`);
    } else {
      setEditingId(null);
      toast.success(`Simulação "${sim.name}" carregada.`);
    }
  }

  function handleExportCsv() {
    if (tab === "compound_interest" || tab === "monthly_contributions") {
      downloadCsv(
        `investfast-simulacao-${tab}-${today()}.csv`,
        compoundResult.series.map((p) => ({
          mes: p.month,
          periodo: p.label,
          total_investido: p.invested,
          juros_acumulados: p.interest,
          patrimonio_nominal: p.total,
          poder_de_compra_real: p.realTotal,
        })),
      );
    } else if (tab === "financial_goal") {
      downloadCsv(
        `investfast-meta-${today()}.csv`,
        goalResult.series.map((p) => ({
          mes: p.month,
          periodo: p.label,
          investido: p.invested,
          juros: p.interest,
          total: p.total,
        })),
      );
    } else if (tab === "portfolio_rebalance") {
      downloadCsv(
        `investfast-rebalanceamento-${today()}.csv`,
        rebalanceResult.items.map((item) => ({
          classe: item.name,
          valor_atual: item.currentValue,
          peso_atual_pct: item.currentSharePct,
          peso_alvo_pct: item.targetPct,
          aporte_sugerido: item.suggestedFromContribution,
          peso_pos_aporte_pct: item.afterContributionPct,
        })),
      );
    } else if (tab === "debt_payoff") {
      downloadCsv(
        `investfast-divida-${today()}.csv`,
        debtResult.schedule.map((row) => ({
          mes: row.month,
          saldo_padrao: row.balanceStandard,
          saldo_com_amortizacao_extra: row.balanceWithExtra,
        })),
      );
    } else if (tab === "stocks_fiis") {
      downloadCsv(
        `investfast-acoes-fiis-${today()}.csv`,
        snowballResult.series.map((row) => ({
          mes: row.month,
          cotas_acumuladas: row.shares,
          renda_passiva_mensal: row.monthlyPassiveIncome,
          patrimonio_acumulado: row.patrimony,
        })),
      );
    } else {
      downloadCsv(
        `investfast-comparador-${today()}.csv`,
        comparatorResult.options.map((o) => ({
          investimento: o.name,
          taxa_bruta_anual_pct: o.annualGrossPct,
          total_bruto: o.grossTotal,
          imposto_renda: o.taxAmount,
          total_liquido: o.netTotal,
          lucro_liquido: o.netProfit,
        })),
      );
    }
    toast.success("Arquivo CSV exportado.");
  }

  function handleSaveSimulation() {
    const activeTabInfo = TABS.find((t) => t.id === tab);
    const title =
      simName.trim() || `${activeTabInfo?.label || "Simulação"} · ${formatDate(today())}`;

    const summaryResults =
      tab === "compound_interest" || tab === "monthly_contributions"
        ? {
            finalTotal: compoundResult.finalTotal,
            finalNetTotal: compoundResult.finalNetTotal,
            totalInvested: compoundResult.totalInvested,
            totalInterest: compoundResult.totalInterest,
            totalReturnPct: compoundResult.totalReturnPct,
            annualizedReturnPct: compoundResult.annualizedReturnPct,
            realReturnPct: compoundResult.realReturnPct,
          }
        : tab === "financial_goal"
          ? {
              targetAmount: goalResult.targetAmount,
              requiredMonthlyContribution: goalResult.requiredMonthlyContribution,
              monthsToReachGoal: goalResult.monthsToReachGoal,
            }
          : tab === "financial_independence"
            ? {
                requiredPatrimony: fiResult.requiredPatrimony,
                yearsToIndependence: fiResult.yearsToIndependence,
              }
            : tab === "real_return"
              ? {
                  realAnnualPct: realReturnResult.realAnnualPct,
                  realPurchasingPower: realReturnResult.realPurchasingPower,
                }
              : tab === "investment_comparator"
                ? {
                    winner: customCompareResult.winner?.name ?? "N/A",
                    netTotal: customCompareResult.winner?.netTotal ?? 0,
                  }
              : tab === "debt_payoff"
                ? {
                    priceInstallment: debtResult.priceInstallment,
                    interestSavedWithExtra: debtResult.interestSavedWithExtra,
                  }
                : tab === "stocks_fiis"
                  ? {
                      finalShares: snowballResult.finalShares,
                      finalMonthlyDividend: snowballResult.finalMonthlyDividend,
                      ceilingPrice: snowballResult.ceilingPrice,
                    }
                  : tab === "crypto"
                    ? {
                        totalInvested: cryptoResult.totalInvested,
                        averageCostBrl: cryptoResult.averageCostBrl,
                        exposureInPortfolioPct: cryptoResult.exposureInPortfolioPct,
                      }
                    : {
                        winner: comparatorResult.winner.name,
                        netTotal: comparatorResult.winner.netTotal,
                      };

    saveMutation.mutate({
      name: title,
      calculator_type: tab,
      inputs: {
        initialAmount,
        monthlyContribution,
        annualRatePct,
        ratePeriod,
        annualInflationPct,
        annualStepUpPct,
        months,
        termUnit,
        compounding,
        taxRatePct,
        adminFeePct,
        goalTarget,
        plannedGoalMonthly,
        desiredIncome,
        swrPct,
        cdiRate,
        selicRate,
        cdbPctCdi,
        lciPctCdi,
        tesouroSpread,
        tesouroPrefixado,
        compareOptions,
        rebalanceSlices,
        rebalanceContribution,
        debtPrincipal,
        debtMonthlyRate,
        debtMonths,
        debtExtra,
        sharePrice,
        monthlyDivPerShare,
        initialShares,
        monthlyNewShares,
        shareAppreciation,
        desiredYieldPct,
        cryptoPrice,
        cryptoInitialBrl,
        cryptoMonthlyDca,
        cryptoTargetPrice,
        cryptoBearPct,
        cryptoBasePct,
        cryptoBullPct,
      },
      results: summaryResults,
    });
  }

  const currentTabMeta = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-kicker">
            Planejamento e Simulação
          </p>
          <h1 className="page-heading">Calculadora de Investimentos</h1>
          <p className="subheading">
            Simule juros compostos, independência financeira, renda fixa, FIIs, rebalanceamento e dívidas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={prefillFromUserSnapshot}>
            <WandSparkles className="size-4 text-primary" />
            Preencher com meus dados reais
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/posso-comprar">
              <Scale className="size-4 text-primary" />
              Posso comprar?
            </Link>
          </Button>
        </div>
      </div>

      {/* Navegação dos 10 Módulos da Calculadora */}
      <nav
        aria-label="Módulos da calculadora"
        className="glass-navigation no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border p-1.5 sm:flex-wrap"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              "cursor-pointer shrink-0 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors sm:text-sm",
              tab === item.id
                ? "glass-nav-active font-semibold text-foreground"
                : "text-muted-foreground hover:bg-glass-light-bg hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Painel Principal do Módulo Selecionado */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1.45fr]">
        {/* Coluna de Parâmetros */}
        <section className="card space-y-4 p-5 sm:p-6">
          <div className="border-b border-border pb-3.5">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Calculator className="size-4 text-primary" />
              {currentTabMeta.label}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{currentTabMeta.desc}</p>
          </div>

          {/* 1 & 2. Juros compostos / Aportes mensais */}
          {(tab === "compound_interest" || tab === "monthly_contributions") && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="field-label">
                Valor inicial (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                />
              </label>
              <label className="field-label">
                Aporte mensal (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                />
              </label>
              <label className="field-label">
                Taxa de juros ({ratePeriod === "monthly" ? "% a.m." : "% a.a."})
                <div className="flex gap-1.5">
                  <input
                    className="input tabular m-0 flex-1"
                    inputMode="decimal"
                    value={annualRatePct}
                    onChange={(e) => setAnnualRatePct(e.target.value)}
                  />
                  <select
                    aria-label="Periodicidade da taxa"
                    className="input m-0 w-24 text-xs"
                    value={ratePeriod}
                    onChange={(e) => setRatePeriod(e.target.value as RatePeriod)}
                  >
                    <option value="yearly">Anual</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>
              </label>
              <label className="field-label">
                Prazo ({termUnit === "years" ? "anos" : "meses"})
                <div className="flex gap-1.5">
                  <input
                    className="input tabular m-0 flex-1"
                    inputMode="numeric"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                  />
                  <select
                    aria-label="Unidade do prazo"
                    className="input m-0 w-24 text-xs"
                    value={termUnit}
                    onChange={(e) => setTermUnit(e.target.value as TermUnit)}
                  >
                    <option value="months">Meses</option>
                    <option value="years">Anos</option>
                  </select>
                </div>
              </label>
              <label className="field-label">
                Capitalização
                <select
                  className="input text-xs"
                  value={compounding}
                  onChange={(e) => setCompounding(e.target.value as CompoundingMode)}
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                  <option value="continuous">Contínua</option>
                </select>
              </label>
              <label className="field-label">
                Inflação anual estimada (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={annualInflationPct}
                  onChange={(e) => setAnnualInflationPct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Imposto de Renda s/ lucro (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={taxRatePct}
                  onChange={(e) => setTaxRatePct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Taxa de administração (% a.a.)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={adminFeePct}
                  onChange={(e) => setAdminFeePct(e.target.value)}
                />
              </label>
              {tab === "monthly_contributions" && (
                <label className="field-label sm:col-span-2">
                  Reajuste anual do aporte (%)
                  <input
                    className="input tabular"
                    inputMode="decimal"
                    value={annualStepUpPct}
                    onChange={(e) => setAnnualStepUpPct(e.target.value)}
                  />
                </label>
              )}
            </div>
          )}

          {/* 3. Meta financeira */}
          {tab === "financial_goal" && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="field-label">
                Valor da meta (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                />
              </label>
              <label className="field-label">
                Quanto você já tem hoje (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                />
              </label>
              <label className="field-label">
                Rentabilidade anual esperada (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={annualRatePct}
                  onChange={(e) => setAnnualRatePct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Prazo desejado ({termUnit === "years" ? "anos" : "meses"})
                <div className="flex gap-1.5">
                  <input
                    className="input tabular m-0 flex-1"
                    inputMode="numeric"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                  />
                  <select
                    aria-label="Unidade do prazo"
                    className="input m-0 w-24 text-xs"
                    value={termUnit}
                    onChange={(e) => setTermUnit(e.target.value as TermUnit)}
                  >
                    <option value="months">Meses</option>
                    <option value="years">Anos</option>
                  </select>
                </div>
              </label>
              <label className="field-label sm:col-span-2">
                Aporte mensal planejado (para calcular em quanto tempo atinge a meta)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={plannedGoalMonthly}
                  onChange={(e) => setPlannedGoalMonthly(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* 4. Independência financeira */}
          {tab === "financial_independence" && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="field-label">
                Renda mensal desejada (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={desiredIncome}
                  onChange={(e) => setDesiredIncome(e.target.value)}
                />
              </label>
              <label className="field-label">
                Patrimônio atual (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                />
              </label>
              <label className="field-label">
                Aporte mensal (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                />
              </label>
              <label className="field-label">
                Taxa de retirada segura anual (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={swrPct}
                  onChange={(e) => setSwrPct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Retorno nominal anual (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={annualRatePct}
                  onChange={(e) => setAnnualRatePct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Inflação anual (IPCA %)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={annualInflationPct}
                  onChange={(e) => setAnnualInflationPct(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* 5. Rentabilidade real */}
          {tab === "real_return" && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="field-label">
                Valor aplicado (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                />
              </label>
              <label className="field-label">
                Rentabilidade bruta anual (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={annualRatePct}
                  onChange={(e) => setAnnualRatePct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Inflação anual (IPCA %)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={annualInflationPct}
                  onChange={(e) => setAnnualInflationPct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Alíquota de IR sobre o lucro (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={taxRatePct}
                  onChange={(e) => setTaxRatePct(e.target.value)}
                />
              </label>
              <label className="field-label sm:col-span-2">
                Horizonte (meses)
                <input
                  className="input tabular"
                  inputMode="numeric"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* 6. Comparador de até 5 investimentos */}
          {tab === "investment_comparator" && (
            <div className="space-y-4">
              <div className="grid gap-3.5 sm:grid-cols-3">
                <label className="field-label">
                  Valor inicial (R$)
                  <input
                    className="input tabular"
                    inputMode="decimal"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Aporte mensal (R$)
                  <input
                    className="input tabular"
                    inputMode="decimal"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Prazo (meses)
                  <input
                    className="input tabular"
                    inputMode="numeric"
                    value={months}
                    onChange={(e) => setMonths(e.target.value)}
                  />
                </label>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Investimentos comparados ({compareOptions.length}/5)
                  </p>
                  {compareOptions.length < 5 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setCompareOptions([
                          ...compareOptions,
                          {
                            name: `Opção ${compareOptions.length + 1}`,
                            annualRatePct: 12,
                            taxFree: false,
                            adminFeePct: 0,
                          },
                        ])
                      }
                    >
                      <Plus className="size-3.5" />
                      Adicionar
                    </Button>
                  )}
                </div>

                {compareOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 items-center gap-2 rounded-xl border border-glass-border bg-glass-light-bg p-2.5 sm:grid-cols-[1.4fr_0.85fr_0.75fr_auto]"
                  >
                    <input
                      className="input m-0 text-xs"
                      aria-label={`Nome do investimento ${idx + 1}`}
                      value={opt.name}
                      onChange={(e) => {
                        const next = [...compareOptions];
                        next[idx] = { ...opt, name: e.target.value };
                        setCompareOptions(next);
                      }}
                    />
                    <input
                      className="input tabular m-0 text-xs"
                      inputMode="decimal"
                      aria-label={`Taxa anual de ${opt.name}`}
                      title="Taxa anual (%)"
                      value={opt.annualRatePct}
                      onChange={(e) => {
                        const next = [...compareOptions];
                        next[idx] = { ...opt, annualRatePct: n(e.target.value) };
                        setCompareOptions(next);
                      }}
                    />
                    <label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={Boolean(opt.taxFree)}
                        onChange={(e) => {
                          const next = [...compareOptions];
                          next[idx] = { ...opt, taxFree: e.target.checked };
                          setCompareOptions(next);
                        }}
                        className="size-3.5 accent-primary"
                      />
                      Isento IR
                    </label>
                    {compareOptions.length > 2 && (
                      <button
                        type="button"
                        aria-label={`Remover ${opt.name}`}
                        onClick={() =>
                          setCompareOptions(compareOptions.filter((_, i) => i !== idx))
                        }
                        className="rounded-lg p-1 text-muted-foreground hover:text-loss"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. Renda Fixa Completa */}
          {tab === "fixed_income" && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="field-label">
                Valor inicial (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                />
              </label>
              <label className="field-label">
                Aporte mensal (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                />
              </label>
              <label className="field-label">
                Prazo até o resgate (meses)
                <input
                  className="input tabular"
                  inputMode="numeric"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                />
              </label>
              <label className="field-label">
                Taxa CDI anual (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cdiRate}
                  onChange={(e) => setCdiRate(e.target.value)}
                />
              </label>
              <label className="field-label">
                Taxa Selic anual (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={selicRate}
                  onChange={(e) => setSelicRate(e.target.value)}
                />
              </label>
              <label className="field-label">
                CDB (% do CDI)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cdbPctCdi}
                  onChange={(e) => setCdbPctCdi(e.target.value)}
                />
              </label>
              <label className="field-label">
                LCI / LCA isenta (% do CDI)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={lciPctCdi}
                  onChange={(e) => setLciPctCdi(e.target.value)}
                />
              </label>
              <label className="field-label">
                IPCA anual estimado (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={annualInflationPct}
                  onChange={(e) => setAnnualInflationPct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Taxa real Tesouro IPCA+ (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={tesouroSpread}
                  onChange={(e) => setTesouroSpread(e.target.value)}
                />
              </label>
              <label className="field-label">
                Taxa Tesouro Prefixado (% a.a.)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={tesouroPrefixado}
                  onChange={(e) => setTesouroPrefixado(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* 7. Carteira e Rebalanceamento */}
          {tab === "portfolio_rebalance" && (
            <div className="space-y-3.5">
              <label className="field-label">
                Valor do novo aporte para distribuir (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={rebalanceContribution}
                  onChange={(e) => setRebalanceContribution(e.target.value)}
                />
              </label>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Classes da carteira (Valor atual R$ e Meta %):
                </p>
                {rebalanceSlices.map((slice, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1.2fr_1fr_0.75fr] items-center gap-2"
                  >
                    <input
                      className="input m-0 text-xs"
                      value={slice.name}
                      aria-label={`Nome da classe ${idx + 1}`}
                      onChange={(e) => {
                        const next = [...rebalanceSlices];
                        next[idx] = { ...slice, name: e.target.value };
                        setRebalanceSlices(next);
                      }}
                    />
                    <input
                      className="input tabular m-0 text-xs"
                      inputMode="decimal"
                      aria-label={`Valor atual de ${slice.name}`}
                      value={slice.currentValue}
                      onChange={(e) => {
                        const next = [...rebalanceSlices];
                        next[idx] = { ...slice, currentValue: n(e.target.value) };
                        setRebalanceSlices(next);
                      }}
                    />
                    <input
                      className="input tabular m-0 text-xs"
                      inputMode="decimal"
                      aria-label={`Meta percentual de ${slice.name}`}
                      value={slice.targetPct}
                      onChange={(e) => {
                        const next = [...rebalanceSlices];
                        next[idx] = { ...slice, targetPct: n(e.target.value) };
                        setRebalanceSlices(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. Empréstimos e Dívidas */}
          {tab === "debt_payoff" && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="field-label">
                Saldo devedor atual (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={debtPrincipal}
                  onChange={(e) => setDebtPrincipal(e.target.value)}
                />
              </label>
              <label className="field-label">
                Taxa de juros mensal (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={debtMonthlyRate}
                  onChange={(e) => setDebtMonthlyRate(e.target.value)}
                />
              </label>
              <label className="field-label">
                Prazo restante (meses)
                <input
                  className="input tabular"
                  inputMode="numeric"
                  value={debtMonths}
                  onChange={(e) => setDebtMonths(e.target.value)}
                />
              </label>
              <label className="field-label">
                Amortização extra mensal (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={debtExtra}
                  onChange={(e) => setDebtExtra(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* 9. Ações e FIIs */}
          {tab === "stocks_fiis" && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="field-label">
                Preço da ação / cota (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={sharePrice}
                  onChange={(e) => setSharePrice(e.target.value)}
                />
              </label>
              <label className="field-label">
                Dividendo mensal por cota (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={monthlyDivPerShare}
                  onChange={(e) => setMonthlyDivPerShare(e.target.value)}
                />
              </label>
              <label className="field-label">
                Quantidade inicial de cotas
                <input
                  className="input tabular"
                  inputMode="numeric"
                  value={initialShares}
                  onChange={(e) => setInitialShares(e.target.value)}
                />
              </label>
              <label className="field-label">
                Novas cotas compradas por mês
                <input
                  className="input tabular"
                  inputMode="numeric"
                  value={monthlyNewShares}
                  onChange={(e) => setMonthlyNewShares(e.target.value)}
                />
              </label>
              <label className="field-label">
                Valorização anual da cota (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={shareAppreciation}
                  onChange={(e) => setShareAppreciation(e.target.value)}
                />
              </label>
              <label className="field-label">
                Período (meses)
                <input
                  className="input tabular"
                  inputMode="numeric"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                />
              </label>
              <label className="field-label">
                Yield desejado p/ Preço Teto (% a.a.)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={desiredYieldPct}
                  onChange={(e) => setDesiredYieldPct(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                <input
                  type="checkbox"
                  checked={reinvestDividends}
                  onChange={(e) => setReinvestDividends(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Reinvestir automaticamente os dividendos recebidos (efeito bola de neve)
              </label>
            </div>
          )}

          {/* 11. Criptomoedas */}
          {tab === "crypto" && (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <label className="field-label">
                Preço atual da cripto (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cryptoPrice}
                  onChange={(e) => setCryptoPrice(e.target.value)}
                />
              </label>
              <label className="field-label">
                Aporte inicial (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cryptoInitialBrl}
                  onChange={(e) => setCryptoInitialBrl(e.target.value)}
                />
              </label>
              <label className="field-label">
                Aporte mensal DCA (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cryptoMonthlyDca}
                  onChange={(e) => setCryptoMonthlyDca(e.target.value)}
                />
              </label>
              <label className="field-label">
                Período de acumulação (meses)
                <input
                  className="input tabular"
                  inputMode="numeric"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                />
              </label>
              <label className="field-label">
                Preço-alvo desejado (R$)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cryptoTargetPrice}
                  onChange={(e) => setCryptoTargetPrice(e.target.value)}
                />
              </label>
              <label className="field-label">
                Cenário Pessimista (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cryptoBearPct}
                  onChange={(e) => setCryptoBearPct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Cenário Base (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cryptoBasePct}
                  onChange={(e) => setCryptoBasePct(e.target.value)}
                />
              </label>
              <label className="field-label">
                Cenário Otimista (%)
                <input
                  className="input tabular"
                  inputMode="decimal"
                  value={cryptoBullPct}
                  onChange={(e) => setCryptoBullPct(e.target.value)}
                />
              </label>
            </div>
          )}

          {/* Salvar ou Atualizar Simulação no Banco */}
          <div className="space-y-2.5 border-t pt-4">
            <label className="field-label">
              {editingId ? "Editando simulação salva" : "Nome para salvar esta simulação (opcional)"}
              <input
                className="input"
                placeholder={`Ex.: ${currentTabMeta.label} 5 anos`}
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                maxLength={120}
              />
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                disabled={saveMutation.isPending}
                onClick={handleSaveSimulation}
              >
                <BookmarkPlus className="size-4" />
                {saveMutation.isPending
                  ? "Salvando…"
                  : editingId
                    ? "Atualizar simulação"
                    : "Salvar simulação"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setSimName("");
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Coluna de Resultados e Gráficos */}
        <section className="space-y-5">
          {(tab === "compound_interest" || tab === "monthly_contributions") && (
            <>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="card hero-metric col-span-2 p-4 sm:col-span-1 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Patrimônio final bruto</p>
                  <p className="metric-value mt-2 text-2xl font-semibold text-foreground">
                    {formatCurrency(compoundResult.finalTotal)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Real descontando IPCA: {formatCurrency(compoundResult.realFinalTotal)}
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Valor final líquido (pós IR/adm)</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-primary sm:text-2xl">
                    {formatCurrency(compoundResult.finalNetTotal)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    IR: {formatCurrency(compoundResult.taxPaid)} · Adm: {formatCurrency(compoundResult.adminFeesPaid)}
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Total investido</p>
                  <p className="metric-value mt-2 text-xl font-semibold sm:text-2xl">
                    {formatCurrency(compoundResult.totalInvested)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rentab. total: +{compoundResult.totalReturnPct}% ({compoundResult.annualizedReturnPct}% a.a.)
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Juros acumulados</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-gain sm:text-2xl">
                    {formatCurrency(compoundResult.totalInterest)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rentab. real líquida: {compoundResult.realReturnPct}% ({compoundResult.interestSharePct}% juros)
                  </p>
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <h3 className="mb-4 text-base font-semibold tracking-tight">
                  Curva de crescimento patrimonial (Bruto vs. Líquido vs. Poder de Compra)
                </h3>
                <EvolutionChart
                  data={compoundResult.series}
                  keys={[
                    { key: "total", name: "Patrimônio Bruto", color: "var(--chart-1)" },
                    { key: "netTotal", name: "Patrimônio Líquido", color: "var(--chart-2)" },
                    { key: "realTotal", name: "Poder de Compra Real", color: "var(--gain)" },
                    { key: "invested", name: "Total Aportado", color: "var(--chart-4)" },
                  ]}
                />
              </div>
            </>
          )}

          {tab === "financial_goal" && (
            <>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="card hero-metric col-span-2 p-4 sm:col-span-1 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Aporte mensal necessário</p>
                  <p className="metric-value mt-2 text-2xl font-semibold text-foreground">
                    {formatCurrency(goalResult.requiredMonthlyContribution)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Para atingir {formatCurrency(goalResult.targetAmount)} no prazo
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Prazo c/ aporte planejado</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-primary sm:text-2xl">
                    {goalResult.reachableWithin50Years
                      ? `${goalResult.monthsToReachGoal} meses`
                      : "+50 anos"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ~{goalResult.yearsToReachGoal} anos aportando {formatCurrency(n(plannedGoalMonthly, n(monthlyContribution)))}/mês
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Total em novos aportes</p>
                  <p className="metric-value mt-2 text-xl font-semibold sm:text-2xl">
                    {formatCurrency(goalResult.totalContributionsToMake)}
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Juros a favor da meta</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-gain sm:text-2xl">
                    {formatCurrency(goalResult.projectedInterestEarned)}
                  </p>
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <h3 className="mb-4 text-base font-semibold tracking-tight">Trajetória até a meta financeira</h3>
                <EvolutionChart
                  data={goalResult.series}
                  keys={[
                    { key: "total", name: "Saldo Projetado", color: "var(--chart-1)" },
                    { key: "invested", name: "Capital Aportado", color: "var(--chart-2)" },
                  ]}
                />
              </div>
            </>
          )}

          {tab === "financial_independence" && (
            <>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                <div className="card hero-metric col-span-2 p-4 sm:col-span-1 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Patrimônio-alvo para viver de renda</p>
                  <p className="metric-value mt-2 text-2xl font-semibold text-foreground">
                    {formatCurrency(fiResult.requiredPatrimony)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Taxa de retirada segura: {fiResult.safeWithdrawalRatePct}% a.a.
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Tempo estimado</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-primary sm:text-2xl">
                    {fiResult.reachableWithin60Years
                      ? `${fiResult.yearsToIndependence} anos (${fiResult.monthsToIndependence} m)`
                      : "+60 anos"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Juro real descontado da inflação: {fiResult.realAnnualReturnPct}% a.a.
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Renda passiva sustentável hoje</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-gain sm:text-2xl">
                    {formatCurrency(fiResult.currentSustainableIncome)}/mês
                  </p>
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <h3 className="mb-4 text-base font-semibold tracking-tight">
                  Evolução rumo à Independência Financeira (em moeda de hoje)
                </h3>
                <EvolutionChart
                  data={fiResult.series}
                  keys={[
                    { key: "patrimony", name: "Patrimônio Acumulado", color: "var(--chart-1)" },
                    { key: "target", name: "Meta de Independência", color: "var(--gain)" },
                  ]}
                />
              </div>
            </>
          )}

          {tab === "real_return" && (
            <div className="card space-y-4 p-5 sm:p-6">
              <h3 className="text-base font-semibold tracking-tight">
                Decomposição da Rentabilidade Real (Equação de Fisher)
              </h3>
              <div className="grid gap-3.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-glass-border bg-glass-light-bg p-4">
                  <p className="text-xs text-muted-foreground">Taxa Líquida Nominal</p>
                  <p className="metric-value mt-1.5 text-2xl font-semibold">
                    {realReturnResult.netNominalAnnualPct}% a.a.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Bruta: {realReturnResult.grossNominalAnnualPct}% a.a.
                  </p>
                </div>
                <div className="rounded-2xl border border-gain/30 bg-gain/8 p-4">
                  <p className="text-xs text-muted-foreground">Ganho Real Acima da Inflação</p>
                  <p className="metric-value mt-1.5 text-2xl font-semibold text-gain">
                    {realReturnResult.realAnnualPct}% a.a.
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Descontando IPCA de {realReturnResult.inflationAnnualPct}% a.a.
                  </p>
                </div>
                <div className="rounded-2xl border border-glass-border bg-glass-light-bg p-4">
                  <p className="text-xs text-muted-foreground">Poder de Compra Final</p>
                  <p className="metric-value mt-1.5 text-2xl font-semibold text-primary">
                    {formatCurrency(realReturnResult.realPurchasingPower)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Valor nominal: {formatCurrency(realReturnResult.nominalFinalAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === "investment_comparator" && (
            <div className="card space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Comparação entre {customCompareResult.options.length} investimentos ({customCompareResult.months} meses)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    IR padrão da tabela regressiva no prazo: {customCompareResult.defaultIrPct}% (quando não isento)
                  </p>
                </div>
                {customCompareResult.winner && (
                  <span className="badge badge-gain">
                    Melhor opção: {customCompareResult.winner.name}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {customCompareResult.options.map((opt, idx) => (
                  <div
                    key={`${opt.name}-${idx}`}
                    className={cn(
                      "rounded-2xl border p-4",
                      idx === 0
                        ? "border-gain/40 bg-gain/8"
                        : "border-glass-border bg-glass-light-bg",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold">
                          #{idx + 1} · {opt.name}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({opt.annualGrossPct}% a.a. bruto{opt.taxRatePct === 0 ? " · Isento de IR" : ` · IR ${opt.taxRatePct}%`})
                        </span>
                      </div>
                      <span className="tabular text-base font-bold text-foreground">
                        Líquido: {formatCurrency(opt.netTotal)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                      <span>Bruto: {formatCurrency(opt.grossTotal)}</span>
                      <span>IR: {formatCurrency(opt.taxAmount)}</span>
                      <span>Rentab. anualizada: {opt.annualizedReturnPct}% a.a.</span>
                      <span className="font-medium text-gain">
                        Lucro líquido: +{formatCurrency(opt.netProfit)} (+{opt.totalReturnPct}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "fixed_income" && (
            <div className="card space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Ranking Renda Fixa Líquida (IR de {comparatorResult.irRatePct}% no prazo)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Uma LCI/LCA de {lciPctCdi}% do CDI equivale a um CDB tributado de{" "}
                    <strong className="text-foreground">
                      {comparatorResult.equivalentCdbPctForLci}% do CDI
                    </strong>{" "}
                    neste prazo (inclui CDB, LCI, LCA, Tesouro Selic, IPCA+ e Prefixado).
                  </p>
                </div>
                <span className="badge badge-gain">
                  Melhor opção: {comparatorResult.winner.name}
                </span>
              </div>

              <div className="space-y-3">
                {comparatorResult.options.map((opt, idx) => (
                  <div
                    key={opt.name}
                    className={cn(
                      "rounded-2xl border p-4",
                      idx === 0
                        ? "border-gain/40 bg-gain/8"
                        : "border-glass-border bg-glass-light-bg",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold">{opt.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({opt.annualGrossPct}% a.a. bruto)
                        </span>
                      </div>
                      <span className="tabular text-base font-bold text-foreground">
                        Líquido: {formatCurrency(opt.netTotal)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                      <span>Bruto: {formatCurrency(opt.grossTotal)}</span>
                      <span>IR descontado: {formatCurrency(opt.taxAmount)}</span>
                      <span className="font-medium text-gain">
                        Lucro líquido: +{formatCurrency(opt.netProfit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "portfolio_rebalance" && (
            <div className="card overflow-hidden">
              <div className="border-b border-border p-5 sm:p-6">
                <h3 className="text-base font-semibold tracking-tight">
                  Plano de alocação do novo aporte ({formatCurrency(rebalanceResult.newContribution)})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Prioriza automaticamente as classes abaixo do percentual-alvo sem precisar vender ativos
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-border bg-glass-light-bg text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3.5 font-semibold">Classe</th>
                      <th className="p-3.5 font-semibold">Atual</th>
                      <th className="p-3.5 font-semibold">Meta</th>
                      <th className="p-3.5 font-semibold">Comprar com o aporte</th>
                      <th className="p-3.5 font-semibold">Novo peso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rebalanceResult.items.map((item) => (
                      <tr key={item.name} className="transition-colors hover:bg-muted/35">
                        <td className="p-3.5 font-medium">{item.name}</td>
                        <td className="tabular p-3.5">
                          {formatCurrency(item.currentValue)} ({item.currentSharePct}%)
                        </td>
                        <td className="tabular p-3.5">{item.targetPct}%</td>
                        <td className="tabular p-3.5 font-semibold text-gain">
                          +{formatCurrency(item.suggestedFromContribution)}
                        </td>
                        <td className="tabular p-3.5 font-medium">{item.afterContributionPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "debt_payoff" && (
            <>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Parcela Price padrão</p>
                  <p className="metric-value mt-2 text-xl font-semibold sm:text-2xl">
                    {formatCurrency(debtResult.priceInstallment)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    1ª SAC: {formatCurrency(debtResult.sacFirstInstallment)}
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Economia de juros c/ extra</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-gain sm:text-2xl">
                    {formatCurrency(debtResult.interestSavedWithExtra)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Total juros s/ extra: {formatCurrency(debtResult.totalInterestPrice)}
                  </p>
                </div>
                <div className="card col-span-2 p-4 sm:col-span-1 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Prazo reduzido</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-primary sm:text-2xl">
                    {debtResult.monthsSaved} meses a menos
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quitação em {debtResult.monthsWithExtra} meses
                  </p>
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <h3 className="mb-4 text-base font-semibold tracking-tight">
                  Queda do saldo devedor (Padrão vs. Com Amortização Extra)
                </h3>
                <EvolutionChart
                  data={debtResult.schedule}
                  keys={[
                    { key: "balanceStandard", name: "Saldo Padrão", color: "var(--loss)" },
                    {
                      key: "balanceWithExtra",
                      name: "Com Amortização Extra",
                      color: "var(--gain)",
                    },
                  ]}
                />
              </div>
            </>
          )}

          {tab === "stocks_fiis" && (
            <>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="card hero-metric col-span-2 p-4 sm:col-span-1 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Renda passiva mensal final</p>
                  <p className="metric-value mt-2 text-2xl font-semibold text-foreground">
                    {formatCurrency(snowballResult.finalMonthlyDividend)}/mês
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Yield on Cost: {snowballResult.yieldOnCostAnnualPct}% a.a.
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Preço Teto (Bazin {desiredYieldPct}%)</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-primary sm:text-2xl">
                    {formatCurrency(snowballResult.ceilingPrice)}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      snowballResult.marginOfSafetyPct >= 0 ? "text-gain" : "text-loss",
                    )}
                  >
                    Margem: {snowballResult.marginOfSafetyPct >= 0 ? "+" : ""}
                    {snowballResult.marginOfSafetyPct}% · PM: {formatCurrency(snowballResult.averageCostPerShare)}
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Número Mágico</p>
                  <p className="metric-value mt-2 text-xl font-semibold sm:text-2xl">
                    {snowballResult.magicNumberShares} cotas
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Capital: {formatCurrency(snowballResult.magicNumberCapital)}
                  </p>
                </div>
                <div className="card p-4 sm:p-5">
                  <p className="text-xs font-medium text-muted-foreground">Patrimônio acumulado</p>
                  <p className="metric-value mt-2 text-xl font-semibold text-gain sm:text-2xl">
                    {formatCurrency(snowballResult.finalPatrimony)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dividendos: {formatCurrency(snowballResult.cumulativeDividends)} · {snowballResult.finalShares} cotas
                  </p>
                </div>
              </div>

              <div className="card p-5 sm:p-6">
                <h3 className="mb-4 text-base font-semibold tracking-tight">
                  Evolução do patrimônio e dividendos reinvestidos
                </h3>
                <EvolutionChart
                  data={snowballResult.series}
                  keys={[
                    { key: "patrimony", name: "Patrimônio em Cotas", color: "var(--chart-1)" },
                  ]}
                />
              </div>
            </>
          )}

          {tab === "crypto" && (
            <div className="card space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Simulação de DCA, Custo Médio e Preço-Alvo em Criptoativos
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Total aportado: {formatCurrency(cryptoResult.totalInvested)} (~
                    {cryptoResult.estimatedUnits} unid.) · Custo médio estimado:{" "}
                    <strong className="text-foreground">
                      {formatCurrency(cryptoResult.averageCostBrl)}
                    </strong>
                  </p>
                </div>
                <span
                  className={cn(
                    "badge",
                    cryptoResult.exposureInPortfolioPct > 15 ? "badge-warning" : "badge-gain",
                  )}
                >
                  Exposição projetada: {cryptoResult.exposureInPortfolioPct}% da carteira
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-glass-border bg-glass-light-bg p-4">
                  <p className="text-xs text-muted-foreground">No Preço-Alvo ({formatCurrency(cryptoResult.targetPriceBrl)})</p>
                  <p className="metric-value mt-1 text-xl font-semibold text-primary">
                    {formatCurrency(cryptoResult.targetValueBrl)}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs font-medium",
                      cryptoResult.targetGainBrl >= 0 ? "text-gain" : "text-loss",
                    )}
                  >
                    Resultado estimado: {cryptoResult.targetGainBrl >= 0 ? "+" : ""}
                    {formatCurrency(cryptoResult.targetGainBrl)} ({cryptoResult.targetGainPct}%)
                  </p>
                </div>
                <div className="rounded-2xl border border-glass-border bg-glass-light-bg p-4 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Gestão de Risco & Exposição</p>
                  <p className="mt-1 leading-5">{cryptoResult.riskAlert}</p>
                </div>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-3">
                {cryptoResult.scenarios.map((sc) => (
                  <div key={sc.name} className="rounded-2xl border border-glass-border bg-glass-light-bg p-4">
                    <p className="text-xs font-semibold">{sc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Alvo: {formatCurrency(sc.targetPrice)} ({sc.changePct > 0 ? `+${sc.changePct}%` : `${sc.changePct}%`})
                    </p>
                    <p className="metric-value mt-2 text-xl font-semibold">
                      {formatCurrency(sc.finalValue)}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-medium",
                        sc.profit >= 0 ? "text-gain" : "text-loss",
                      )}
                    >
                      Resultado: {sc.profit >= 0 ? "+" : ""}
                      {formatCurrency(sc.profit)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Simulações Salvas no Banco */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Simulações salvas na sua conta</h2>
            <p className="text-xs text-muted-foreground">
              Carregue, edite, duplique ou exclua cenários salvos no InvestFast
            </p>
          </div>
          <Link
            href="/assistente"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Analisar com Assistente IA <Sparkles className="size-3.5" />
          </Link>
        </div>

        {simulationsQuery.data?.items?.length ? (
          <div className="divide-y">
            {simulationsQuery.data.items.map((sim) => {
              const meta = TABS.find((t) => t.id === sim.calculator_type);
              return (
                <div
                  key={sim.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm",
                    editingId === sim.id && "bg-primary/[0.04]",
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{sim.name}</span>
                      <span className="badge">{meta?.label || sim.calculator_type}</span>
                      {editingId === sim.id && (
                        <span className="badge badge-gain">Em edição</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Salva em {formatDate(sim.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadSimulation(sim, false)}
                    >
                      Carregar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Editar simulação"
                      onClick={() => loadSimulation(sim, true)}
                    >
                      <Pencil className="size-3.5 text-muted-foreground" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Duplicar simulação"
                      disabled={duplicateMutation.isPending}
                      onClick={() => duplicateMutation.mutate(sim)}
                    >
                      <Copy className="size-3.5 text-muted-foreground" />
                      Duplicar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Excluir simulação"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(sim.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground hover:text-loss" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhuma simulação salva ainda. Use o botão &ldquo;Salvar simulação&rdquo; para guardar seus cenários.
          </div>
        )}
      </section>
    </div>
  );
}

