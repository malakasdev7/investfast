export function GET() {
  return Response.json({ application: "InvestFast", status: "ok" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
