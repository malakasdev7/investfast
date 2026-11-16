import { analyzeFinances } from "./analytics";
import { budgetUsage, num } from "./finance";
import { type Snapshot, today, labels } from "@/lib/domain";
import { format, subMonths } from "date-fns";

export type PurchaseVerdict =
  | "Pode considerar"
  | "Atenção"
  | "Não recomendado agora"
  | "Preciso de mais informações";

export type PurchaseHorizon = "short" | "medium" | "long";
export type InvestorRiskProfile = "conservative" | "moderate" | "aggressive";

export type PurchaseEvaluationInput = {
  ticker: string;
  name: string;
  assetClass: string;
  amount: number;
  horizon: PurchaseHorizon;
  riskProfile: InvestorRiskProfile;
  useAccountBalance?: boolean;
  hasHighInterestDebt?: boolean;
};

export type CriterionCheck = {
  key: string;
  label: string;
  status: "ok" | "warning" | "danger" | "missing";
  summary: string;
};

export type PurchaseEvaluationResult = {
  verdict: PurchaseVerdict;
  score: number;
  headline: string;
  justifications: string[];
  risks: string[];
  alternatives: string[];
  followUpQuestions: string[];
  maxRecommendedAmount: number | null;
  concentrationAlert: boolean;
  budgetImpact: {
    capacityUsagePct: number | null;
    remainingMonthlyCapacity: number;
    cashRemainingAfter: number;
    summary: string;
  };
  criteria: CriterionCheck[];
  portfolioImpact: {
    beforeTotal: number;
    afterTotal: number;
    cashBefore: number;
    cashAfter: number;
    assetShareBeforePct: number;
    assetShareAfterPct: number;
    classShareBeforePct: number;
    classShareAfterPct: number;
    concentrationAlert: boolean;
    beforeAllocation: { name: string; value: number; color: string }[];
    afterAllocation: { name: string; value: number; color: string }[];
  };
};

const HIGH_VOLATILITY_CLASSES = new Set(["stock", "bdr", "crypto", "etf"]);
const MEDIUM_VOLATILITY_CLASSES = new Set(["fii", "fund", "debenture", "cri", "cra"]);
const LOW_LIQUIDITY_CLASSES = new Set(["cri", "cra", "debenture", "pension", "lci", "lca", "cdb"]);
const SAFE_RESERVE_CLASSES = new Set(["cdi", "treasury"]);

const PALETTE = ["#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#64748b"];

export function evaluatePurchase(
  data: Snapshot,
  input: PurchaseEvaluationInput,
): PurchaseEvaluationResult {
  const ticker = input.ticker.trim().toUpperCase();
  const assetName = input.name.trim() || ticker;
  const assetClass = input.assetClass || "other";
  const amount = Number.isFinite(input.amount) ? Math.max(0, input.amount) : 0;

  const end = today();
  const start = format(subMonths(new Date(), 1), "yyyy-MM-dd");
  const report = analyzeFinances(data, start, end);

  const hasAccounts = (data.accounts ?? []).length > 0;
  const hasTransactions = (data.transactions ?? []).length > 0;
  const hasHoldings = (data.holdings ?? []).length > 0;

  const criteria: CriterionCheck[] = [];
  const justifications: string[] = [];
  const risks: string[] = [];
  const alternatives: string[] = [];

  let score = 88;
  let forceNotRecommended = false;
  let missingInfoCount = 0;

  // Impacto na carteira antes/depois
  const beforeTotal = report.portfolio.totalInvested;
  const afterTotal = beforeTotal + amount;
  const cashBefore = report.summary.cash;
  const cashAfter = input.useAccountBalance !== false ? cashBefore - amount : cashBefore;

  const existingAsset = report.portfolio.byAsset.find(
    (a) => a.ticker.toUpperCase() === ticker,
  );
  const existingClass = report.portfolio.byClass.find((c) => c.key === assetClass);

  const assetValueBefore = existingAsset?.value ?? 0;
  const assetValueAfter = assetValueBefore + amount;
  const assetShareBeforePct =
    beforeTotal > 0 ? Number(((assetValueBefore / beforeTotal) * 100).toFixed(1)) : 0;
  const assetShareAfterPct =
    afterTotal > 0 ? Number(((assetValueAfter / afterTotal) * 100).toFixed(1)) : 0;

  const classValueBefore = existingClass?.value ?? 0;
  const classValueAfter = classValueBefore + amount;
  const classShareBeforePct =
    beforeTotal > 0 ? Number(((classValueBefore / beforeTotal) * 100).toFixed(1)) : 0;
  const classShareAfterPct =
    afterTotal > 0 ? Number(((classValueAfter / afterTotal) * 100).toFixed(1)) : 0;

  const beforeAllocation = report.portfolio.byClass.map((c, i) => ({
    name: c.name,
    value: c.value,
    color: PALETTE[i % PALETTE.length],
  }));

  const afterClassMap = new Map<string, number>();
  report.portfolio.byClass.forEach((c) => afterClassMap.set(c.key, c.value));
  afterClassMap.set(assetClass, (afterClassMap.get(assetClass) ?? 0) + amount);

  const afterAllocation = [...afterClassMap.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, val], i) => ({
      name: labels[key] || key,
      value: Number(val.toFixed(2)),
      color: PALETTE[i % PALETTE.length],
    }));

  // Validação de entrada básica
  if (!ticker || amount <= 0) {
    return {
      verdict: "Preciso de mais informações",
      score: 0,
      headline: "Informe o ativo e um valor válido maior que zero para avaliar a compra.",
      justifications: [
        "Para calcular o impacto real no seu saldo, reserva e concentração da carteira, informe o código do ativo e o valor do aporte em reais.",
      ],
      risks: [],
      alternatives: [],
      followUpQuestions: [
        "Qual ativo específico (ticker ou nome do título) você pretende comprar?",
        "Qual valor em reais (R$) você pretende destinar para esta operação?",
        "Esse capital já está separado para investir ou faz parte da sua reserva de emergência?",
      ],
      maxRecommendedAmount: report.capacity.safeMonthlyInvestment > 0
        ? report.capacity.safeMonthlyInvestment
        : null,
      concentrationAlert: false,
      budgetImpact: {
        capacityUsagePct: null,
        remainingMonthlyCapacity: report.capacity.safeMonthlyInvestment,
        cashRemainingAfter: cashBefore,
        summary: "Aguardando valor da compra para medir o impacto no orçamento mensal.",
      },
      criteria: [],
      portfolioImpact: {
        beforeTotal,
        afterTotal: beforeTotal,
        cashBefore,
        cashAfter: cashBefore,
        assetShareBeforePct,
        assetShareAfterPct: assetShareBeforePct,
        classShareBeforePct,
        classShareAfterPct: classShareBeforePct,
        concentrationAlert: false,
        beforeAllocation,
        afterAllocation: beforeAllocation,
      },
    };
  }

  // 1. Saldo disponível
  if (!hasAccounts) {
    missingInfoCount += 1;
    criteria.push({
      key: "balance",
      label: "1. Saldo em contas",
      status: "missing",
      summary: "Nenhuma conta bancária ou corretora cadastrada para validar saldo disponível.",
    });
  } else if (cashBefore < amount) {
    score -= 35;
    forceNotRecommended = true;
    criteria.push({
      key: "balance",
      label: "1. Saldo em contas",
      status: "danger",
      summary: `O aporte (R$ ${amount.toFixed(2)}) supera o saldo consolidado atual das contas (R$ ${cashBefore.toFixed(2)}).`,
    });
    risks.push(
      "O valor pretendido é maior que o saldo disponível nas suas contas cadastradas, o que poderia exigir uso de limite ou cheque especial.",
    );
    alternatives.push(
      `Reduzir o valor do aporte para no máximo R$ ${Math.max(0, cashBefore * 0.8).toFixed(2)} ou aguardar nova entrada de receita.`,
    );
  } else if (cashAfter < report.emergency.monthlyCostReference * 0.5 && report.emergency.monthlyCostReference > 0) {
    score -= 14;
    criteria.push({
      key: "balance",
      label: "1. Saldo em contas",
      status: "warning",
      summary: `Após a compra, seu saldo em conta cairá para R$ ${cashAfter.toFixed(2)}, deixando pouca folga operacional no mês.`,
    });
    risks.push("O saldo remanescente em conta corrente ficará apertado para as despesas do dia a dia.");
  } else {
    criteria.push({
      key: "balance",
      label: "1. Saldo em contas",
      status: "ok",
      summary: `Saldo suficiente: R$ ${cashBefore.toFixed(2)} antes e R$ ${cashAfter.toFixed(2)} após a compra.`,
    });
    justifications.push(
      `Você possui saldo disponível em conta (R$ ${cashBefore.toFixed(2)}) para liquidar a operação à vista.`,
    );
  }

  // 2. Reserva de emergência
  const isReserveAsset = SAFE_RESERVE_CLASSES.has(assetClass);
  if (report.emergency.status === "sem_base" && !hasTransactions) {
    missingInfoCount += 1;
    criteria.push({
      key: "emergency_reserve",
      label: "2. Reserva de emergência",
      status: "missing",
      summary: "Sem despesas mensais registradas para dimensionar os 6 meses de reserva.",
    });
  } else if (report.emergency.monthsCovered < 3 && !isReserveAsset) {
    score -= 26;
    if (HIGH_VOLATILITY_CLASSES.has(assetClass) || LOW_LIQUIDITY_CLASSES.has(assetClass)) {
      forceNotRecommended = true;
    }
    criteria.push({
      key: "emergency_reserve",
      label: "2. Reserva de emergência",
      status: "danger",
      summary: `Reserva atual cobre apenas ${report.emergency.monthsCovered.toFixed(1)} meses (ideal: 6 meses) e o ativo escolhido não é de reserva imediata.`,
    });
    risks.push(
      `Sua reserva de emergência está em ${report.emergency.monthsCovered.toFixed(1)} meses. Alocar em ${labels[assetClass] || assetClass} antes de formar a reserva expõe você a resgates forçados.`,
    );
    alternatives.push(
      "Direcionar este aporte para Tesouro Selic ou CDI de liquidez diária (100% do CDI) até atingir pelo menos 3 a 6 meses de custo mensal.",
    );
  } else if (report.emergency.monthsCovered < 6 && !isReserveAsset) {
    score -= 10;
    criteria.push({
      key: "emergency_reserve",
      label: "2. Reserva de emergência",
      status: "warning",
      summary: `Reserva em formação (${report.emergency.monthsCovered.toFixed(1)} meses cobertos). Considere destinar parte do aporte para completá-la.`,
    });
    alternatives.push(
      "Dividir o aporte: destinar metade para a Reserva de Emergência (CDI/Tesouro) e metade para este ativo.",
    );
  } else {
    criteria.push({
      key: "emergency_reserve",
      label: "2. Reserva de emergência",
      status: "ok",
      summary: isReserveAsset
        ? `Este ativo (${labels[assetClass] || assetClass}) fortalece diretamente sua liquidez e reserva.`
        : `Reserva saudável (${report.emergency.monthsCovered.toFixed(1)} meses de cobertura).`,
    });
    if (isReserveAsset) {
      justifications.push(
        `Por ser um ativo de ${labels[assetClass] || assetClass}, a compra reforça sua reserva líquida de segurança.`,
      );
    }
  }

  // 3. Dívidas e juros
  if (input.hasHighInterestDebt) {
    score -= 40;
    forceNotRecommended = true;
    criteria.push({
      key: "debts",
      label: "3. Dívidas e juros",
      status: "danger",
      summary: "Há indicação de dívida de cartão de crédito ou juros altos em aberto.",
    });
    risks.push(
      "Dívidas de cartão de crédito ou cheque especial possuem juros muito superiores ao retorno histórico esperado de qualquer ativo.",
    );
    alternatives.push(
      `Priorizar a quitação imediata da dívida de juros altos usando os ${formatBrl(amount)} antes de realizar novos investimentos.`,
    );
  } else if (report.debts.overduePendingCount > 0) {
    score -= 28;
    forceNotRecommended = true;
    criteria.push({
      key: "debts",
      label: "3. Dívidas e juros",
      status: "danger",
      summary: `Existem ${report.debts.overduePendingCount} conta(s) vencida(s) totalizando R$ ${report.debts.overduePendingAmount.toFixed(2)}.`,
    });
    risks.push(
      "Há compromissos financeiros vencidos pendentes. Os juros e multas de dívidas superam o retorno esperado dos investimentos.",
    );
    alternatives.push(
      `Quitar primeiro os R$ ${report.debts.overduePendingAmount.toFixed(2)} em lançamentos pendentes vencidos antes de realizar novos aportes.`,
    );
  } else if (report.debts.pressure === "alta") {
    score -= 18;
    if (report.debts.debtToIncomePct >= 50) {
      forceNotRecommended = true;
    }
    criteria.push({
      key: "debts",
      label: "3. Dívidas e juros",
      status: report.debts.debtToIncomePct >= 50 ? "danger" : "warning",
      summary: `Comprometimento elevado (${report.debts.debtToIncomePct}% da renda média com cartões/obrigações).`,
    });
    risks.push("Seu nível de comprometimento com cartão de crédito e faturas exige priorizar liquidez e redução de juros.");
  } else {
    criteria.push({
      key: "debts",
      label: "3. Dívidas e juros",
      status: "ok",
      summary: "Sem dívidas de juros altos informadas, sem contas vencidas e pressão controlada.",
    });
  }

  // 4. Orçamento mensal
  const budgets = budgetUsage(data, end.slice(0, 7));
  const blownBudgets = budgets.filter((b) => b.percent >= 100);
  if (blownBudgets.length > 0) {
    score -= 8;
    criteria.push({
      key: "budget",
      label: "4. Orçamento do mês",
      status: "warning",
      summary: `${blownBudgets.length} categoria(s) ultrapassaram o orçamento mensal (${blownBudgets.map((b) => b.name).join(", ")}).`,
    });
    risks.push("Gastos acima do orçamento no mês podem reduzir sua margem de segurança nas próximas semanas.");
  } else {
    criteria.push({
      key: "budget",
      label: "4. Orçamento do mês",
      status: "ok",
      summary: budgets.length
        ? "Todos os orçamentos mensais estão dentro do limite planejado."
        : "Sem estouros de orçamento registrados no mês.",
    });
  }

  // 5. Capacidade mensal de investimento
  const safeCap = report.capacity.safeMonthlyInvestment;
  if (safeCap <= 0 && !hasTransactions) {
    missingInfoCount += 1;
    criteria.push({
      key: "investment_capacity",
      label: "5. Capacidade de aporte",
      status: "missing",
      summary: "Registre suas receitas e despesas para calcular sua capacidade mensal recorrente.",
    });
  } else if (safeCap > 0 && amount > safeCap * 2.5 && amount > cashBefore * 0.5) {
    score -= 12;
    criteria.push({
      key: "investment_capacity",
      label: "5. Capacidade de aporte",
      status: "warning",
      summary: `O aporte (R$ ${amount.toFixed(2)}) equivale a ${(amount / safeCap).toFixed(1)}x sua capacidade mensal recorrente (R$ ${safeCap.toFixed(2)}).`,
    });
    alternatives.push(
      `Fracionar a entrada em 2 ou 3 aportes mensais de R$ ${(amount / 3).toFixed(2)} para diluir o preço médio.`,
    );
  } else {
    criteria.push({
      key: "investment_capacity",
      label: "5. Capacidade de aporte",
      status: "ok",
      summary:
        safeCap > 0
          ? `Compatível com sua geração de caixa (capacidade mensal estimada: R$ ${safeCap.toFixed(2)}).`
          : "Aporte realizado utilizando patrimônio em caixa disponível.",
    });
  }

  // 6. Encaixe na carteira atual
  if (!hasHoldings && beforeTotal === 0) {
    criteria.push({
      key: "portfolio_fit",
      label: "6. Carteira atual",
      status: isReserveAsset ? "ok" : "warning",
      summary: isReserveAsset
        ? "Excelente ponto de partida para inaugurar sua carteira com segurança."
        : "Primeira posição da carteira: começará com 100% de exposição neste ativo.",
    });
  } else {
    const addsNewClass = !existingClass || existingClass.value === 0;
    criteria.push({
      key: "portfolio_fit",
      label: "6. Carteira atual",
      status: "ok",
      summary: addsNewClass
        ? `Adiciona uma nova classe (${labels[assetClass] || assetClass}) à carteira, ampliando a diversificação.`
        : `Complementa sua posição existente em ${labels[assetClass] || assetClass}.`,
    });
    if (addsNewClass) {
      justifications.push(
        `A compra inaugura exposição em ${labels[assetClass] || assetClass}, melhorando a distribuição entre classes.`,
      );
    }
  }

  // 7. Concentração pós-compra (alerta obrigatório acima de 20% da carteira)
  const maxAssetLimit = assetClass === "crypto" ? 12 : SAFE_RESERVE_CLASSES.has(assetClass) ? 75 : 20;
  const maxClassLimit = assetClass === "crypto" ? 15 : SAFE_RESERVE_CLASSES.has(assetClass) ? 85 : 55;
  const concentrationAlert = afterTotal > 0 && assetShareAfterPct > 20;

  if (afterTotal > 0 && !SAFE_RESERVE_CLASSES.has(assetClass) && assetShareAfterPct > maxAssetLimit) {
    const penalty = assetShareAfterPct > 35 ? 20 : 12;
    score -= penalty;
    criteria.push({
      key: "concentration",
      label: "7. Concentração pós-compra",
      status: assetShareAfterPct > 35 ? "danger" : "warning",
      summary: `Alerta de concentração (>20%): ${ticker} passará de ${assetShareBeforePct}% para ${assetShareAfterPct}% da carteira (teto prudencial: ${maxAssetLimit}%).`,
    });
    risks.push(
      `Alerta de concentração: ${ticker} representará ${assetShareAfterPct}% da carteira após a compra (acima de 20%), elevando o risco específico.`,
    );
    alternatives.push(
      `Limitar o aporte em ${ticker} para manter a participação abaixo de ${maxAssetLimit}% da carteira e distribuir o restante em outros ativos.`,
    );
  } else if (concentrationAlert) {
    criteria.push({
      key: "concentration",
      label: "7. Concentração pós-compra",
      status: "warning",
      summary: `Alerta de concentração (>20%): ${ticker} passará a representar ${assetShareAfterPct}% da carteira após esta compra.`,
    });
    risks.push(
      `Concentração acima de 20% em um único ativo/produto (${assetShareAfterPct}% em ${ticker}); avalie diversificar entre emissores caso não seja sua reserva principal.`,
    );
  } else if (afterTotal > 0 && classShareAfterPct > maxClassLimit && !SAFE_RESERVE_CLASSES.has(assetClass)) {
    score -= 10;
    criteria.push({
      key: "concentration",
      label: "7. Concentração pós-compra",
      status: "warning",
      summary: `A classe ${labels[assetClass] || assetClass} subirá de ${classShareBeforePct}% para ${classShareAfterPct}% da carteira.`,
    });
  } else {
    criteria.push({
      key: "concentration",
      label: "7. Concentração pós-compra",
      status: "ok",
      summary: `${ticker} representará ${assetShareAfterPct}% da carteira e a classe ${labels[assetClass] || assetClass} ficará em ${classShareAfterPct}%.`,
    });
    justifications.push(
      `A concentração pós-compra permanece saudável (${assetShareAfterPct}% no ativo e ${classShareAfterPct}% na classe).`,
    );
  }

  // 8. Liquidez
  if (LOW_LIQUIDITY_CLASSES.has(assetClass) && report.liquidity.immediatePct < 20) {
    score -= 14;
    criteria.push({
      key: "liquidity",
      label: "8. Liquidez",
      status: "warning",
      summary: `${labels[assetClass] || assetClass} possui menor liquidez secundária e sua liquidez imediata atual é de ${report.liquidity.immediatePct}%.`,
    });
    risks.push("Ativos de crédito privado ou previdência podem ter carência ou spread em caso de resgate antecipado.");
  } else {
    criteria.push({
      key: "liquidity",
      label: "8. Liquidez",
      status: "ok",
      summary: SAFE_RESERVE_CLASSES.has(assetClass)
        ? "Liquidez alta (D+0/D+1), resgatável rapidamente se necessário."
        : `Liquidez compatível com a estrutura atual do seu patrimônio (${report.liquidity.immediatePct}% em liquidez imediata).`,
    });
  }

  // 9. Prazo / Horizonte do objetivo
  if (input.horizon === "short" && (HIGH_VOLATILITY_CLASSES.has(assetClass) || LOW_LIQUIDITY_CLASSES.has(assetClass))) {
    score -= 22;
    criteria.push({
      key: "horizon",
      label: "9. Prazo do investimento",
      status: "danger",
      summary: `Incompatibilidade de prazo: horizonte de curto prazo (< 1 ano) com ativo de ${HIGH_VOLATILITY_CLASSES.has(assetClass) ? "alta volatilidade" : "baixa liquidez"}.`,
    });
    risks.push(
      "Para recursos que você pretende utilizar no curto prazo, oscilações de mercado ou carências podem gerar perda patrimonial no resgate.",
    );
    alternatives.push(
      "Para horizonte de curto prazo, prefira Tesouro Selic, CDB de liquidez diária ou LCI/LCA com vencimento casado.",
    );
  } else if (input.horizon === "medium" && assetClass === "crypto") {
    score -= 10;
    criteria.push({
      key: "horizon",
      label: "9. Prazo do investimento",
      status: "warning",
      summary: "Criptoativos costumam exigir horizonte de longo prazo (ciclos de 4+ anos) para maturação.",
    });
  } else {
    criteria.push({
      key: "horizon",
      label: "9. Prazo do investimento",
      status: "ok",
      summary: `Prazo ${input.horizon === "short" ? "curto" : input.horizon === "medium" ? "médio" : "longo"} alinhado com a natureza de ${labels[assetClass] || assetClass}.`,
    });
    justifications.push(
      `O horizonte informado está alinhado com o ciclo de maturação de ${labels[assetClass] || assetClass}.`,
    );
  }

  // 10. Perfil de risco
  if (input.riskProfile === "conservative" && HIGH_VOLATILITY_CLASSES.has(assetClass)) {
    score -= 20;
    criteria.push({
      key: "risk_profile",
      label: "10. Perfil de risco",
      status: "danger",
      summary: `Desalinhamento: perfil Conservador selecionado para um ativo de renda variável/volátil (${labels[assetClass] || assetClass}).`,
    });
    risks.push(
      `O ativo ${ticker} apresenta oscilações superiores à tolerância típica do perfil Conservador.`,
    );
    alternatives.push(
      "Avaliar alternativas conservadoras como Tesouro IPCA+, Tesouro Selic, CDBs de bancos de primeira linha ou LCI/LCA.",
    );
  } else if (
    input.riskProfile === "conservative" &&
    MEDIUM_VOLATILITY_CLASSES.has(assetClass) &&
    classShareAfterPct > 25
  ) {
    score -= 10;
    criteria.push({
      key: "risk_profile",
      label: "10. Perfil de risco",
      status: "warning",
      summary: `Atenção à exposição de ${classShareAfterPct}% em ${labels[assetClass] || assetClass} para um perfil Conservador.`,
    });
  } else if (input.riskProfile === "moderate" && assetClass === "crypto" && classShareAfterPct > 8) {
    score -= 12;
    criteria.push({
      key: "risk_profile",
      label: "10. Perfil de risco",
      status: "warning",
      summary: `Para perfil Moderado, exposição acima de 5% a 8% em criptoativos eleva substancialmente o risco.`,
    });
  } else {
    criteria.push({
      key: "risk_profile",
      label: "10. Perfil de risco",
      status: "ok",
      summary: `Ativo compatível com o perfil ${input.riskProfile === "conservative" ? "Conservador" : input.riskProfile === "moderate" ? "Moderado" : "Arrojado"}.`,
    });
  }

  // 11. Metas financeiras
  const pendingGoals = report.goals.items.filter((g) => g.percent < 100);
  const oneYearLater = new Date();
  oneYearLater.setDate(oneYearLater.getDate() + 365);
  const urgentGoals = pendingGoals.filter((g) => {
    const remaining = Math.max(0, g.target - g.saved);
    if (!g.deadline || remaining <= 0) return false;
    const deadlineDate = new Date(g.deadline);
    return !Number.isNaN(deadlineDate.getTime()) && deadlineDate <= oneYearLater;
  });
  if (urgentGoals.length > 0 && (HIGH_VOLATILITY_CLASSES.has(assetClass) || LOW_LIQUIDITY_CLASSES.has(assetClass))) {
    score -= 8;
    const missingTotal = urgentGoals.reduce(
      (acc, g) => acc + Math.max(0, g.target - g.saved),
      0,
    );
    criteria.push({
      key: "goals",
      label: "11. Metas financeiras",
      status: "warning",
      summary: `Você tem ${urgentGoals.length} meta(s) com prazo de até 12 meses (${urgentGoals.map((g) => g.name).join(", ")}) faltando ${formatBrl(missingTotal)}.`,
    });
    risks.push("Recursos necessários para metas de curto prazo não devem ficar expostos à volatilidade ou baixa liquidez.");
  } else {
    criteria.push({
      key: "goals",
      label: "11. Metas financeiras",
      status: pendingGoals.length ? "ok" : "missing",
      summary: pendingGoals.length
        ? `${pendingGoals.length} meta(s) ativa(s) em andamento (${report.goals.overallProgressPct}% concluído no total) sem conflito imediato.`
        : "Nenhuma meta financeira ativa cadastrada para cruzar prazos.",
    });
  }

  // 12. Histórico de aportes
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const rawTx = ((data.investment_transactions ?? (data as unknown as Record<string, unknown>).investmentTransactions ?? []) as Array<Record<string, unknown>>);
  const recentBuys = rawTx.filter((t) => {
    const op = String(t.type || t.operation || "");
    const dateStr = String(t.operation_date || t.date || "");
    return (op === "buy" || op === "deposit") && Boolean(dateStr) && new Date(dateStr) >= ninetyDaysAgo;
  });
  const recentTotalBought = recentBuys.reduce((acc, t) => acc + Math.max(0, Number(t.total_amount) || 0), 0);
  const sameAssetBuys = recentBuys.filter((t) => {
    const asset = (data.assets ?? []).find((a) => a.id === t.asset_id);
    return String(asset?.ticker ?? "").toUpperCase() === ticker;
  });

  criteria.push({
    key: "contribution_history",
    label: "12. Histórico de aportes",
    status: recentBuys.length > 0 ? "ok" : "missing",
    summary: recentBuys.length
      ? `${recentBuys.length} aporte(s) nos últimos 90 dias totalizando ${formatBrl(recentTotalBought)}${sameAssetBuys.length ? ` (${sameAssetBuys.length} em ${ticker})` : ""}.`
      : "Sem histórico de aportes registrado nos últimos 90 dias.",
  });

  // 13. Rentabilidade e perfil de risco do ativo (sem prometer retorno)
  const matchingPosition = report.portfolio.byAsset.find((h) => h.ticker.toUpperCase() === ticker);
  const volatilityLabel = HIGH_VOLATILITY_CLASSES.has(assetClass)
    ? "alta volatilidade e sem retorno garantido"
    : MEDIUM_VOLATILITY_CLASSES.has(assetClass)
      ? "volatilidade moderada"
      : "baixa volatilidade";

  criteria.push({
    key: "asset_profile",
    label: "13. Risco e rentabilidade do ativo",
    status: "ok",
    summary: matchingPosition
      ? `${ticker} pertence à classe ${labels[assetClass] || assetClass} (${volatilityLabel}). Posição atual representa ${matchingPosition.sharePct}% da carteira; rentabilidade passada não é garantia de retorno futuro.`
      : `${ticker} pertence à classe ${labels[assetClass] || assetClass} (${volatilityLabel}). Retornos futuros são incertos e dependem do cenário de mercado e fundamentos.`,
  });

  score = Math.max(0, Math.min(100, Math.round(score)));

  let verdict: PurchaseVerdict;
  if (missingInfoCount >= 2 && !hasAccounts && !hasTransactions) {
    verdict = "Preciso de mais informações";
  } else if (forceNotRecommended || score < 48) {
    verdict = "Não recomendado agora";
  } else if (score < 76 || criteria.some((c) => c.status === "danger" || c.status === "warning")) {
    verdict = "Atenção";
  } else {
    verdict = "Pode considerar";
  }

  const headline =
    verdict === "Pode considerar"
      ? `A compra de ${formatBrl(amount)} em ${ticker} (${assetName}) está bem alinhada com seu saldo, reserva e estrutura de carteira.`
      : verdict === "Atenção"
        ? `A compra de ${ticker} exige atenção aos pontos de concentração, orçamento, metas ou reserva destacados abaixo.`
        : verdict === "Não recomendado agora"
          ? `Momento desfavorável para alocar ${formatBrl(amount)} em ${ticker}. Priorize os ajustes críticos (dívidas ou reserva) antes de investir.`
          : `Cadastre pelo menos uma conta e suas receitas/despesas mensais para que o InvestFast valide sua liquidez com precisão.`;

  if (justifications.length === 0) {
    justifications.push(
      `Simulação de aporte de ${formatBrl(amount)} em ${ticker} (${labels[assetClass] || assetClass}) processada sobre o seu patrimônio atual.`,
    );
  }
  if (risks.length === 0) {
    risks.push(
      "Risco de mercado inerente à classe do ativo; não há garantia de retorno e o preço pode oscilar no curto prazo.",
    );
  }
  if (alternatives.length === 0) {
    alternatives.push(
      "Realizar aportes mensais regulares para construir preço médio consistente ao longo do tempo.",
    );
  }

  // Impacto no orçamento
  const capacityUsagePct =
    safeCap > 0 ? Number(((amount / safeCap) * 100).toFixed(1)) : amount > 0 ? 100 : 0;
  const remainingMonthlyCapacity = Number(Math.max(0, safeCap - amount).toFixed(2));
  const cashRemainingAfter = Number((cashBefore - (input.useAccountBalance ? amount : 0)).toFixed(2));
  const budgetImpact = {
    capacityUsagePct,
    remainingMonthlyCapacity,
    cashRemainingAfter,
    summary:
      safeCap > 0
        ? `Este aporte consome ${capacityUsagePct}% da sua capacidade mensal estimada (${formatBrl(safeCap)}/mês)${input.useAccountBalance ? ` e deixa ${formatBrl(cashRemainingAfter)} em conta` : ""}.`
        : `Sem capacidade mensal calculada no período; o impacto recai sobre o saldo atual em conta (${formatBrl(cashBefore)}).`,
  };

  // Sugestão de valor máximo adequado
  let maxRecommendedAmount: number | null = null;
  if (input.hasHighInterestDebt || report.debts.overduePendingCount > 0) {
    maxRecommendedAmount = 0;
  } else if (report.emergency.monthsCovered < 3 && !isReserveAsset && HIGH_VOLATILITY_CLASSES.has(assetClass)) {
    maxRecommendedAmount = 0;
  } else {
    const candidates: number[] = [];
    if (input.useAccountBalance && cashBefore > 0) {
      candidates.push(Math.max(0, cashBefore * 0.85));
    }
    if (safeCap > 0) {
      candidates.push(safeCap);
    }
    if (!SAFE_RESERVE_CLASSES.has(assetClass) && beforeTotal > 0) {
      // Valor adicional X para que (assetValueBefore + X) / (beforeTotal + X) <= 20%
      const limitFrac = assetClass === "crypto" ? 0.12 : 0.2;
      const denom = 1 - limitFrac;
      const room = Math.max(0, (limitFrac * beforeTotal - assetValueBefore) / denom);
      candidates.push(room);
    }
    if (candidates.length > 0) {
      maxRecommendedAmount = Number(Math.max(0, Math.min(...candidates, amount)).toFixed(2));
    }
  }

  // Perguntas adicionais para refinar a análise
  const followUpQuestions: string[] = [];
  if (input.hasHighInterestDebt || report.debts.pressure === "alta") {
    followUpQuestions.push("Qual é a taxa de juros mensal exata das suas faturas ou dívidas em aberto?");
  }
  if (report.emergency.monthsCovered < 6 && !isReserveAsset) {
    followUpQuestions.push("Você possui outra reserva financeira fora das contas cadastradas no InvestFast?");
  }
  if (concentrationAlert) {
    followUpQuestions.push(`Este aporte em ${ticker} é estratégico ou você aceita dividir o valor com outro ativo para reduzir a concentração acima de 20%?`);
  }
  if (urgentGoals.length > 0) {
    followUpQuestions.push("Este valor faz parte do dinheiro reservado para sua meta de curto prazo ou é um excedente independente?");
  }
  followUpQuestions.push(
    `Se ${ticker} cair 20% nos próximos meses, você conseguiria manter a posição sem precisar resgatar o dinheiro?`,
  );

  return {
    verdict,
    score,
    headline,
    justifications,
    budgetImpact,
    risks,
    alternatives,
    maxRecommendedAmount,
    concentrationAlert,
    followUpQuestions: followUpQuestions.slice(0, 4),
    criteria,
    portfolioImpact: {
      beforeTotal: Number(beforeTotal.toFixed(2)),
      afterTotal: Number(afterTotal.toFixed(2)),
      cashBefore: Number(cashBefore.toFixed(2)),
      cashAfter: Number(cashAfter.toFixed(2)),
      assetShareBeforePct,
      assetShareAfterPct,
      classShareBeforePct,
      classShareAfterPct,
      concentrationAlert,
      beforeAllocation,
      afterAllocation,
    },
  };
}

function formatBrl(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num(v).toNumber());
}
