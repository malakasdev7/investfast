import { FinancialDecimal as D } from "./decimal";

export type CalculatorType =
  | "compound_interest"
  | "monthly_contributions"
  | "financial_goal"
  | "financial_independence"
  | "real_return"
  | "investment_comparator"
  | "portfolio_rebalance"
  | "debt_payoff"
  | "stocks_fiis"
  | "fixed_income"
  | "crypto";

export type RatePeriod = "monthly" | "yearly";
export type TermUnit = "months" | "years";
export type CompoundingMode = "monthly" | "yearly" | "continuous";

export type CompoundInterestPoint = {
  month: number;
  label: string;
  invested: number;
  interest: number;
  total: number;
  netTotal: number;
  realTotal: number;
};

export function resolveMonths(termValue: number, termUnit: TermUnit = "months"): number {
  const raw = termUnit === "years" ? termValue * 12 : termValue;
  return Math.max(1, Math.min(600, Math.round(raw || 1)));
}

export function annualToMonthlyRate(
  ratePct: number,
  ratePeriod: RatePeriod = "yearly",
  compounding: CompoundingMode = "monthly",
): number {
  const r = new D(ratePct).div(100);
  if (r.lte(-1)) return 0;

  if (compounding === "continuous") {
    const annualDecimal = ratePeriod === "monthly" ? r.toNumber() * 12 : r.toNumber();
    return Math.exp(annualDecimal / 12) - 1;
  }

  if (ratePeriod === "monthly") {
    return r.toNumber();
  }

  if (compounding === "yearly") {
    return Math.pow(1 + r.toNumber(), 1 / 12) - 1;
  }

  return Math.pow(1 + r.toNumber(), 1 / 12) - 1;
}

export function incomeTaxRateForMonths(months: number): number {
  const days = months * 30;
  if (days <= 180) return 22.5;
  if (days <= 360) return 20.0;
  if (days <= 720) return 17.5;
  return 15.0;
}

// 1 & 2. Juros Compostos e Aportes Mensais (com capitalização, IR, adm e reajuste anual)
export function calculateCompoundInterest(params: {
  initialAmount: number;
  monthlyContribution: number;
  annualRatePct: number;
  ratePeriod?: RatePeriod;
  annualInflationPct?: number;
  months: number;
  termUnit?: TermUnit;
  compounding?: CompoundingMode;
  taxRatePct?: number;
  adminFeePct?: number;
  annualStepUpPct?: number;
}) {
  const months = resolveMonths(params.months, params.termUnit ?? "months");
  const ratePeriod = params.ratePeriod ?? "yearly";
  const compounding = params.compounding ?? "monthly";
  const grossMonthlyRate = annualToMonthlyRate(params.annualRatePct, ratePeriod, compounding);
  const monthlyAdminFee = annualToMonthlyRate(Math.max(0, params.adminFeePct ?? 0), "yearly", "monthly");
  const effectiveMonthlyRate = new D(Math.max(-0.99, grossMonthlyRate - monthlyAdminFee));
  const monthlyInflation = new D(annualToMonthlyRate(params.annualInflationPct ?? 4.5, "yearly", "monthly"));
  const stepUp = new D(params.annualStepUpPct ?? 0).div(100);
  const taxRate = new D(Math.max(0, Math.min(100, params.taxRatePct ?? 0))).div(100);

  let total = new D(Math.max(0, params.initialAmount));
  let grossNoFeeTotal = new D(Math.max(0, params.initialAmount));
  let invested = new D(Math.max(0, params.initialAmount));
  let currentContribution = new D(Math.max(0, params.monthlyContribution));
  let cumulativeInflationFactor = new D(1);

  const series: CompoundInterestPoint[] = [
    {
      month: 0,
      label: "Início",
      invested: invested.toDecimalPlaces(2).toNumber(),
      interest: 0,
      total: total.toDecimalPlaces(2).toNumber(),
      netTotal: total.toDecimalPlaces(2).toNumber(),
      realTotal: total.toDecimalPlaces(2).toNumber(),
    },
  ];

  for (let m = 1; m <= months; m++) {
    if (m > 1 && (m - 1) % 12 === 0 && stepUp.gt(0)) {
      currentContribution = currentContribution.mul(new D(1).plus(stepUp));
    }
    grossNoFeeTotal = grossNoFeeTotal.mul(1 + grossMonthlyRate).plus(currentContribution);
    total = total.mul(new D(1).plus(effectiveMonthlyRate)).plus(currentContribution);
    invested = invested.plus(currentContribution);
    cumulativeInflationFactor = cumulativeInflationFactor.mul(new D(1).plus(monthlyInflation));

    const interest = total.minus(invested);
    const pointTax = interest.gt(0) ? interest.mul(taxRate) : new D(0);
    const pointNet = total.minus(pointTax);
    const realTotal = pointNet.div(cumulativeInflationFactor);

    if (months <= 36 || m % 3 === 0 || m === months) {
      series.push({
        month: m,
        label: m % 12 === 0 ? `Ano ${m / 12}` : `M${m}`,
        invested: invested.toDecimalPlaces(2).toNumber(),
        interest: interest.toDecimalPlaces(2).toNumber(),
        total: total.toDecimalPlaces(2).toNumber(),
        netTotal: pointNet.toDecimalPlaces(2).toNumber(),
        realTotal: realTotal.toDecimalPlaces(2).toNumber(),
      });
    }
  }

  const totalInterest = total.minus(invested);
  const taxPaid = totalInterest.gt(0) ? totalInterest.mul(taxRate) : new D(0);
  const finalNetTotal = total.minus(taxPaid);
  const adminFeesPaid = D.max(0, grossNoFeeTotal.minus(total));
  const finalRealTotal = finalNetTotal.div(cumulativeInflationFactor);
  const totalReturnPct = invested.gt(0)
    ? finalNetTotal.minus(invested).div(invested).mul(100)
    : new D(0);
  const years = months / 12;
  const annualizedReturnPct =
    invested.gt(0) && finalNetTotal.gt(0) && years > 0
      ? (Math.pow(finalNetTotal.div(invested).toNumber(), 1 / years) - 1) * 100
      : 0;
  const realReturnPct =
    invested.gt(0)
      ? finalRealTotal.minus(invested).div(invested).mul(100)
      : new D(0);

  return {
    months,
    finalTotal: total.toDecimalPlaces(2).toNumber(),
    finalNetTotal: finalNetTotal.toDecimalPlaces(2).toNumber(),
    taxPaid: taxPaid.toDecimalPlaces(2).toNumber(),
    adminFeesPaid: adminFeesPaid.toDecimalPlaces(2).toNumber(),
    totalInvested: invested.toDecimalPlaces(2).toNumber(),
    totalInterest: totalInterest.toDecimalPlaces(2).toNumber(),
    netInterest: totalInterest.minus(taxPaid).toDecimalPlaces(2).toNumber(),
    realFinalTotal: finalRealTotal.toDecimalPlaces(2).toNumber(),
    totalReturnPct: totalReturnPct.toDecimalPlaces(2).toNumber(),
    annualizedReturnPct: Number(annualizedReturnPct.toFixed(2)),
    realReturnPct: realReturnPct.toDecimalPlaces(2).toNumber(),
    interestSharePct: total.gt(0)
      ? totalInterest.div(total).mul(100).toDecimalPlaces(1).toNumber()
      : 0,
    finalMonthlyContribution: currentContribution.toDecimalPlaces(2).toNumber(),
    series,
  };
}

// 3. Meta Financeira (calcula aporte necessário e prazo para atingir meta)
export function calculateFinancialGoal(params: {
  targetAmount: number;
  currentAmount: number;
  annualRatePct: number;
  ratePeriod?: RatePeriod;
  months: number;
  termUnit?: TermUnit;
  plannedMonthlyContribution?: number;
}) {
  const months = resolveMonths(params.months, params.termUnit ?? "months");
  const target = new D(Math.max(0, params.targetAmount));
  const current = new D(Math.max(0, params.currentAmount));
  const i = annualToMonthlyRate(params.annualRatePct, params.ratePeriod ?? "yearly", "monthly");

  const futureOfCurrent = current.mul(Math.pow(1 + i, months));
  const remainingTarget = D.max(0, target.minus(futureOfCurrent));

  let requiredMonthly = new D(0);
  if (remainingTarget.gt(0)) {
    if (Math.abs(i) < 1e-9) {
      requiredMonthly = remainingTarget.div(months);
    } else {
      const factor = (Math.pow(1 + i, months) - 1) / i;
      requiredMonthly = remainingTarget.div(factor);
    }
  }

  // Prazo necessário mantendo o aporte mensal planejado
  const planned = new D(Math.max(0, params.plannedMonthlyContribution ?? 0));
  let monthsToReachGoal = 0;
  if (current.lt(target)) {
    if (planned.lte(0) && i <= 0) {
      monthsToReachGoal = 600;
    } else {
      let cursor = current;
      while (cursor.lt(target) && monthsToReachGoal < 600) {
        monthsToReachGoal += 1;
        cursor = cursor.mul(1 + i).plus(planned);
      }
    }
  }

  const projection = calculateCompoundInterest({
    initialAmount: current.toNumber(),
    monthlyContribution: requiredMonthly.toNumber(),
    annualRatePct: params.annualRatePct,
    ratePeriod: params.ratePeriod,
    months,
  });

  return {
    targetAmount: target.toDecimalPlaces(2).toNumber(),
    currentAmount: current.toDecimalPlaces(2).toNumber(),
    requiredMonthlyContribution: requiredMonthly.toDecimalPlaces(2).toNumber(),
    futureOfCurrentAmount: futureOfCurrent.toDecimalPlaces(2).toNumber(),
    totalContributionsToMake: requiredMonthly.mul(months).toDecimalPlaces(2).toNumber(),
    projectedInterestEarned: projection.totalInterest,
    monthsToReachGoal,
    yearsToReachGoal: Number((monthsToReachGoal / 12).toFixed(1)),
    reachableWithin50Years: monthsToReachGoal < 600 || current.gte(target),
    series: projection.series,
  };
}

// 4. Independência Financeira (Regra de retirada segura + tempo para atingir)
export function calculateFinancialIndependence(params: {
  desiredMonthlyIncome: number;
  currentPatrimony: number;
  monthlyContribution: number;
  annualNominalReturnPct: number;
  annualInflationPct: number;
  safeWithdrawalRateAnnualPct?: number;
}) {
  const nominal = new D(params.annualNominalReturnPct).div(100);
  const inflation = new D(params.annualInflationPct).div(100);
  const realAnnualRate = new D(1).plus(nominal).div(new D(1).plus(inflation)).minus(1);
  const realAnnualPct = realAnnualRate.mul(100).toNumber();

  const swrPct =
    params.safeWithdrawalRateAnnualPct && params.safeWithdrawalRateAnnualPct > 0
      ? params.safeWithdrawalRateAnnualPct
      : Math.max(3.2, Math.min(6.0, realAnnualPct > 0 ? realAnnualPct : 4.0));

  const annualDesired = new D(Math.max(0, params.desiredMonthlyIncome)).mul(12);
  const requiredPatrimony = annualDesired.div(new D(swrPct).div(100));

  const monthlyRealRate = annualToMonthlyRate(realAnnualPct);
  let balance = new D(Math.max(0, params.currentPatrimony));
  const contribution = new D(Math.max(0, params.monthlyContribution));
  let monthsToReach = 0;

  const series: { label: string; patrimony: number; target: number; passiveIncome: number }[] = [];
  const targetNum = requiredPatrimony.toDecimalPlaces(2).toNumber();

  while (balance.lt(requiredPatrimony) && monthsToReach < 720) {
    monthsToReach += 1;
    balance = balance.mul(1 + monthlyRealRate).plus(contribution);
    if (monthsToReach % 12 === 0 || balance.gte(requiredPatrimony)) {
      const passive = balance.mul(swrPct / 100).div(12);
      series.push({
        label: `Ano ${(monthsToReach / 12).toFixed(1).replace(".0", "")}`,
        patrimony: balance.toDecimalPlaces(2).toNumber(),
        target: targetNum,
        passiveIncome: passive.toDecimalPlaces(2).toNumber(),
      });
    }
  }

  return {
    requiredPatrimony: targetNum,
    realAnnualReturnPct: Number(realAnnualPct.toFixed(2)),
    safeWithdrawalRatePct: Number(swrPct.toFixed(2)),
    monthsToIndependence: monthsToReach,
    yearsToIndependence: Number((monthsToReach / 12).toFixed(1)),
    currentSustainableIncome: new D(params.currentPatrimony)
      .mul(swrPct / 100)
      .div(12)
      .toDecimalPlaces(2)
      .toNumber(),
    reachableWithin60Years: monthsToReach < 720,
    series,
  };
}

// 5. Rentabilidade Real (Equação de Fisher + desconto de IR e taxa de administração)
export function calculateRealReturn(params: {
  nominalAnnualPct: number;
  inflationAnnualPct: number;
  taxRatePct?: number;
  adminFeePct?: number;
  amount: number;
  years: number;
}) {
  const tax = new D(Math.max(0, params.taxRatePct ?? 0)).div(100);
  const grossRate = new D(params.nominalAnnualPct).div(100);
  const feeRate = new D(Math.max(0, params.adminFeePct ?? 0)).div(100);
  const rateAfterFee = D.max(-0.99, grossRate.minus(feeRate));
  const netNominalRate = rateAfterFee.mul(new D(1).minus(tax));
  const inflationRate = new D(params.inflationAnnualPct).div(100);

  const realRate = new D(1)
    .plus(netNominalRate)
    .div(new D(1).plus(inflationRate))
    .minus(1);

  const years = Math.max(1, Math.min(50, params.years));
  const initial = new D(Math.max(0, params.amount));
  const nominalFinal = initial.mul(Math.pow(1 + netNominalRate.toNumber(), years));
  const realFinal = initial.mul(Math.pow(1 + realRate.toNumber(), years));
  const inflationCorrosion = nominalFinal.minus(realFinal);

  return {
    grossNominalAnnualPct: Number(params.nominalAnnualPct.toFixed(2)),
    netNominalAnnualPct: netNominalRate.mul(100).toDecimalPlaces(2).toNumber(),
    inflationAnnualPct: Number(params.inflationAnnualPct.toFixed(2)),
    realAnnualPct: realRate.mul(100).toDecimalPlaces(2).toNumber(),
    nominalFinalAmount: nominalFinal.toDecimalPlaces(2).toNumber(),
    realPurchasingPower: realFinal.toDecimalPlaces(2).toNumber(),
    inflationLossAmount: inflationCorrosion.toDecimalPlaces(2).toNumber(),
  };
}

// 6. Comparador de até 5 investimentos personalizados
export type ComparableInvestmentOption = {
  name: string;
  annualRatePct: number;
  taxFree?: boolean;
  customTaxRatePct?: number;
  adminFeePct?: number;
};

export function compareCustomInvestments(params: {
  initialAmount: number;
  monthlyContribution: number;
  months: number;
  inflationAnnualPct?: number;
  options: ComparableInvestmentOption[];
}) {
  const months = Math.max(1, Math.min(360, Math.round(params.months)));
  const defaultIr = incomeTaxRateForMonths(months);
  const inflationPct = params.inflationAnnualPct ?? 4.5;

  const ranked = params.options.slice(0, 5).map((opt) => {
    const taxRatePct = opt.taxFree ? 0 : (opt.customTaxRatePct ?? defaultIr);
    const sim = calculateCompoundInterest({
      initialAmount: params.initialAmount,
      monthlyContribution: params.monthlyContribution,
      annualRatePct: opt.annualRatePct,
      annualInflationPct: inflationPct,
      months,
      taxRatePct,
      adminFeePct: opt.adminFeePct ?? 0,
    });

    return {
      name: opt.name || "Investimento",
      annualGrossPct: Number(opt.annualRatePct.toFixed(2)),
      taxRatePct,
      adminFeePct: Number((opt.adminFeePct ?? 0).toFixed(2)),
      grossTotal: sim.finalTotal,
      taxAmount: sim.taxPaid,
      adminFeesPaid: sim.adminFeesPaid,
      netTotal: sim.finalNetTotal,
      netProfit: Number((sim.finalNetTotal - sim.totalInvested).toFixed(2)),
      realFinalTotal: sim.realFinalTotal,
      totalReturnPct: sim.totalReturnPct,
      annualizedReturnPct: sim.annualizedReturnPct,
    };
  });

  ranked.sort((a, b) => b.netTotal - a.netTotal);

  return {
    months,
    defaultIrPct: defaultIr,
    winner: ranked[0] ?? null,
    options: ranked,
  };
}

// 10. Renda Fixa completa: CDB, LCI, LCA, Tesouro Selic, Tesouro IPCA+, Tesouro Prefixado e Poupança
export function calculateFixedIncomeAndComparator(params: {
  amount: number;
  monthlyContribution: number;
  months: number;
  cdiAnnualPct: number;
  selicAnnualPct?: number;
  ipcaAnnualPct: number;
  cdbPctOfCdi: number;
  lciLcaPctOfCdi: number;
  tesouroIpcaSpreadPct: number;
  tesouroPrefixadoPct?: number;
}) {
  const months = Math.max(1, Math.min(360, Math.round(params.months)));
  const irPct = incomeTaxRateForMonths(months);
  const irDecimal = irPct / 100;
  const selicAnnual = params.selicAnnualPct ?? params.cdiAnnualPct;
  const prefixadoAnnual = params.tesouroPrefixadoPct ?? Math.max(9.5, params.cdiAnnualPct * 1.05);

  const cdbGrossAnnual = (params.cdiAnnualPct * params.cdbPctOfCdi) / 100;
  const lciGrossAnnual = (params.cdiAnnualPct * params.lciLcaPctOfCdi) / 100;
  const tesouroSelicAnnual = selicAnnual;
  const tesouroIpcaAnnual =
    ((1 + params.ipcaAnnualPct / 100) * (1 + params.tesouroIpcaSpreadPct / 100) - 1) * 100;
  const poupancaAnnual = params.cdiAnnualPct > 8.5 ? 6.17 : params.cdiAnnualPct * 0.7;

  const evaluateFixed = (
    name: string,
    annualRatePct: number,
    taxFree: boolean,
    adminFeePct = 0,
  ) => {
    const sim = calculateCompoundInterest({
      initialAmount: params.amount,
      monthlyContribution: params.monthlyContribution,
      annualRatePct,
      annualInflationPct: params.ipcaAnnualPct,
      months,
      taxRatePct: taxFree ? 0 : irPct,
      adminFeePct,
    });
    return {
      name,
      grossTotal: sim.finalTotal,
      taxAmount: sim.taxPaid,
      netTotal: sim.finalNetTotal,
      netProfit: Number((sim.finalNetTotal - sim.totalInvested).toFixed(2)),
      realNetTotal: sim.realFinalTotal,
      annualGrossPct: Number(annualRatePct.toFixed(2)),
      annualizedNetPct: sim.annualizedReturnPct,
    };
  };

  const equivalentCdbForLci = params.lciLcaPctOfCdi / (1 - irDecimal);

  const ranking = [
    evaluateFixed(`CDB (${params.cdbPctOfCdi}% CDI)`, cdbGrossAnnual, false, 0),
    evaluateFixed(`LCI (${params.lciLcaPctOfCdi}% CDI · Isenta)`, lciGrossAnnual, true, 0),
    evaluateFixed(`LCA (${params.lciLcaPctOfCdi}% CDI · Isenta)`, lciGrossAnnual, true, 0),
    evaluateFixed(`Tesouro Selic (${selicAnnual.toFixed(2)}% a.a.)`, tesouroSelicAnnual, false, 0.2),
    evaluateFixed(
      `Tesouro IPCA+ (${params.tesouroIpcaSpreadPct}% + IPCA)`,
      tesouroIpcaAnnual,
      false,
      0.2,
    ),
    evaluateFixed(`Tesouro Prefixado (${prefixadoAnnual.toFixed(2)}% a.a.)`, prefixadoAnnual, false, 0.2),
    evaluateFixed("Poupança (Isenta)", poupancaAnnual, true, 0),
  ].sort((a, b) => b.netTotal - a.netTotal);

  const baseSim = calculateCompoundInterest({
    initialAmount: params.amount,
    monthlyContribution: params.monthlyContribution,
    annualRatePct: cdbGrossAnnual,
    months,
  });

  return {
    irRatePct: irPct,
    totalInvested: baseSim.totalInvested,
    equivalentCdbPctForLci: Number(equivalentCdbForLci.toFixed(1)),
    winner: ranking[0],
    options: ranking,
  };
}

// 7. Carteira e Rebalanceamento
export type RebalanceSlice = {
  name: string;
  currentValue: number;
  targetPct: number;
};

export function calculatePortfolioRebalance(params: {
  slices: RebalanceSlice[];
  newContribution: number;
}) {
  const currentTotal = params.slices.reduce(
    (acc, s) => acc.plus(Math.max(0, s.currentValue)),
    new D(0),
  );
  const contribution = new D(Math.max(0, params.newContribution));
  const futureTotal = currentTotal.plus(contribution);

  const totalTargetPct = params.slices.reduce((acc, s) => acc + Math.max(0, s.targetPct), 0);
  const normalizer = totalTargetPct > 0 ? 100 / totalTargetPct : 0;

  const rawGaps = params.slices.map((s) => {
    const normalizedTargetPct = Math.max(0, s.targetPct) * normalizer;
    const idealValue = futureTotal.mul(normalizedTargetPct).div(100);
    const diff = idealValue.minus(Math.max(0, s.currentValue));
    return {
      ...s,
      normalizedTargetPct: Number(normalizedTargetPct.toFixed(1)),
      currentSharePct: currentTotal.gt(0)
        ? Number(((s.currentValue / currentTotal.toNumber()) * 100).toFixed(1))
        : 0,
      idealValue: idealValue.toDecimalPlaces(2).toNumber(),
      fullAdjustment: diff.toDecimalPlaces(2).toNumber(),
      positiveGap: diff.gt(0) ? diff : new D(0),
    };
  });

  const sumPositiveGaps = rawGaps.reduce((acc, g) => acc.plus(g.positiveGap), new D(0));

  const items = rawGaps.map((g) => {
    const suggestedBuyOnly =
      contribution.gt(0) && sumPositiveGaps.gt(0)
        ? contribution.mul(g.positiveGap).div(sumPositiveGaps).toDecimalPlaces(2).toNumber()
        : 0;
    const afterBuyOnlyValue = g.currentValue + suggestedBuyOnly;
    const afterBuyOnlyPct = futureTotal.gt(0)
      ? Number(((afterBuyOnlyValue / futureTotal.toNumber()) * 100).toFixed(1))
      : 0;

    return {
      name: g.name,
      currentValue: Number(g.currentValue.toFixed(2)),
      currentSharePct: g.currentSharePct,
      targetPct: g.normalizedTargetPct,
      idealValue: g.idealValue,
      fullAdjustment: g.fullAdjustment,
      suggestedFromContribution: suggestedBuyOnly,
      afterContributionPct: afterBuyOnlyPct,
    };
  });

  return {
    currentTotal: currentTotal.toDecimalPlaces(2).toNumber(),
    newContribution: contribution.toDecimalPlaces(2).toNumber(),
    futureTotal: futureTotal.toDecimalPlaces(2).toNumber(),
    totalTargetPct: Number(totalTargetPct.toFixed(1)),
    items,
  };
}

// 8. Empréstimos e Dívidas (Price vs SAC + economia por amortização extra)
export function calculateDebtPayoff(params: {
  principal: number;
  monthlyRatePct: number;
  months: number;
  extraMonthlyPayment?: number;
}) {
  const principal = new D(Math.max(0, params.principal));
  const n = Math.max(1, Math.min(480, Math.round(params.months)));
  const i = Math.max(0, params.monthlyRatePct) / 100;
  const extra = new D(Math.max(0, params.extraMonthlyPayment ?? 0));

  const pmtPrice =
    i === 0
      ? principal.div(n)
      : principal.mul((i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1));

  let balPrice = principal;
  let totalInterestPrice = new D(0);
  for (let m = 1; m <= n; m++) {
    const interest = balPrice.mul(i);
    const amort = pmtPrice.minus(interest);
    totalInterestPrice = totalInterestPrice.plus(interest);
    balPrice = D.max(0, balPrice.minus(amort));
  }

  let balExtra = principal;
  let totalInterestExtra = new D(0);
  let monthsWithExtra = 0;
  const schedule: {
    month: number;
    label: string;
    balanceStandard: number;
    balanceWithExtra: number;
  }[] = [];

  let balStdCursor = principal;
  for (let m = 1; m <= n; m++) {
    const intStd = balStdCursor.mul(i);
    balStdCursor = D.max(0, balStdCursor.minus(pmtPrice.minus(intStd)));

    if (balExtra.gt(0)) {
      monthsWithExtra = m;
      const intExt = balExtra.mul(i);
      totalInterestExtra = totalInterestExtra.plus(intExt);
      const payment = pmtPrice.plus(extra);
      const amortExt = payment.minus(intExt);
      balExtra = D.max(0, balExtra.minus(amortExt));
    }

    if (n <= 36 || m % 3 === 0 || m === n) {
      schedule.push({
        month: m,
        label: `M${m}`,
        balanceStandard: balStdCursor.toDecimalPlaces(2).toNumber(),
        balanceWithExtra: balExtra.toDecimalPlaces(2).toNumber(),
      });
    }
  }

  const sacAmort = principal.div(n);
  const firstSacInstallment = sacAmort.plus(principal.mul(i));
  const lastSacInstallment = sacAmort.plus(sacAmort.mul(i));
  const totalInterestSac = principal.mul(i).mul(n + 1).div(2);

  return {
    priceInstallment: pmtPrice.toDecimalPlaces(2).toNumber(),
    totalPaidPrice: pmtPrice.mul(n).toDecimalPlaces(2).toNumber(),
    totalInterestPrice: totalInterestPrice.toDecimalPlaces(2).toNumber(),
    sacFirstInstallment: firstSacInstallment.toDecimalPlaces(2).toNumber(),
    sacLastInstallment: lastSacInstallment.toDecimalPlaces(2).toNumber(),
    totalInterestSac: totalInterestSac.toDecimalPlaces(2).toNumber(),
    monthsWithExtra,
    monthsSaved: Math.max(0, n - monthsWithExtra),
    interestSavedWithExtra: D.max(0, totalInterestPrice.minus(totalInterestExtra))
      .toDecimalPlaces(2)
      .toNumber(),
    schedule,
  };
}

// 9. Ações e FIIs (Preço Médio, Dividendos, Yield on Cost e Preço Teto de Bazin)
export function calculateStocksFiisSnowball(params: {
  sharePrice: number;
  monthlyDividendPerShare: number;
  initialShares: number;
  monthlyNewShares: number;
  annualPriceAppreciationPct: number;
  months: number;
  reinvestDividends: boolean;
  desiredAnnualYieldPct?: number;
}) {
  const price0 = Math.max(0.01, params.sharePrice);
  const div0 = Math.max(0, params.monthlyDividendPerShare);
  const months = Math.max(1, Math.min(480, Math.round(params.months)));
  const monthlyAppreciation = annualToMonthlyRate(params.annualPriceAppreciationPct);
  const monthlyYieldRatio = div0 / price0;

  let shares = Math.max(0, Math.floor(params.initialShares));
  let paidShares = shares;
  let cashRemainder = 0;
  let currentPrice = price0;
  let totalOutOfPocket = shares * price0;
  let cumulativeDividends = 0;

  const series: {
    month: number;
    label: string;
    shares: number;
    monthlyPassiveIncome: number;
    patrimony: number;
  }[] = [];

  for (let m = 1; m <= months; m++) {
    currentPrice = currentPrice * (1 + monthlyAppreciation);
    const currentDivPerShare = currentPrice * monthlyYieldRatio;
    const monthDividends = shares * currentDivPerShare;
    cumulativeDividends += monthDividends;

    const newBought = Math.max(0, Math.floor(params.monthlyNewShares));
    const newPaidCost = newBought * currentPrice;
    totalOutOfPocket += newPaidCost;
    shares += newBought;
    paidShares += newBought;

    if (params.reinvestDividends) {
      cashRemainder += monthDividends;
      const magicShares = Math.floor(cashRemainder / currentPrice);
      if (magicShares > 0) {
        shares += magicShares;
        cashRemainder -= magicShares * currentPrice;
      }
    }

    if (months <= 36 || m % 6 === 0 || m === months) {
      series.push({
        month: m,
        label: m % 12 === 0 ? `Ano ${m / 12}` : `M${m}`,
        shares,
        monthlyPassiveIncome: Number((shares * currentDivPerShare).toFixed(2)),
        patrimony: Number((shares * currentPrice + cashRemainder).toFixed(2)),
      });
    }
  }

  const finalMonthlyDividend = shares * (currentPrice * monthlyYieldRatio);
  const magicNumberShares = div0 > 0 ? Math.ceil(price0 / div0) : 0;
  const yieldOnCostAnnualPct =
    totalOutOfPocket > 0 ? ((finalMonthlyDividend * 12) / totalOutOfPocket) * 100 : 0;
  const averageCostPerShare = paidShares > 0 ? totalOutOfPocket / paidShares : price0;
  const effectiveAveragePriceAllShares = shares > 0 ? totalOutOfPocket / shares : price0;
  const targetYieldPct = Math.max(1, params.desiredAnnualYieldPct ?? 6);
  const annualDividend0 = div0 * 12;
  const ceilingPrice = annualDividend0 > 0 ? annualDividend0 / (targetYieldPct / 100) : 0;
  const marginOfSafetyPct = ceilingPrice > 0 ? ((ceilingPrice - price0) / ceilingPrice) * 100 : 0;

  return {
    initialDividendYieldAnnualPct: Number((monthlyYieldRatio * 12 * 100).toFixed(2)),
    magicNumberShares,
    magicNumberCapital: Number((magicNumberShares * price0).toFixed(2)),
    finalShares: shares,
    finalPatrimony: Number((shares * currentPrice + cashRemainder).toFixed(2)),
    finalMonthlyDividend: Number(finalMonthlyDividend.toFixed(2)),
    cumulativeDividends: Number(cumulativeDividends.toFixed(2)),
    totalOutOfPocket: Number(totalOutOfPocket.toFixed(2)),
    yieldOnCostAnnualPct: Number(yieldOnCostAnnualPct.toFixed(2)),
    averageCostPerShare: Number(averageCostPerShare.toFixed(2)),
    effectiveAveragePriceAllShares: Number(effectiveAveragePriceAllShares.toFixed(2)),
    ceilingPrice: Number(ceilingPrice.toFixed(2)),
    marginOfSafetyPct: Number(marginOfSafetyPct.toFixed(1)),
    series,
  };
}

// 11. Criptomoedas (DCA, custo médio, preço-alvo e cenários Bear / Base / Bull)
export function calculateCryptoScenarios(params: {
  currentPriceBrl: number;
  initialInvestmentBrl: number;
  monthlyDcaBrl: number;
  months: number;
  bearChangePct: number;
  baseChangePct: number;
  bullChangePct: number;
  totalPortfolioBrl: number;
  targetPriceBrl?: number;
}) {
  const price = Math.max(0.000001, params.currentPriceBrl);
  const months = Math.max(1, Math.min(120, Math.round(params.months)));
  const totalInvested =
    Math.max(0, params.initialInvestmentBrl) + Math.max(0, params.monthlyDcaBrl) * months;
  const estimatedCoins = totalInvested / price;
  const averageCostBrl = estimatedCoins > 0 ? totalInvested / estimatedCoins : price;
  const targetPriceBrl =
    params.targetPriceBrl && params.targetPriceBrl > 0
      ? params.targetPriceBrl
      : price * (1 + params.baseChangePct / 100);
  const targetValueBrl = estimatedCoins * targetPriceBrl;
  const targetGainBrl = targetValueBrl - totalInvested;
  const targetGainPct = totalInvested > 0 ? (targetGainBrl / totalInvested) * 100 : 0;

  const scenarios = [
    { name: "Cenário Pessimista (Bear)", changePct: params.bearChangePct },
    { name: "Cenário Base", changePct: params.baseChangePct },
    { name: "Cenário Otimista (Bull)", changePct: params.bullChangePct },
  ].map((s) => {
    const targetPrice = price * (1 + s.changePct / 100);
    const finalValue = estimatedCoins * targetPrice;
    const profit = finalValue - totalInvested;
    return {
      name: s.name,
      changePct: s.changePct,
      targetPrice: Number(targetPrice.toFixed(2)),
      finalValue: Number(finalValue.toFixed(2)),
      profit: Number(profit.toFixed(2)),
    };
  });

  const basePortfolio = Math.max(totalInvested, params.totalPortfolioBrl + totalInvested);
  const exposurePct = basePortfolio > 0 ? (totalInvested / basePortfolio) * 100 : 100;

  return {
    totalInvested: Number(totalInvested.toFixed(2)),
    estimatedUnits: Number(estimatedCoins.toFixed(6)),
    averageCostBrl: Number(averageCostBrl.toFixed(2)),
    targetPriceBrl: Number(targetPriceBrl.toFixed(2)),
    targetValueBrl: Number(targetValueBrl.toFixed(2)),
    targetGainBrl: Number(targetGainBrl.toFixed(2)),
    targetGainPct: Number(targetGainPct.toFixed(2)),
    exposureInPortfolioPct: Number(exposurePct.toFixed(1)),
    recommendedMaxExposurePct: 10,
    riskAlert:
      exposurePct > 15
        ? "Exposição acima de 15% do patrimônio. Considere limitar criptoativos entre 2% e 10% da carteira."
        : "Exposição dentro de uma faixa prudencial de diversificação.",
    scenarios,
  };
}
