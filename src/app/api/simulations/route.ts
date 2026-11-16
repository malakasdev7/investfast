import { NextRequest } from "next/server";
import { z } from "zod";
import type { Json } from "@/types/database";
import {
  authenticated,
  apiError,
  checkOrigin,
  databaseError,
  isMissingRelationError,
  logSecurityEvent,
  rateLimit,
} from "@/lib/api";

const calculatorTypeEnum = z.enum([
  "compound_interest",
  "monthly_contributions",
  "financial_goal",
  "financial_independence",
  "fire",
  "real_return",
  "investment_comparator",
  "investment_comparison",
  "portfolio_rebalance",
  "portfolio_rebalancing",
  "debt_payoff",
  "loan_amortization",
  "stocks_fiis",
  "fixed_income",
  "crypto",
]);

const simulationSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    calculator_type: calculatorTypeEnum,
    inputs: z.record(z.string(), z.unknown()),
    results: z.record(z.string(), z.unknown()),
    notes: z.string().max(1000).optional().nullable(),
    asset_id: z.uuid().optional().nullable(),
    portfolio_id: z.uuid().optional().nullable(),
  })
  .strict();

const updateSchema = simulationSchema.extend({
  id: z.uuid(),
});

// Mapeamento entre nomes da UI e CHECK constraints da tabela investment_calculations
function toDbCalculationType(uiType: string): string {
  switch (uiType) {
    case "financial_independence":
      return "fire";
    case "investment_comparator":
      return "investment_comparison";
    case "portfolio_rebalance":
      return "portfolio_rebalancing";
    case "debt_payoff":
      return "loan_amortization";
    default:
      return uiType;
  }
}

function toUiCalculatorType(dbType: string): string {
  switch (dbType) {
    case "fire":
      return "financial_independence";
    case "investment_comparison":
      return "investment_comparator";
    case "portfolio_rebalancing":
      return "portfolio_rebalance";
    case "loan_amortization":
      return "debt_payoff";
    default:
      return dbType;
  }
}

function asNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", ".").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractNumericColumns(
  inputs: Record<string, unknown>,
  results: Record<string, unknown>,
) {
  const ratePeriodRaw = inputs.ratePeriod === "monthly" ? "monthly" : "yearly";
  const termUnitRaw = inputs.termUnit === "years" ? "years" : "months";
  const compoundingRaw =
    inputs.compounding === "yearly" || inputs.compounding === "continuous"
      ? inputs.compounding
      : "monthly";

  return {
    initial_amount: Math.max(0, asNum(inputs.initialAmount) ?? 0),
    monthly_contribution: asNum(inputs.monthlyContribution) ?? 0,
    interest_rate: asNum(inputs.annualRatePct) ?? 0,
    rate_period: ratePeriodRaw,
    term_value: Math.max(0, asNum(inputs.months) ?? 0),
    term_unit: termUnitRaw,
    compounding: compoundingRaw,
    inflation_rate: asNum(inputs.annualInflationPct) ?? 0,
    tax_rate: Math.max(0, Math.min(100, asNum(inputs.taxRatePct) ?? 0)),
    admin_fee: Math.max(0, Math.min(100, asNum(inputs.adminFeePct) ?? 0)),
    target_amount: asNum(inputs.goalTarget),
    safe_withdrawal_rate: asNum(inputs.swrPct),
    final_gross_amount: asNum(results.finalTotal ?? results.netTotal),
    final_net_amount: asNum(results.finalNetTotal ?? results.netTotal),
    total_invested: asNum(results.totalInvested),
    total_interest: asNum(results.totalInterest),
    total_return_pct: asNum(results.totalReturnPct),
    annualized_return_pct: asNum(results.annualizedReturnPct),
    real_return_pct: asNum(results.realReturnPct ?? results.realAnnualPct),
  };
}

function normalizeCalculationRow(row: Record<string, unknown>) {
  const typeValue = String(row.type ?? row.calculator_type ?? "compound_interest");
  return {
    id: row.id,
    name: String(row.title ?? row.name ?? "Simulação"),
    title: String(row.title ?? row.name ?? "Simulação"),
    calculator_type: toUiCalculatorType(typeValue),
    type: typeValue,
    inputs: (row.inputs as Record<string, unknown>) ?? {},
    results: (row.results as Record<string, unknown>) ?? {},
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? row.created_at ?? ""),
  };
}

export async function GET() {
  try {
    const { supabase, user } = await authenticated();
    const { data, error } = await supabase
      .from("investment_calculations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      if (isMissingRelationError(error.code, error.message)) {
        const legacy = await supabase
          .from("investment_simulations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (legacy.error) {
          if (isMissingRelationError(legacy.error.code, legacy.error.message)) {
            return Response.json({ items: [], migrationPending: true });
          }
          throw databaseError(legacy.error.code, legacy.error.message);
        }

        return Response.json({
          items: (legacy.data ?? []).map((r) => normalizeCalculationRow(r as unknown as Record<string, unknown>)),
          migrationPending: false,
        });
      }
      throw databaseError(error.code, error.message);
    }

    return Response.json({
      items: (data ?? []).map((r) => normalizeCalculationRow(r as unknown as Record<string, unknown>)),
      migrationPending: false,
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    rateLimit(request, "simulations", 30, 60_000);
    const { supabase, user } = await authenticated();
    const body = await request.json();
    const parsed = simulationSchema.parse(body);

    const nums = extractNumericColumns(parsed.inputs, parsed.results);
    const dbType = toDbCalculationType(parsed.calculator_type);

    const { data, error } = await supabase
      .from("investment_calculations")
      .insert({
        user_id: user.id,
        title: parsed.name,
        type: dbType,
        asset_id: parsed.asset_id ?? null,
        portfolio_id: parsed.portfolio_id ?? null,
        ...nums,
        inputs: parsed.inputs as Json,
        results: parsed.results as Json,
        notes: parsed.notes ?? null,
      })
      .select("*")
      .single();

    if (error) {
      if (isMissingRelationError(error.code, error.message)) {
        const legacy = await supabase
          .from("investment_simulations")
          .insert({
            user_id: user.id,
            name: parsed.name,
            calculator_type: parsed.calculator_type,
            inputs: parsed.inputs,
            results: parsed.results,
            notes: parsed.notes ?? null,
          })
          .select("*")
          .single();

        if (legacy.error) {
          throw new Error(
            "Execute a migração 20261115020000_investfast_intelligence_and_calculator.sql no Supabase para salvar simulações.",
          );
        }

        return Response.json({
          item: normalizeCalculationRow(legacy.data as unknown as Record<string, unknown>),
        });
      }
      throw databaseError(error.code, error.message);
    }

    await logSecurityEvent(supabase, "investment_calculations", "SAVE_SIMULATION", data.id, {
      type: dbType,
      title: parsed.name,
    });

    return Response.json({
      item: normalizeCalculationRow(data as unknown as Record<string, unknown>),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json(
        { error: e.issues.map((i) => i.message).join(" ") },
        { status: 422 },
      );
    }
    return apiError(e);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    checkOrigin(request);
    rateLimit(request, "simulations", 30, 60_000);
    const { supabase, user } = await authenticated();
    const body = await request.json();
    const parsed = updateSchema.parse(body);

    const nums = extractNumericColumns(parsed.inputs, parsed.results);
    const dbType = toDbCalculationType(parsed.calculator_type);

    const { data, error } = await supabase
      .from("investment_calculations")
      .update({
        title: parsed.name,
        type: dbType,
        asset_id: parsed.asset_id ?? null,
        portfolio_id: parsed.portfolio_id ?? null,
        ...nums,
        inputs: parsed.inputs as Json,
        results: parsed.results as Json,
        notes: parsed.notes ?? null,
      })
      .eq("id", parsed.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw databaseError(error.code, error.message);

    await logSecurityEvent(supabase, "investment_calculations", "UPDATE_SIMULATION", data.id, {
      type: dbType,
      title: parsed.name,
    });

    return Response.json({
      item: normalizeCalculationRow(data as unknown as Record<string, unknown>),
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json(
        { error: e.issues.map((i) => i.message).join(" ") },
        { status: 422 },
      );
    }
    return apiError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    checkOrigin(request);
    const { supabase, user } = await authenticated();
    const body = await request.json();
    const { id } = z.object({ id: z.uuid() }).strict().parse(body);

    const { error } = await supabase
      .from("investment_calculations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      if (isMissingRelationError(error.code, error.message)) {
        const legacy = await supabase
          .from("investment_simulations")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (legacy.error) throw databaseError(legacy.error.code, legacy.error.message);
        return Response.json({ ok: true });
      }
      throw databaseError(error.code, error.message);
    }

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "Identificador inválido." }, { status: 422 });
    }
    return apiError(e);
  }
}
