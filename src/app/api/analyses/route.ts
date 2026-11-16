import { NextRequest } from "next/server";
import { z } from "zod";
import type { Json } from "@/types/database";
import {
  authenticated,
  apiError,
  checkOrigin,
  databaseError,
  isMissingRelationError,
  rateLimit,
} from "@/lib/api";
import { analyzeFinances } from "@/lib/calculations/analytics";
import { type Snapshot } from "@/lib/domain";

const syncSchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();

export async function GET() {
  try {
    const { supabase, user } = await authenticated();
    const [insightsRes, recsRes] = await Promise.all([
      supabase
        .from("financial_insights")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("recommendations")
        .select("*")
        .eq("user_id", user.id)
        .neq("type", "can_i_buy")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (insightsRes.error && isMissingRelationError(insightsRes.error.code, insightsRes.error.message)) {
      return Response.json({ insights: [], recommendations: [], migrationPending: true });
    }
    if (insightsRes.error) throw databaseError(insightsRes.error.code, insightsRes.error.message);

    return Response.json({
      insights: insightsRes.data ?? [],
      recommendations: recsRes.data ?? [],
      migrationPending: false,
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    rateLimit(request, "analyses-sync", 15, 60_000);
    const { supabase, user } = await authenticated();
    const parsed = syncSchema.parse(await request.json());

    const { data: snapshotData, error: snapErr } = await supabase.rpc("app_snapshot");
    if (snapErr) throw databaseError(snapErr.code, snapErr.message);

    const report = analyzeFinances((snapshotData ?? {}) as Snapshot, parsed.start, parsed.end);

    const insightRows = [
      {
        user_id: user.id,
        type: "savings_rate",
        severity: report.summary.savingsRatePct >= 20 ? "positive" : report.summary.savingsRatePct > 0 ? "info" : "warning",
        title: `Taxa de poupança de ${report.summary.savingsRatePct.toFixed(1)}%`,
        summary: `Receitas de R$ ${report.summary.income.toFixed(2)} e despesas de R$ ${report.summary.expense.toFixed(2)} no período.`,
        metric_value: report.summary.savingsRatePct,
        benchmark_value: 20,
        period_start: `${parsed.start}T00:00:00Z`,
        period_end: `${parsed.end}T23:59:59Z`,
        details: report.summary as unknown as Json,
      },
      {
        user_id: user.id,
        type: "emergency_fund",
        severity: report.emergency.status === "adequada" ? "positive" : report.emergency.status === "parcial" ? "warning" : "critical",
        title: `Reserva de emergência: ${report.emergency.monthsCovered.toFixed(1)} meses`,
        summary: `Reserva efetiva de R$ ${report.emergency.effectiveReserve.toFixed(2)} para meta de 6 meses (R$ ${report.emergency.targetSixMonths.toFixed(2)}).`,
        metric_value: report.emergency.monthsCovered,
        benchmark_value: 6,
        details: report.emergency as unknown as Json,
      },
      {
        user_id: user.id,
        type: "investment_capacity",
        severity: report.capacity.safeMonthlyInvestment > 0 ? "info" : "warning",
        title: `Capacidade de investimento: R$ ${report.capacity.safeMonthlyInvestment.toFixed(2)}/mês`,
        summary: `Representa ${report.capacity.currentCapacityPct.toFixed(1)}% da sua renda mensal média.`,
        metric_value: report.capacity.safeMonthlyInvestment,
        details: report.capacity as unknown as Json,
      },
      {
        user_id: user.id,
        type: "diversification",
        severity: report.portfolio.diversificationScore >= 70 ? "positive" : report.portfolio.diversificationScore >= 40 ? "info" : "warning",
        title: `Diversificação ${report.portfolio.diversificationLevel} (${report.portfolio.diversificationScore}/100)`,
        summary: `${report.portfolio.assetCount} ativo(s) em ${report.portfolio.classCount} classe(s).`,
        metric_value: report.portfolio.diversificationScore,
        details: report.portfolio as unknown as Json,
      },
      {
        user_id: user.id,
        type: "profitability",
        severity: report.profitability.returnPct >= 0 ? "positive" : "warning",
        title: `Rentabilidade da carteira: ${report.profitability.returnPct.toFixed(2)}%`,
        summary: `Ganho de capital de R$ ${report.profitability.capitalGain.toFixed(2)} e R$ ${report.dividends.twelveMonthsTotal.toFixed(2)} em proventos nos últimos 12 meses.`,
        metric_value: report.profitability.returnPct,
        details: {
          profitability: report.profitability,
          dividends: report.dividends,
        } as unknown as Json,
      },
    ];

    const { data: savedInsights, error: insErr } = await supabase
      .from("financial_insights")
      .insert(insightRows)
      .select("*");

    if (insErr) {
      if (isMissingRelationError(insErr.code, insErr.message)) {
        throw new Error(
          "Execute a migração 20261115020000_investfast_intelligence_and_calculator.sql no Supabase para salvar diagnósticos no banco.",
        );
      }
      throw databaseError(insErr.code, insErr.message);
    }

    const recRows = report.recommendations.map((rec) => ({
      user_id: user.id,
      type: "portfolio_improvement",
      verdict: rec.priority === "alta" ? "action_required" : "review",
      priority: rec.priority === "alta" ? "high" : rec.priority === "media" ? "medium" : "low",
      title: rec.title,
      rationale: `${rec.why} Impacto esperado: ${rec.impact}`,
      context_snapshot: { actionHref: rec.actionHref, actionLabel: rec.actionLabel } as Json,
      status: "active",
    }));

    if (recRows.length > 0) {
      await supabase.from("recommendations").insert(recRows);
    }

    return Response.json({ savedCount: savedInsights?.length ?? 0 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "Parâmetros de período inválidos." }, { status: 422 });
    }
    return apiError(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    checkOrigin(request);
    const { supabase, user } = await authenticated();
    const { id, kind } = z
      .object({
        id: z.uuid(),
        kind: z.enum(["insight", "recommendation"]).default("insight"),
      })
      .strict()
      .parse(await request.json());

    const table = kind === "recommendation" ? "recommendations" : "financial_insights";
    const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
    if (error) throw databaseError(error.code, error.message);

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "Identificador inválido." }, { status: 422 });
    }
    return apiError(e);
  }
}
