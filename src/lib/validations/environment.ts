import { z } from "zod";

const supabaseEnvironmentSchema = z.object({
  url: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  }, "Use HTTPS fora do ambiente local."),
  publishableKey: z.string().startsWith("sb_publishable_"),
});

export function getSupabaseEnvironment() {
  const result = supabaseEnvironmentSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!result.success) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local com a URL e a chave publicável do InvestFast.");
  }
  return result.data;
}
