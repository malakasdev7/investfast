import { NextRequest } from "next/server";
import { z } from "zod";
import {
  authenticated,
  apiError,
  checkOrigin,
  databaseError,
  isMissingRelationError,
  logSecurityEvent,
  rateLimit,
} from "@/lib/api";

const saveSchema = z
  .object({
    asset_ticker: z.string().trim().min(1).max(24),
    asset_name: z.string().trim().min(1).max(120),
    asset_class: z.enum([
      "cdi",
      "stock",
      "fii",
      "etf",
      "bdr",
      "treasury",
      "cdb",
      "lci",
      "lca",
      "cri",
      "cra",
      "debenture",
      "fund",
      "crypto",
      "pension",
      "other",
    ]),
    amount: z.number().positive().max(999_999_999_999),
    horizon: z.enum(["short", "medium", "long"]),
    risk_profile: z.enum(["conservative", "moderate", "aggressive"]),
    verdict: z.enum([
      "Pode considerar",
      "Atenção",
      "Não recomendado agora",
      "Preciso de mais informações",
    ]),
    score: z.number().int().min(0).max(100),
    analysis: z.record(z.string(), z.unknown()),
  })
  .strict();

function mapDbVerdict(verdict: string, analysis: Record<string, unknown>) {
  if (verdict === "Pode considerar") return "approved";
  if (verdict === "Atenção") return "caution";
  if (verdict === "Preciso de mais informações") return "review";
  const criteria = Array.isArray(analysis.criteria) ? analysis.criteria : [];
  const hasDebtDanger = criteria.some(
    (c) =>
      typeof c === "object" &&
      c !== null &&
      (c as { key?: string; status?: string }).key === "debts" &&
      (c as { status?: string }).status === "danger",
  );
  if (hasDebtDanger) return "prioritize_debt";
  const hasReserveDanger = criteria.some(
    (c) =>
      typeof c === "object" &&
      c !== null &&
      (c as { key?: string; status?: string }).key === "emergency_reserve" &&
      (c as { status?: string }).status === "danger",
  );
  if (hasReserveDanger) return "prioritize_reserve";
  return "not_recommended";
}

function normalizeRecommendationRow(row: Record<string, unknown>) {
  const ctx =
    row.context_snapshot && typeof row.context_snapshot === "object"
      ? (row.context_snapshot as Record<string, unknown>)
      : {};
  const verdictMap: Record<string, string> = {
    approved: "Pode considerar",
    caution: "Atenção",
    not_recommended: "Não recomendado agora",
    prioritize_debt: "Não recomendado agora",
    prioritize_reserve: "Não recomendado agora",
    review: "Preciso de mais informações",
  };
  return {
    id: String(row.id ?? ""),
    asset_ticker: String(ctx.asset_ticker ?? row.title ?? "ATIVO"),
    asset_name: String(ctx.asset_name ?? row.title ?? ""),
    asset_class: String(ctx.asset_class ?? "other"),
    amount: String(row.requested_amount ?? ctx.amount ?? "0"),
    horizon: String(ctx.horizon ?? "long"),
    risk_profile: String(ctx.risk_profile ?? "moderate"),
    verdict: String(ctx.verdictLabel ?? verdictMap[String(row.verdict)] ?? "Atenção"),
    score: Number(ctx.score ?? 50),
    analysis:
      ctx.analysis && typeof ctx.analysis === "object"
        ? (ctx.analysis as Record<string, unknown>)
        : {},
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function GET() {
  try {
    const { supabase, user } = await authenticated();
    const { data, error } = await supabase
      .from("recommendations")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "can_i_buy")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) {
      return Response.json({
        items: (data ?? []).map((row) =>
          normalizeRecommendationRow(row as Record<string, unknown>),
        ),
        migrationPending: false,
      });
    }

    if (!isMissingRelationError(error.code, error.message)) {
      throw databaseError(error.code, error.message);
    }

    // Fallback para tabela legada purchase_evaluations
    const legacy = await supabase
      .from("purchase_evaluations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (legacy.error) {
      if (isMissingRelationError(legacy.error.code, legacy.error.message)) {
        return Response.json({ items: [], migrationPending: true });
      }
      throw databaseError(legacy.error.code, legacy.error.message);
    }

    return Response.json({ items: legacy.data ?? [], migrationPending: false });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    rateLimit(request, "can-i-buy", 30, 60_000);
    const { supabase, user } = await authenticated();
    const body = await request.json();
    const parsed = saveSchema.parse(body);

    const ticker = parsed.asset_ticker.toUpperCase();
    const portfolioImpact =
      parsed.analysis.portfolioImpact && typeof parsed.analysis.portfolioImpact === "object"
        ? (parsed.analysis.portfolioImpact as Record<string, unknown>)
        : {};
    const budgetImpact =
      parsed.analysis.budgetImpact && typeof parsed.analysis.budgetImpact === "object"
        ? (parsed.analysis.budgetImpact as Record<string, unknown>)
        : {};

    const dbVerdict = mapDbVerdict(parsed.verdict, parsed.analysis);
    const { data, error } = await supabase
      .from("recommendations")
      .insert({
        user_id: user.id,
        type: "can_i_buy",
        verdict: dbVerdict,
        priority: dbVerdict === "approved" ? "low" : dbVerdict === "caution" ? "medium" : "high",
        title: `Posso comprar ${ticker}? (${parsed.verdict})`.slice(0, 180),
        rationale: String(parsed.analysis.headline ?? parsed.verdict),
        requested_amount: parsed.amount,
        max_recommended_amount:
          typeof parsed.analysis.maxRecommendedAmount === "number"
            ? parsed.analysis.maxRecommendedAmount
            : null,
        budget_impact_pct:
          typeof budgetImpact.capacityUsagePct === "number" ? budgetImpact.capacityUsagePct : null,
        portfolio_share_before:
          typeof portfolioImpact.assetShareBeforePct === "number"
            ? portfolioImpact.assetShareBeforePct
            : null,
        portfolio_share_after:
          typeof portfolioImpact.assetShareAfterPct === "number"
            ? portfolioImpact.assetShareAfterPct
            : null,
        risks: Array.isArray(parsed.analysis.risks) ? parsed.analysis.risks : [],
        alternatives: Array.isArray(parsed.analysis.alternatives) ? parsed.analysis.alternatives : [],
        follow_up_questions: Array.isArray(parsed.analysis.followUpQuestions)
          ? parsed.analysis.followUpQuestions
          : [],
        context_snapshot: {
          asset_ticker: ticker,
          asset_name: parsed.asset_name,
          asset_class: parsed.asset_class,
          amount: parsed.amount,
          horizon: parsed.horizon,
          risk_profile: parsed.risk_profile,
          verdictLabel: parsed.verdict,
          score: parsed.score,
          analysis: parsed.analysis,
        },
      })
      .select("*")
      .single();

    if (!error && data) {
      await logSecurityEvent(supabase, "recommendations", "EVALUATE", data.id, {
        ticker,
        verdict: parsed.verdict,
        amount: parsed.amount,
      });
      return Response.json({
        item: normalizeRecommendationRow(data as Record<string, unknown>),
      });
    }

    if (error && !isMissingRelationError(error.code, error.message)) {
      throw databaseError(error.code, error.message);
    }

    const legacy = await supabase
      .from("purchase_evaluations")
      .insert({
        user_id: user.id,
        asset_ticker: ticker,
        asset_name: parsed.asset_name,
        asset_class: parsed.asset_class,
        amount: String(parsed.amount),
        horizon: parsed.horizon,
        risk_profile: parsed.risk_profile,
        verdict: parsed.verdict,
        score: parsed.score,
        analysis: parsed.analysis,
      })
      .select("*")
      .single();

    if (legacy.error) {
      if (isMissingRelationError(legacy.error.code, legacy.error.message)) {
        throw new Error(
          "Execute a migração 20261115020000_investfast_intelligence_and_calculator.sql no Supabase para salvar avaliações no banco.",
        );
      }
      throw databaseError(legacy.error.code, legacy.error.message);
    }

    await logSecurityEvent(supabase, "purchase_evaluations", "EVALUATE", legacy.data.id, {
      ticker,
      verdict: parsed.verdict,
      amount: parsed.amount,
    });

    return Response.json({ item: legacy.data });
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
      .from("recommendations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error && isMissingRelationError(error.code, error.message)) {
      const legacy = await supabase
        .from("purchase_evaluations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (legacy.error) throw databaseError(legacy.error.code, legacy.error.message);
      return Response.json({ ok: true });
    }

    if (error) throw databaseError(error.code, error.message);

    // Garante limpeza também na tabela legada se o registro antigo existir lá
    await supabase
      .from("purchase_evaluations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return Response.json({ error: "Identificador inválido." }, { status: 422 });
    }
    return apiError(e);
  }
}

