function miss() {
  return Response.json({ dungeons: [], activity: [], offers: [] }, { status: 404 });
}

export function GET() {
  return miss();
}

export function POST() {
  return miss();
}
