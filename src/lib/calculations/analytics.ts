import Decimal from "decimal.js";
import { FinancialDecimal as D } from "./decimal";
import {
  overview,
  flow,
  positions,
  categoriesSpending,
  budgetUsage,
  goalProgress,
  num,
  sum,
} from "./finance";
import { type Snapshot, text, today, labels } from "@/lib/domain";
import { format, parseISO, subMonths } from "date-fns";

export type AnalyticsRecommendation = {
  id: string;
  priority: "alta" | "media" | "baixa";
  title: string;
  why: string;
  impact: string;
  actionLabel: string;
  actionHref: string;
};

export type FinancialAnalysisReport = {
  summary: {
    wealth: number;
    cash: number;
    invested: number;
    income: number;
    expense: number;
    balance: number;
    savingsRatePct: number;
    topCategory: { name: string; value: number } | null;
    topSpendingCategories: { name: string; value: number; sharePct: number }[];
  };
  comparison: {
    previousStart: string;
    previousEnd: string;
    currentIncome: number;
    previousIncome: number;
    incomeDeltaPct: number | null;
    currentExpense: number;
    previousExpense: number;
    expenseDeltaPct: number | null;
    categoryDeltas: {
      name: string;
      current: number;
      previous: number;
      deltaPct: number | null;
    }[];
  };
  capacity: {
    avgMonthlyIncome: number;
    avgMonthlyExpense: number;
    recurringMonthlyExpense: number;
    safeMonthlyInvestment: number;
    recommendedMinInvestment: number;
    currentCapacityPct: number;
  };
  emergency: {
    monthlyCostReference: number;
    targetSixMonths: number;
    emergencyGoalsSaved: number;
    immediateLiquidCash: number;
    effectiveReserve: number;
    monthsCovered: number;
    progressPct: number;
    status: "adequada" | "parcial" | "baixa" | "sem_base";
  };
  debts: {
    creditCardBalance: number;
    cardPaymentsInPeriod: number;
    overduePendingAmount: number;
    overduePendingCount: number;
    upcomingPendingAmount: number;
    upcomingPendingCount: number;
    debtToIncomePct: number;
    pressure: "baixa" | "moderada" | "alta";
  };
  portfolio: {
    totalInvested: number;
    assetCount: number;
    classCount: number;
    hhi: number;
    diversificationScore: number;
    diversificationLevel: "Alta" | "Moderada" | "Concentrada" | "Sem ativos";
    topAsset: { ticker: string; name: string; sharePct: number; value: number } | null;
    topClass: { name: string; sharePct: number; value: number } | null;
    byClass: { key: string; name: string; value: number; sharePct: number }[];
    byAsset: { ticker: string; name: string; assetClass: string; value: number; sharePct: number }[];
  };
  liquidity: {
    totalWealth: number;
    immediateAmount: number;
    immediatePct: number;
    shortTermAmount: number;
    shortTermPct: number;
    mediumLongAmount: number;
    mediumLongPct: number;
  };
  risk: {
    score: number;
    profile: "Conservador" | "Moderado" | "Arrojado";
    fixedIncomePct: number;
    variableIncomePct: number;
    cryptoPct: number;
    explanation: string;
  };
  goals: {
    activeCount: number;
    completedCount: number;
    totalTarget: number;
    totalSaved: number;
    overallProgressPct: number;
    items: {
      id: string;
      name: string;
      saved: number;
      target: number;
      percent: number;
      monthlyRequired: number;
      deadline: string | null;
    }[];
  };
  profitability: {
    totalCost: number;
    currentValue: number;
    capitalGain: number;
    returnPct: number;
    bestAsset: { ticker: string; returnPct: number; value: number } | null;
    worstAsset: { ticker: string; returnPct: number; value: number } | null;
  };
  dividends: {
    periodTotal: number;
    twelveMonthsTotal: number;
    monthlyAvgTwelveMonths: number;
    trailingYieldPct: number;
    topPayers: { ticker: string; total: number }[];
  };
  recommendations: AnalyticsRecommendation[];
};

const IMMEDIATE_CLASSES = new Set(["cdi", "treasury"]);
const SHORT_TERM_CLASSES = new Set(["stock", "fii", "etf", "bdr", "crypto", "fund"]);
const FIXED_INCOME_CLASSES = new Set(["cdi", "treasury", "cdb", "lci", "lca", "cri", "cra", "debenture", "pension"]);
const VARIABLE_INCOME_CLASSES = new Set(["stock", "fii", "etf", "bdr", "fund"]);

const CLASS_RISK_WEIGHT: Record<string, number> = {
  cdi: 8,
  treasury: 12,
  cdb: 18,
  lci: 18,
  lca: 18,
  pension: 25,
  debenture: 38,
  cri: 42,
  cra: 42,
  fund: 48,
  fii: 55,
  etf: 65,
  bdr: 72,
  stock: 75,
  crypto: 95,
  other: 50,
};

function recurringMonthlyEquivalent(amount: Decimal, frequency: string): Decimal {
  if (frequency === "weekly") return amount.mul(52).div(12);
  if (frequency === "quarterly") return amount.div(3);
  if (frequency === "yearly") return amount.div(12);
  return amount;
}

export function analyzeFinances(
  data: Snapshot,
  start: string,
  end: string,
): FinancialAnalysisReport {
  const ov = overview(data);
  const currentFlow = flow(data, start, end);
  const currentCategories = categoriesSpending(data, start, end);

  const savingsRatePct = currentFlow.income.gt(0)
    ? currentFlow.balance.div(currentFlow.income).mul(100).toDecimalPlaces(1).toNumber()
    : 0;

  // 1. Comparação mensal (intervalo deslocado 1 mês para trás)
  const previousStart = format(subMonths(parseISO(start), 1), "yyyy-MM-dd");
  const previousEnd = format(subMonths(parseISO(end), 1), "yyyy-MM-dd");
  const previousFlow = flow(data, previousStart, previousEnd);
  const previousCategories = categoriesSpending(data, previousStart, previousEnd);

  const incomeDeltaPct = previousFlow.income.gt(0)
    ? currentFlow.income
        .minus(previousFlow.income)
        .div(previousFlow.income)
        .mul(100)
        .toDecimalPlaces(1)
        .toNumber()
    : null;

  const expenseDeltaPct = previousFlow.expense.gt(0)
    ? currentFlow.expense
        .minus(previousFlow.expense)
        .div(previousFlow.expense)
        .mul(100)
        .toDecimalPlaces(1)
        .toNumber()
    : null;

  const categoryNames = new Set([
    ...currentCategories.map((c) => c.name),
    ...previousCategories.map((c) => c.name),
  ]);
  const categoryDeltas = [...categoryNames]
    .map((name) => {
      const cur = currentCategories.find((c) => c.name === name)?.value ?? 0;
      const prev = previousCategories.find((c) => c.name === name)?.value ?? 0;
      const deltaPct = prev > 0 ? Number((((cur - prev) / prev) * 100).toFixed(1)) : null;
      return { name, current: cur, previous: prev, deltaPct };
    })
    .sort((a, b) => b.current - a.current)
    .slice(0, 6);

  // 2. Capacidade de investimento (média dos últimos 3 meses)
  const threeMonthsAgo = format(subMonths(parseISO(end), 3), "yyyy-MM-dd");
  const threeMonthFlow = flow(data, threeMonthsAgo, end);
  const avgMonthlyIncomeDec = threeMonthFlow.income.gt(0)
    ? threeMonthFlow.income.div(3)
    : currentFlow.income;
  const avgMonthlyExpenseDec = threeMonthFlow.expense.gt(0)
    ? threeMonthFlow.expense.div(3)
    : currentFlow.expense;

  const recurringExpenseDec = (data.recurring_transactions ?? [])
    .filter((r) => r.active !== false && String(r.active) !== "false" && r.type === "expense")
    .reduce(
      (acc, r) => acc.plus(recurringMonthlyEquivalent(num(r.amount), text(r.frequency) || "monthly")),
      new D(0),
    );

  const effectiveMonthlyOutflow = Decimal.max(avgMonthlyExpenseDec, recurringExpenseDec);
  const rawSurplus = Decimal.max(0, avgMonthlyIncomeDec.minus(effectiveMonthlyOutflow));
  // Margem de segurança de 15% sobre a sobra mensal
  const safeMonthlyInvestmentDec = rawSurplus.mul(new D("0.85"));
  const recommendedMinInvestmentDec = avgMonthlyIncomeDec.mul(new D("0.20"));
  const currentCapacityPct = avgMonthlyIncomeDec.gt(0)
    ? safeMonthlyInvestmentDec.div(avgMonthlyIncomeDec).mul(100).toDecimalPlaces(1).toNumber()
    : 0;

  // 3. Reserva de emergência
  const monthlyCostReferenceDec = effectiveMonthlyOutflow;
  const targetSixMonthsDec = monthlyCostReferenceDec.mul(6);
  const emergencyGoalsSavedDec = sum(
    (data.goals ?? []).filter((g) => g.type === "emergency" && g.status !== "cancelled"),
    "accumulated_amount",
  );

  const liquidAccountsDec = (data.accounts ?? [])
    .filter(
      (a) =>
        a.status !== "archived" &&
        ["checking", "savings", "wallet", "cash", "broker"].includes(text(a.type)) &&
        num(a.current_balance).gt(0),
    )
    .reduce((acc, a) => acc.plus(num(a.current_balance)), new D(0));

  const ps = positions(data).filter((p) => p.value.gt(0));
  const cdiAndTreasuryDec = ps
    .filter((p) => IMMEDIATE_CLASSES.has(text(p.asset?.asset_class)))
    .reduce((acc, p) => acc.plus(p.value), new D(0));

  // Consideramos o maior entre metas de emergência explícitas ou liquidez imediata disponível (caixa + CDI/Tesouro)
  const effectiveReserveDec = Decimal.max(
    emergencyGoalsSavedDec,
    liquidAccountsDec.plus(cdiAndTreasuryDec),
  );

  const monthsCovered = monthlyCostReferenceDec.gt(0)
    ? effectiveReserveDec.div(monthlyCostReferenceDec).toDecimalPlaces(1).toNumber()
    : 0;

  const emergencyProgressPct = targetSixMonthsDec.gt(0)
    ? Math.min(100, effectiveReserveDec.div(targetSixMonthsDec).mul(100).toDecimalPlaces(1).toNumber())
    : 0;

  const emergencyStatus: FinancialAnalysisReport["emergency"]["status"] =
    monthlyCostReferenceDec.lte(0)
      ? "sem_base"
      : monthsCovered >= 6
        ? "adequada"
        : monthsCovered >= 3
          ? "parcial"
          : "baixa";

  // 4. Dívidas e compromissos
  const todayStr = today();
  const creditCardBalanceDec = (data.accounts ?? [])
    .filter((a) => a.type === "credit" && a.status !== "archived")
    .reduce((acc, a) => {
      const bal = num(a.current_balance);
      return acc.plus(bal.lt(0) ? bal.abs() : bal);
    }, new D(0));

  const cardPaymentsInPeriodDec = sum(
    (data.transactions ?? []).filter(
      (t) =>
        t.type === "card_payment" &&
        t.status === "paid" &&
        text(t.transaction_date) >= start &&
        text(t.transaction_date) <= end,
    ),
    "amount",
  );

  const pendingExpenses = (data.transactions ?? []).filter(
    (t) => t.status === "pending" && (t.type === "expense" || t.type === "card_payment"),
  );
  const overduePending = pendingExpenses.filter((t) => text(t.transaction_date) < todayStr);
  const upcomingPending = pendingExpenses.filter((t) => text(t.transaction_date) >= todayStr);

  const overduePendingAmountDec = sum(overduePending, "amount");
  const upcomingPendingAmountDec = sum(upcomingPending, "amount");

  const totalDebtBurdenDec = creditCardBalanceDec
    .plus(overduePendingAmountDec)
    .plus(cardPaymentsInPeriodDec);

  const debtToIncomePct = avgMonthlyIncomeDec.gt(0)
    ? totalDebtBurdenDec.div(avgMonthlyIncomeDec).mul(100).toDecimalPlaces(1).toNumber()
    : 0;

  const debtPressure: FinancialAnalysisReport["debts"]["pressure"] =
    overduePending.length > 0 || debtToIncomePct > 35
      ? "alta"
      : debtToIncomePct > 15 || creditCardBalanceDec.gt(0)
        ? "moderada"
        : "baixa";

  // 5. Alocação, concentração e diversificação
  const totalInvestedDec = ov.value;
  const assetMap = new Map<
    string,
    { ticker: string; name: string; assetClass: string; value: Decimal }
  >();
  const classMap = new Map<string, Decimal>();

  ps.forEach((p) => {
    const ticker = text(p.asset?.ticker) || "ATIVO";
    const name = text(p.asset?.name) || ticker;
    const assetClass = text(p.asset?.asset_class) || "other";
    const current = assetMap.get(ticker);
    if (current) {
      current.value = current.value.plus(p.value);
    } else {
      assetMap.set(ticker, { ticker, name, assetClass, value: p.value });
    }
    classMap.set(assetClass, (classMap.get(assetClass) ?? new D(0)).plus(p.value));
  });

  const byAsset = [...assetMap.values()]
    .map((a) => ({
      ticker: a.ticker,
      name: a.name,
      assetClass: a.assetClass,
      value: a.value.toDecimalPlaces(2).toNumber(),
      sharePct: totalInvestedDec.gt(0)
        ? a.value.div(totalInvestedDec).mul(100).toDecimalPlaces(1).toNumber()
        : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const byClass = [...classMap.entries()]
    .map(([key, val]) => ({
      key,
      name: labels[key] || key,
      value: val.toDecimalPlaces(2).toNumber(),
      sharePct: totalInvestedDec.gt(0)
        ? val.div(totalInvestedDec).mul(100).toDecimalPlaces(1).toNumber()
        : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const hhi = byAsset.reduce((acc, a) => {
    const share = a.sharePct / 100;
    return acc + share * share;
  }, 0);

  const diversificationScore =
    byAsset.length === 0 ? 0 : Math.max(0, Math.min(100, Math.round((1 - hhi) * 100)));

  const diversificationLevel: FinancialAnalysisReport["portfolio"]["diversificationLevel"] =
    byAsset.length === 0
      ? "Sem ativos"
      : diversificationScore >= 72 && byClass.length >= 2
        ? "Alta"
        : diversificationScore >= 45
          ? "Moderada"
          : "Concentrada";

  const topAsset = byAsset[0]
    ? {
        ticker: byAsset[0].ticker,
        name: byAsset[0].name,
        sharePct: byAsset[0].sharePct,
        value: byAsset[0].value,
      }
    : null;

  const topClass = byClass[0]
    ? {
        name: byClass[0].name,
        sharePct: byClass[0].sharePct,
        value: byClass[0].value,
      }
    : null;

  // 6. Liquidez
  const immediateAmountDec = Decimal.max(0, ov.cash).plus(cdiAndTreasuryDec);
  const shortTermAmountDec = ps
    .filter((p) => SHORT_TERM_CLASSES.has(text(p.asset?.asset_class)))
    .reduce((acc, p) => acc.plus(p.value), new D(0));
  const mediumLongAmountDec = ps
    .filter(
      (p) =>
        !IMMEDIATE_CLASSES.has(text(p.asset?.asset_class)) &&
        !SHORT_TERM_CLASSES.has(text(p.asset?.asset_class)),
    )
    .reduce((acc, p) => acc.plus(p.value), new D(0));

  const totalLiquidBaseDec = immediateAmountDec.plus(shortTermAmountDec).plus(mediumLongAmountDec);

  // 7. Risco estimado
  const fixedIncomeDec = ps
    .filter((p) => FIXED_INCOME_CLASSES.has(text(p.asset?.asset_class)))
    .reduce((acc, p) => acc.plus(p.value), new D(0));
  const variableIncomeDec = ps
    .filter((p) => VARIABLE_INCOME_CLASSES.has(text(p.asset?.asset_class)))
    .reduce((acc, p) => acc.plus(p.value), new D(0));
  const cryptoDec = ps
    .filter((p) => text(p.asset?.asset_class) === "crypto")
    .reduce((acc, p) => acc.plus(p.value), new D(0));

  let weightedRisk = 15;
  if (totalInvestedDec.gt(0)) {
    weightedRisk = byClass.reduce((acc, c) => {
      const weight = CLASS_RISK_WEIGHT[c.key] ?? 50;
      return acc + (c.sharePct / 100) * weight;
    }, 0);
    if (topAsset && topAsset.sharePct > 35) weightedRisk += 10;
    if (monthsCovered < 3 && monthlyCostReferenceDec.gt(0)) weightedRisk += 8;
  }
  const riskScore = Math.max(5, Math.min(100, Math.round(weightedRisk)));
  const riskProfile: FinancialAnalysisReport["risk"]["profile"] =
    riskScore <= 35 ? "Conservador" : riskScore <= 68 ? "Moderado" : "Arrojado";

  const fixedIncomePct = totalInvestedDec.gt(0)
    ? fixedIncomeDec.div(totalInvestedDec).mul(100).toDecimalPlaces(1).toNumber()
    : 0;
  const variableIncomePct = totalInvestedDec.gt(0)
    ? variableIncomeDec.div(totalInvestedDec).mul(100).toDecimalPlaces(1).toNumber()
    : 0;
  const cryptoPct = totalInvestedDec.gt(0)
    ? cryptoDec.div(totalInvestedDec).mul(100).toDecimalPlaces(1).toNumber()
    : 0;

  const riskExplanation =
    totalInvestedDec.lte(0)
      ? "Você ainda não possui posições ativas em investimentos. Seu patrimônio está concentrado em saldo de contas."
      : `Sua carteira combina ${fixedIncomePct}% em renda fixa, ${variableIncomePct}% em renda variável e ${cryptoPct}% em criptoativos, resultando em perfil ${riskProfile.toLowerCase()} (score ${riskScore}/100).`;

  // 8. Recomendações explicadas
  const recommendations: AnalyticsRecommendation[] = [];

  if (overduePending.length > 0) {
    recommendations.push({
      id: "overdue-bills",
      priority: "alta",
      title: `Regularizar ${overduePending.length} lançamento(s) vencido(s)`,
      why: `Existem contas pendentes com data anterior a hoje somando R$ ${overduePendingAmountDec.toFixed(2)}.`,
      impact: "Evita juros, multa por atraso e distorções no saldo disponível para investir.",
      actionLabel: "Revisar transações",
      actionHref: "/transacoes",
    });
  }

  if (emergencyStatus === "baixa" || emergencyStatus === "parcial") {
    recommendations.push({
      id: "build-emergency-reserve",
      priority: emergencyStatus === "baixa" ? "alta" : "media",
      title:
        emergencyStatus === "baixa"
          ? "Priorizar a formação da reserva de emergência"
          : "Completar os 6 meses da reserva de emergência",
      why: `Sua cobertura líquida atual equivale a ${monthsCovered.toFixed(1)} meses do seu custo mensal estimado.`,
      impact: "Garante segurança financeira contra imprevistos sem precisar vender ativos no prejuízo.",
      actionLabel: "Simular reserva na Calculadora",
      actionHref: "/calculadora?tab=financial_goal",
    });
  }

  const exceededBudgets = budgetUsage(data, end.slice(0, 7)).filter((b) => b.percent >= 90);
  if (exceededBudgets.length > 0) {
    const worst = exceededBudgets.sort((a, b) => b.percent - a.percent)[0];
    recommendations.push({
      id: "budget-pressure",
      priority: worst.percent >= 100 ? "alta" : "media",
      title: `Ajustar gastos em ${worst.name} (${Math.round(worst.percent)}% do limite)`,
      why: `O orçamento mensal de ${worst.name} está ${worst.percent >= 100 ? "acima do teto" : "próximo do limite"} definido.`,
      impact: "Preserva sua capacidade mensal de aporte e evita comprometer o fluxo de caixa.",
      actionLabel: "Ver orçamentos",
      actionHref: "/orcamentos",
    });
  }

  if (topAsset && topAsset.sharePct > 25 && byAsset.length > 1) {
    recommendations.push({
      id: "asset-concentration",
      priority: topAsset.sharePct > 40 ? "alta" : "media",
      title: `Reduzir concentração em ${topAsset.ticker} (${topAsset.sharePct}%)`,
      why: `Um único ativo representa ${topAsset.sharePct}% da sua carteira investida, acima da faixa prudencial de 20%.`,
      impact: "Diminui a volatilidade específica e melhora o índice de diversificação nos próximos aportes.",
      actionLabel: "Simular rebalanceamento",
      actionHref: "/calculadora?tab=portfolio_rebalance",
    });
  }

  if (cryptoPct > 15) {
    recommendations.push({
      id: "crypto-exposure",
      priority: "media",
      title: `Monitorar exposição em criptoativos (${cryptoPct}%)`,
      why: "Criptomoedas possuem alta volatilidade e representam mais de 15% do seu portfólio atual.",
      impact: "Realizar rebalanceamento com novos aportes em renda fixa ou FIIs equilibra o risco da carteira.",
      actionLabel: "Avaliar próximo aporte",
      actionHref: "/posso-comprar",
    });
  }

  if (safeMonthlyInvestmentDec.gt(0) && recommendations.length < 5) {
    recommendations.push({
      id: "monthly-investment-capacity",
      priority: "baixa",
      title: "Aproveitar sua capacidade mensal de aporte",
      why: `Com base no seu histórico recente, você tem capacidade segura estimada de R$ ${safeMonthlyInvestmentDec.toFixed(2)}/mês.`,
      impact: "Aportes constantes aceleram os juros compostos rumo à independência financeira.",
      actionLabel: "Avaliar com Posso comprar?",
      actionHref: "/posso-comprar",
    });
  }

  // 9. Metas financeiras
  const validGoals = (data.goals ?? []).filter((g) => g.status !== "cancelled");
  const activeGoals = validGoals.filter((g) => g.status === "active");
  const completedGoalsCount = validGoals.filter((g) => g.status === "completed").length;
  const totalGoalTargetDec = validGoals.reduce((acc, g) => acc.plus(num(g.target_amount)), new D(0));
  const totalGoalSavedDec = validGoals.reduce(
    (acc, g) => acc.plus(num(g.accumulated_amount)),
    new D(0),
  );
  const overallGoalProgressPct = totalGoalTargetDec.gt(0)
    ? Math.min(100, totalGoalSavedDec.div(totalGoalTargetDec).mul(100).toDecimalPlaces(1).toNumber())
    : 0;
  const goalItems = activeGoals.slice(0, 6).map((g) => {
    const p = goalProgress(g);
    return {
      id: g.id,
      name: text(g.name),
      saved: p.saved.toDecimalPlaces(2).toNumber(),
      target: p.target.toDecimalPlaces(2).toNumber(),
      percent: Number(p.percent.toFixed(1)),
      monthlyRequired: p.monthly.toDecimalPlaces(2).toNumber(),
      deadline: g.deadline ? text(g.deadline) : null,
    };
  });

  // 10. Rentabilidade da carteira
  const totalCostDec = ps.reduce((acc, p) => acc.plus(p.cost), new D(0));
  const capitalGainDec = totalInvestedDec.minus(totalCostDec);
  const portfolioReturnPct = totalCostDec.gt(0)
    ? capitalGainDec.div(totalCostDec).mul(100).toDecimalPlaces(2).toNumber()
    : 0;
  const rankedByReturn = [...ps]
    .filter((p) => p.cost.gt(0))
    .map((p) => ({
      ticker: text(p.asset?.ticker) || "Ativo",
      returnPct: p.rate.toDecimalPlaces(2).toNumber(),
      value: p.value.toDecimalPlaces(2).toNumber(),
    }))
    .sort((a, b) => b.returnPct - a.returnPct);

  // 11. Dividendos e proventos
  const twelveMonthsStart = format(subMonths(parseISO(end), 12), "yyyy-MM-dd");
  const periodDividends = (data.dividends ?? []).filter(
    (d) => text(d.payment_date) >= start && text(d.payment_date) <= end,
  );
  const twelveMonthsDividends = (data.dividends ?? []).filter(
    (d) => text(d.payment_date) >= twelveMonthsStart && text(d.payment_date) <= end,
  );
  const periodDivTotalDec = sum(periodDividends, "amount");
  const twelveMonthsDivTotalDec = sum(twelveMonthsDividends, "amount");
  const trailingYieldPct = totalInvestedDec.gt(0)
    ? twelveMonthsDivTotalDec.div(totalInvestedDec).mul(100).toDecimalPlaces(2).toNumber()
    : 0;
  const divAssetMap = new Map((data.assets ?? []).map((a) => [text(a.id), text(a.ticker) || "Ativo"]));
  const divByTicker = new Map<string, number>();
  for (const d of twelveMonthsDividends) {
    const t = divAssetMap.get(text(d.asset_id)) || "Ativo";
    divByTicker.set(t, (divByTicker.get(t) ?? 0) + num(d.amount).toNumber());
  }
  const topDividendPayers = [...divByTicker.entries()]
    .map(([ticker, total]) => ({ ticker, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const totalSpendingCat = currentCategories.reduce((s, c) => s + c.value, 0);
  const topSpendingCategories = currentCategories.slice(0, 5).map((c) => ({
    name: c.name,
    value: c.value,
    sharePct: totalSpendingCat > 0 ? Number(((c.value / totalSpendingCat) * 100).toFixed(1)) : 0,
  }));

  return {
    summary: {
      wealth: ov.wealth.toDecimalPlaces(2).toNumber(),
      cash: ov.cash.toDecimalPlaces(2).toNumber(),
      invested: ov.value.toDecimalPlaces(2).toNumber(),
      income: currentFlow.income.toDecimalPlaces(2).toNumber(),
      expense: currentFlow.expense.toDecimalPlaces(2).toNumber(),
      balance: currentFlow.balance.toDecimalPlaces(2).toNumber(),
      savingsRatePct,
      topCategory: currentCategories[0]
        ? { name: currentCategories[0].name, value: currentCategories[0].value }
        : null,
      topSpendingCategories,
    },
    comparison: {
      previousStart,
      previousEnd,
      currentIncome: currentFlow.income.toDecimalPlaces(2).toNumber(),
      previousIncome: previousFlow.income.toDecimalPlaces(2).toNumber(),
      incomeDeltaPct,
      currentExpense: currentFlow.expense.toDecimalPlaces(2).toNumber(),
      previousExpense: previousFlow.expense.toDecimalPlaces(2).toNumber(),
      expenseDeltaPct,
      categoryDeltas,
    },
    capacity: {
      avgMonthlyIncome: avgMonthlyIncomeDec.toDecimalPlaces(2).toNumber(),
      avgMonthlyExpense: effectiveMonthlyOutflow.toDecimalPlaces(2).toNumber(),
      recurringMonthlyExpense: recurringExpenseDec.toDecimalPlaces(2).toNumber(),
      safeMonthlyInvestment: safeMonthlyInvestmentDec.toDecimalPlaces(2).toNumber(),
      recommendedMinInvestment: recommendedMinInvestmentDec.toDecimalPlaces(2).toNumber(),
      currentCapacityPct,
    },
    emergency: {
      monthlyCostReference: monthlyCostReferenceDec.toDecimalPlaces(2).toNumber(),
      targetSixMonths: targetSixMonthsDec.toDecimalPlaces(2).toNumber(),
      emergencyGoalsSaved: emergencyGoalsSavedDec.toDecimalPlaces(2).toNumber(),
      immediateLiquidCash: liquidAccountsDec.plus(cdiAndTreasuryDec).toDecimalPlaces(2).toNumber(),
      effectiveReserve: effectiveReserveDec.toDecimalPlaces(2).toNumber(),
      monthsCovered,
      progressPct: emergencyProgressPct,
      status: emergencyStatus,
    },
    debts: {
      creditCardBalance: creditCardBalanceDec.toDecimalPlaces(2).toNumber(),
      cardPaymentsInPeriod: cardPaymentsInPeriodDec.toDecimalPlaces(2).toNumber(),
      overduePendingAmount: overduePendingAmountDec.toDecimalPlaces(2).toNumber(),
      overduePendingCount: overduePending.length,
      upcomingPendingAmount: upcomingPendingAmountDec.toDecimalPlaces(2).toNumber(),
      upcomingPendingCount: upcomingPending.length,
      debtToIncomePct,
      pressure: debtPressure,
    },
    portfolio: {
      totalInvested: totalInvestedDec.toDecimalPlaces(2).toNumber(),
      assetCount: byAsset.length,
      classCount: byClass.length,
      hhi: Number(hhi.toFixed(3)),
      diversificationScore,
      diversificationLevel,
      topAsset,
      topClass,
      byClass,
      byAsset,
    },
    liquidity: {
      totalWealth: totalLiquidBaseDec.toDecimalPlaces(2).toNumber(),
      immediateAmount: immediateAmountDec.toDecimalPlaces(2).toNumber(),
      immediatePct: totalLiquidBaseDec.gt(0)
        ? immediateAmountDec.div(totalLiquidBaseDec).mul(100).toDecimalPlaces(1).toNumber()
        : 0,
      shortTermAmount: shortTermAmountDec.toDecimalPlaces(2).toNumber(),
      shortTermPct: totalLiquidBaseDec.gt(0)
        ? shortTermAmountDec.div(totalLiquidBaseDec).mul(100).toDecimalPlaces(1).toNumber()
        : 0,
      mediumLongAmount: mediumLongAmountDec.toDecimalPlaces(2).toNumber(),
      mediumLongPct: totalLiquidBaseDec.gt(0)
        ? mediumLongAmountDec.div(totalLiquidBaseDec).mul(100).toDecimalPlaces(1).toNumber()
        : 0,
    },
    risk: {
      score: riskScore,
      profile: riskProfile,
      fixedIncomePct,
      variableIncomePct,
      cryptoPct,
      explanation: riskExplanation,
    },
    goals: {
      activeCount: activeGoals.length,
      completedCount: completedGoalsCount,
      totalTarget: totalGoalTargetDec.toDecimalPlaces(2).toNumber(),
      totalSaved: totalGoalSavedDec.toDecimalPlaces(2).toNumber(),
      overallProgressPct: overallGoalProgressPct,
      items: goalItems,
    },
    profitability: {
      totalCost: totalCostDec.toDecimalPlaces(2).toNumber(),
      currentValue: totalInvestedDec.toDecimalPlaces(2).toNumber(),
      capitalGain: capitalGainDec.toDecimalPlaces(2).toNumber(),
      returnPct: portfolioReturnPct,
      bestAsset: rankedByReturn[0] ?? null,
      worstAsset: rankedByReturn.length > 1 ? rankedByReturn[rankedByReturn.length - 1] : null,
    },
    dividends: {
      periodTotal: periodDivTotalDec.toDecimalPlaces(2).toNumber(),
      twelveMonthsTotal: twelveMonthsDivTotalDec.toDecimalPlaces(2).toNumber(),
      monthlyAvgTwelveMonths: twelveMonthsDivTotalDec.div(12).toDecimalPlaces(2).toNumber(),
      trailingYieldPct,
      topPayers: topDividendPayers,
    },
    recommendations,
  };
}

