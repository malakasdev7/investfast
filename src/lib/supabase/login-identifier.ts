import 'server-only';
import { z } from 'zod';

/** Apelidos de login ficam somente no servidor; a senha continua sendo validada pelo Auth. */
export function resolveLoginEmail(identifier:string):string|null {
  const normalized=identifier.trim().toLowerCase();
  if(z.email().safeParse(normalized).success)return normalized;
  const aliases=z.record(z.string(),z.email()).parse(JSON.parse(process.env.INVESTFAST_LOGIN_ALIASES||'{}'));
  return Object.hasOwn(aliases,normalized)?aliases[normalized]:null;
}
