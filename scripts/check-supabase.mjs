const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key?.startsWith("sb_publishable_")) {
  console.error("Configure a URL e a chave publicável em .env.local.");
  process.exitCode = 1;
} else {
  try {
    const response = await fetch(new URL("/auth/v1/settings", url), {
      headers: { apikey: key },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Supabase respondeu HTTP ${response.status}.`);
    const settings = await response.json();
    console.log(JSON.stringify({
      connected: true,
      emailEnabled: settings.external?.email === true,
      emailConfirmationRequired: settings.mailer_autoconfirm === false,
    }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Falha ao conectar ao Supabase.");
    process.exitCode = 1;
  }
}
