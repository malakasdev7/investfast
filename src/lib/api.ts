import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: NextRequest, scope: string, maxRequests = 30, windowMs = 60_000) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'local';
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > maxRequests) {
    throw new Error('RATE_LIMITED');
  }
}

export async function authenticated() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error('UNAUTHORIZED');
  return { supabase, user };
}

export function checkOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const requestOrigin = new URL(request.url).origin;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
    : requestOrigin;
  if (!origin || (origin !== configuredOrigin && origin !== requestOrigin)) {
    throw new Error('FORBIDDEN');
  }
}

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Não foi possível concluir a operação.';
  const status =
    message === 'UNAUTHORIZED'
      ? 401
      : message === 'FORBIDDEN'
        ? 403
        : message === 'RATE_LIMITED'
          ? 429
          : 400;
  return Response.json(
    {
      error:
        status === 401
          ? 'Entre novamente para continuar.'
          : status === 403
            ? 'Origem não autorizada.'
            : status === 429
              ? 'Muitas tentativas em sequência. Aguarde um minuto e tente novamente.'
              : message,
    },
    { status },
  );
}

export function isMissingRelationError(code?: string, message?: string) {
  if (!code && !message) return false;
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === '42883' ||
    Boolean(message && /does not exist|schema cache|Could not find the table/i.test(message))
  );
}

export async function logSecurityEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entity: string,
  action: string,
  recordId: string | null = null,
  details: Record<string, unknown> = {},
) {
  try {
    await supabase.rpc('log_security_event', {
      p_entity: entity,
      p_action: action,
      p_record_id: recordId,
      p_details: details,
    });
  } catch {
    // Non-blocking if migration 20261115_evolution.sql has not been applied yet
  }
}

export function databaseError(code: string, message: string) {
  if (code === '23503')
    return new Error('Este registro possui vínculos. Remova os lançamentos vinculados ou arquive o registro.');
  if (code === '23505') return new Error('Já existe um registro com esses dados.');
  if (code === '42501') return new Error('Sem permissão para alterar este registro.');
  if (code === 'P0001') return new Error(message);
  if (code === '23514' || code === '22003')
    return new Error('Os dados não atendem às regras de valor, categoria ou data.');
  console.error('Database error', code, message);
  return new Error('Não foi possível salvar. Verifique os campos e tente novamente.');
}

