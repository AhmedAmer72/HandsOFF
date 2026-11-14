export function GET() {
  return Response.json({ source: "LIVE", accounts: [], keeper: null });
}

export function POST() {
  return Response.json({ ok: false, source: "LIVE", error: "No signing key on this host." }, { status: 400 });
}
