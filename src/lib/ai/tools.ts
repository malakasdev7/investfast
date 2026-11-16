import "server-only";
import { format, subMonths } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { analyzeFinances } from "@/lib/calculations/analytics";
import {
  calculateCompoundInterest,
  calculateDebtPayoff,
  calculateFinancialGoal,
  calculateFinancialIndependence,
  calculatePortfolioRebalance,
} from "@/lib/calculations/calculators";
import { budgetUsage, goalProgress, num, positions } from "@/lib/calculations/finance";
import { labels, text, today, type Snapshot } from "@/lib/domain";
import { catalog } from "@/lib/market/catalog";
import { marketDetail } from "@/lib/market/service";

export type ToolCategory = "query" | "market" | "calculation" | "analysis";

export type ExecutedToolRecord = {
  tool_name: string;
  type: ToolCategory;
  asset_id: string | null;
  portfolio_id: string | null;
  arguments: Record<string, unknown>;
  result: unknown;
  status: "success" | "error";
  error_message: string | null;
  duration_ms: number;
};

export type AiToolContext = {
  data: Snapshot;
  supabase?: SupabaseClient;
  userId?: string;
};

export const AI_TOOL_DEFINITIONS = {
  get_user_financial_summary: {
    description:
      "Resumo patrimonial e de fluxo do usuário: patrimônio total, saldo em contas, valor investido, receitas, despesas, saldo, taxa de poupança, reserva de emergência e capacidade de aporte.",
  },
  get_accounts: {
    description: "Lista contas bancárias, corretoras, carteiras digitais e saldos atuais.",
  },
  get_transactions: {
    description: "Lista transações recentes de receitas, despesas, transferências e faturas.",
  },
  get_budgets: {
    description: "Retorna orçamentos mensais definidos por categoria e percentual já utilizado.",
  },
  get_goals: {
    description: "Retorna metas financeiras ativas, valores acumulados, alvos, prazos e aporte sugerido.",
  },
  get_portfolios: {
    description: "Lista carteiras de investimento cadastradas com valor e rentabilidade consolidada.",
  },
  get_assets: {
    description: "Lista ativos cadastrados pelo usuário com ticker, classe e cotação atual.",
  },
  get_holdings: {
    description: "Posições detalhadas em carteira (quantidade, preço médio, custo, valor atual e lucro).",
  },
  get_investment_transactions: {
    description: "Histórico recente de compras, vendas, transferências e operações em investimentos.",
  },
  get_dividends: {
    description: "Histórico de dividendos, JCP, rendimentos e proventos recebidos por ativo.",
  },
  get_market_asset: {
    description: "Consulta cotação e dados de mercado de um ticker ou ativo específico.",
  },
  get_asset_history: {
    description: "Consulta histórico recente de preços de mercado de um ativo.",
  },
  calculate_compound_interest: {
    description: "Calcula projeção de juros compostos brutos, líquidos, juros e poder de compra real.",
  },
  calculate_goal_plan: {
    description: "Calcula aporte mensal necessário e prazo estimado para atingir uma meta financeira.",
  },
  calculate_portfolio_allocation: {
    description: "Calcula alocação atual por classe/ativo, HHI, concentração e score de diversificação.",
  },
  calculate_rebalancing: {
    description: "Calcula plano de rebalanceamento com distribuição proporcional de novo aporte.",
  },
  calculate_fire_number: {
    description: "Calcula patrimônio necessário e anos estimados para independência financeira (FIRE).",
  },
  calculate_loan_amortization: {
    description: "Calcula tabelas Price e SAC e economia de juros com amortização extra de dívidas.",
  },
} as const;

export type AiToolName = keyof typeof AI_TOOL_DEFINITIONS;

function findCatalogOrUserMarketMatch(data: Snapshot, tickerOrQuery: string) {
  const normalized = tickerOrQuery.trim().toUpperCase();
  if (!normalized) return null;

  const catalogMatch = catalog.find(
    (c) =>
      c.ticker.toUpperCase() === normalized ||
      c.provider_id.toUpperCase() === normalized ||
      c.name.toUpperCase().includes(normalized),
  );
  if (catalogMatch) return catalogMatch;

  const userAsset = (data.assets ?? []).find(
    (a) =>
      text(a.ticker).toUpperCase() === normalized ||
      text(a.name).toUpperCase().includes(normalized),
  );
  if (userAsset) {
    const assetClass = text(userAsset.asset_class);
    const marketType =
      assetClass === "crypto"
        ? ("cripto" as const)
        : assetClass === "fii"
          ? ("fiis" as const)
          : ("acoes" as const);
    return {
      ticker: text(userAsset.ticker).toUpperCase(),
      name: text(userAsset.name),
      type: marketType,
      asset_class: assetClass,
      provider_id: text(userAsset.ticker).toUpperCase(),
      localAsset: userAsset,
    };
  }
  return null;
}

export async function runAiTool(
  ctx: AiToolContext,
  toolName: AiToolName,
  args: Record<string, unknown> = {},
): Promise<ExecutedToolRecord> {
  const startedAt = Date.now();
  const { data } = ctx;
  const end = today();
  const start = format(subMonths(new Date(), 1), "yyyy-MM-dd");

  let category: ToolCategory = "query";
  let assetId: string | null = null;
  let portfolioId: string | null = null;

  try {
    let result: unknown;

    switch (toolName) {
      case "get_user_financial_summary": {
        category = "analysis";
        const report = analyzeFinances(data, start, end);
        result = {
          patrimonio_total_brl: report.summary.wealth,
          saldo_contas_brl: report.summary.cash,
          total_investido_brl: report.summary.invested,
          receitas_30d_brl: report.summary.income,
          despesas_30d_brl: report.summary.expense,
          saldo_30d_brl: report.summary.balance,
          taxa_poupanca_pct: report.summary.savingsRatePct,
          capacidade_investimento_mensal_brl: report.capacity.safeMonthlyInvestment,
          reserva_emergencia: report.emergency,
          dividas: report.debts,
          risco: report.risk,
        };
        break;
      }

      case "get_accounts": {
        result = (data.accounts ?? []).slice(0, 20).map((a) => ({
          id: a.id,
          nome: text(a.name),
          tipo: labels[text(a.type)] || text(a.type),
          saldo_atual_brl: Number(num(a.current_balance).toFixed(2)),
          status: text(a.status),
        }));
        break;
      }

      case "get_transactions": {
        const limit = Math.min(25, Math.max(5, Number(args.limit ?? 15)));
        const catMap = new Map((data.categories ?? []).map((c) => [c.id, text(c.name)]));
        result = [...(data.transactions ?? [])]
          .sort((a, b) => text(b.transaction_date).localeCompare(text(a.transaction_date)))
          .slice(0, limit)
          .map((t) => ({
            data: text(t.transaction_date),
            descricao: text(t.description),
            tipo: labels[text(t.type)] || text(t.type),
            categoria: catMap.get(text(t.category_id)) || "Sem categoria",
            valor_brl: Number(num(t.amount).toFixed(2)),
            status: text(t.status),
          }));
        break;
      }

      case "get_budgets": {
        const month = String(args.month || end.slice(0, 7));
        result = budgetUsage(data, month).map((b) => ({
          categoria: b.name,
          gasto_brl: Number(b.spent.toFixed(2)),
          limite_brl: Number(b.limit.toFixed(2)),
          uso_pct: Number(b.percent.toFixed(1)),
          estourado: b.percent >= 100,
        }));
        break;
      }

      case "get_goals": {
        result = (data.goals ?? [])
          .filter((g) => g.status !== "cancelled")
          .slice(0, 15)
          .map((g) => {
            const p = goalProgress(g);
            return {
              nome: text(g.name),
              tipo: labels[text(g.type)] || text(g.type),
              acumulado_brl: Number(p.saved.toFixed(2)),
              alvo_brl: Number(p.target.toFixed(2)),
              progresso_pct: Number(p.percent.toFixed(1)),
              aporte_mensal_sugerido_brl: Number(p.monthly.toFixed(2)),
              prazo: text(g.deadline),
              status: text(g.status),
            };
          });
        break;
      }

      case "get_portfolios": {
        const pos = positions(data);
        result = (data.portfolios ?? []).map((pf) => {
          const items = pos.filter((h) => h.row.portfolio_id === pf.id);
          const cost = items.reduce((s, h) => s + h.cost.toNumber(), 0);
          const value = items.reduce((s, h) => s + h.value.toNumber(), 0);
          return {
            id: pf.id,
            nome: text(pf.name),
            custo_brl: Number(cost.toFixed(2)),
            valor_atual_brl: Number(value.toFixed(2)),
            rentabilidade_pct: cost > 0 ? Number((((value - cost) / cost) * 100).toFixed(2)) : 0,
            quantidade_ativos: items.length,
          };
        });
        break;
      }

      case "get_assets": {
        result = (data.assets ?? []).slice(0, 30).map((a) => ({
          id: a.id,
          ticker: text(a.ticker),
          nome: text(a.name),
          classe: labels[text(a.asset_class)] || text(a.asset_class),
          preco_atual_brl: Number(num(a.current_price).toFixed(4)),
          status: text(a.status),
        }));
        break;
      }

      case "get_holdings": {
        const pfMap = new Map((data.portfolios ?? []).map((p) => [text(p.id), text(p.name)]));
        const allPositions = positions(data).filter((p) => p.value.gt(0));
        const totalVal = allPositions.reduce((s, p) => s + p.value.toNumber(), 0);
        if (allPositions.length === 1) {
          assetId = allPositions[0].asset ? text(allPositions[0].asset.id) || null : null;
          portfolioId = text(allPositions[0].row.portfolio_id) || null;
        }
        result = allPositions.slice(0, 25).map((p) => {
          const qty = num(p.row.quantity);
          const avg = qty.gt(0) ? p.cost.div(qty) : num(p.row.average_price);
          return {
            ticker: text(p.asset?.ticker),
            nome: text(p.asset?.name),
            classe: labels[text(p.asset?.asset_class)] || text(p.asset?.asset_class),
            carteira: pfMap.get(text(p.row.portfolio_id)) || "Carteira",
            quantidade: Number(qty.toFixed(6)),
            preco_medio_brl: Number(avg.toFixed(2)),
            custo_brl: Number(p.cost.toFixed(2)),
            valor_atual_brl: Number(p.value.toFixed(2)),
            participacao_pct:
              totalVal > 0 ? Number(((p.value.toNumber() / totalVal) * 100).toFixed(1)) : 0,
            rentabilidade_pct: Number(p.rate.toFixed(2)),
          };
        });
        break;
      }

      case "get_investment_transactions": {
        const assetMap = new Map((data.assets ?? []).map((a) => [text(a.id), text(a.ticker)]));
        result = [...(data.investment_transactions ?? [])]
          .sort((a, b) => text(b.operation_date).localeCompare(text(a.operation_date)))
          .slice(0, 20)
          .map((o) => ({
            data: text(o.operation_date),
            tipo: labels[text(o.type)] || text(o.type),
            ticker: assetMap.get(text(o.asset_id)) || "Ativo",
            quantidade: Number(num(o.quantity).toFixed(6)),
            preco_unitario_brl: Number(num(o.unit_price).toFixed(2)),
            total_brl: Number(num(o.total_amount).toFixed(2)),
          }));
        break;
      }

      case "get_dividends": {
        const assetMap = new Map((data.assets ?? []).map((a) => [text(a.id), text(a.ticker)]));
        const rows = [...(data.dividends ?? [])].sort((a, b) =>
          text(b.payment_date).localeCompare(text(a.payment_date)),
        );
        const totalAll = rows.reduce((s, d) => s + num(d.amount).toNumber(), 0);
        result = {
          total_acumulado_brl: Number(totalAll.toFixed(2)),
          ultimos_proventos: rows.slice(0, 20).map((d) => ({
            data_pagamento: text(d.payment_date),
            ticker: assetMap.get(text(d.asset_id)) || "Ativo",
            tipo: labels[text(d.type)] || text(d.type),
            valor_brl: Number(num(d.amount).toFixed(2)),
          })),
        };
        break;
      }

      case "get_market_asset": {
        category = "market";
        const ticker = String(args.ticker || "").trim();
        const match = findCatalogOrUserMarketMatch(data, ticker);
        if (!match) {
          result = { found: false, ticker, note: "Ativo não encontrado no catálogo nem na carteira do usuário." };
          break;
        }
        if ("localAsset" in match && match.localAsset) {
          assetId = text(match.localAsset.id) || null;
          result = {
            found: true,
            source: "carteira_usuario",
            ticker: match.ticker,
            nome: match.name,
            classe: match.asset_class,
            preco_atual_brl: Number(num(match.localAsset.current_price).toFixed(4)),
            atualizado_em: text(match.localAsset.price_updated_at),
          };
          break;
        }
        if (ctx.supabase && ctx.userId) {
          const t = String(match.type);
          const marketType = (
            t === "fiis" || t === "cripto" || t === "indices" ? t : "acoes"
          ) as "acoes" | "fiis" | "cripto" | "indices";
          const detail = await marketDetail(
            { supabase: ctx.supabase, user: { id: ctx.userId } },
            marketType,
            match.provider_id,
            "1mo",
          );
          const item = detail.items[0];
          result = {
            found: Boolean(item),
            ticker: item?.ticker ?? match.ticker,
            nome: item?.name ?? match.name,
            tipo: item?.type ?? match.type,
            cotacao: item?.quote ?? null,
            avisos: detail.warnings,
          };
        } else {
          result = {
            found: true,
            ticker: match.ticker,
            nome: match.name,
            tipo: match.type,
            classe: match.asset_class,
          };
        }
        break;
      }

      case "get_asset_history": {
        category = "market";
        const ticker = String(args.ticker || "").trim();
        const match = findCatalogOrUserMarketMatch(data, ticker);
        if (!match) {
          result = { found: false, ticker, points: [] };
          break;
        }
        if (ctx.supabase && ctx.userId) {
          const t = String(match.type);
          const marketType = (
            t === "fiis" || t === "cripto" || t === "indices" ? t : "acoes"
          ) as "acoes" | "fiis" | "cripto" | "indices";
          const detail = await marketDetail(
            { supabase: ctx.supabase, user: { id: ctx.userId } },
            marketType,
            match.provider_id,
            "3mo",
          );
          const pts = (detail.history ?? []).slice(-15);
          result = {
            found: true,
            ticker: match.ticker,
            periodo: "3m",
            pontos_recentes: pts,
            nota: detail.historyNote,
          };
        } else {
          const localAsset = (data.assets ?? []).find(
            (a) => text(a.ticker).toUpperCase() === match.ticker,
          );
          const prices = localAsset
            ? (data.asset_prices ?? [])
                .filter((p) => p.asset_id === localAsset.id)
                .sort((a, b) => text(a.price_date).localeCompare(text(b.price_date)))
                .slice(-15)
            : [];
          result = { found: true, ticker: match.ticker, pontos_salvos: prices };
        }
        break;
      }

      case "calculate_compound_interest": {
        category = "calculation";
        result = calculateCompoundInterest({
          initialAmount: Number(args.initialAmount ?? 10000),
          monthlyContribution: Number(args.monthlyContribution ?? 1000),
          annualRatePct: Number(args.annualRatePct ?? 11.5),
          annualInflationPct: Number(args.annualInflationPct ?? 4.5),
          months: Number(args.months ?? 60),
          taxRatePct: Number(args.taxRatePct ?? 15),
        });
        break;
      }

      case "calculate_goal_plan": {
        category = "calculation";
        const report = analyzeFinances(data, start, end);
        result = calculateFinancialGoal({
          targetAmount: Number(args.targetAmount ?? Math.max(10000, report.emergency.targetSixMonths)),
          currentAmount: Number(args.currentAmount ?? report.summary.cash),
          annualRatePct: Number(args.annualRatePct ?? 10.5),
          months: Number(args.months ?? 36),
          plannedMonthlyContribution: Number(
            args.plannedMonthlyContribution ?? Math.max(300, report.capacity.safeMonthlyInvestment),
          ),
        });
        break;
      }

      case "calculate_portfolio_allocation": {
        category = "analysis";
        const report = analyzeFinances(data, start, end);
        result = report.portfolio;
        break;
      }

      case "calculate_rebalancing": {
        category = "calculation";
        const report = analyzeFinances(data, start, end);
        const slices =
          report.portfolio.byClass.length > 0
            ? report.portfolio.byClass.map((c) => ({
                name: c.name,
                currentValue: c.value,
                targetPct: Number((100 / report.portfolio.byClass.length).toFixed(1)),
              }))
            : [
                { name: "Renda Fixa / CDI", currentValue: 0, targetPct: 50 },
                { name: "Ações / ETFs", currentValue: 0, targetPct: 30 },
                { name: "FIIs", currentValue: 0, targetPct: 20 },
              ];
        result = calculatePortfolioRebalance({
          slices,
          newContribution: Number(
            args.newContribution ?? Math.max(500, report.capacity.safeMonthlyInvestment),
          ),
        });
        break;
      }

      case "calculate_fire_number": {
        category = "calculation";
        const report = analyzeFinances(data, start, end);
        result = calculateFinancialIndependence({
          desiredMonthlyIncome: Number(
            args.desiredMonthlyIncome ?? Math.max(3000, report.emergency.monthlyCostReference),
          ),
          currentPatrimony: Number(args.currentPatrimony ?? report.summary.wealth),
          monthlyContribution: Number(
            args.monthlyContribution ?? Math.max(500, report.capacity.safeMonthlyInvestment),
          ),
          annualNominalReturnPct: Number(args.annualNominalReturnPct ?? 10.5),
          annualInflationPct: Number(args.annualInflationPct ?? 4.5),
          safeWithdrawalRateAnnualPct: Number(args.safeWithdrawalRateAnnualPct ?? 4.0),
        });
        break;
      }

      case "calculate_loan_amortization": {
        category = "calculation";
        const report = analyzeFinances(data, start, end);
        result = calculateDebtPayoff({
          principal: Number(
            args.principal ??
              Math.max(1000, report.debts.overduePendingAmount + report.debts.creditCardBalance),
          ),
          monthlyRatePct: Number(args.monthlyRatePct ?? 1.8),
          months: Number(args.months ?? 24),
          extraMonthlyPayment: Number(args.extraMonthlyPayment ?? 300),
        });
        break;
      }
    }

    return {
      tool_name: toolName,
      type: category,
      asset_id: assetId,
      portfolio_id: portfolioId,
      arguments: args,
      result,
      status: "success",
      error_message: null,
      duration_ms: Math.max(1, Date.now() - startedAt),
    };
  } catch (err) {
    return {
      tool_name: toolName,
      type: category,
      asset_id: assetId,
      portfolio_id: portfolioId,
      arguments: args,
      result: null,
      status: "error",
      error_message: (err as Error).message || "Falha ao executar ferramenta.",
      duration_ms: Math.max(1, Date.now() - startedAt),
    };
  }
}
