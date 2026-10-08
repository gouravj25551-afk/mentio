import { NextResponse } from "next/server";
import { applyExternalBlock, calComBlock, calendlyBlock, verifyCalCom, verifyCalendly } from "@/services/calendar/webhooks";

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const raw = await req.text();
  const verified = provider === "cal-com"
    ? verifyCalCom(raw, req.headers.get("x-cal-signature-256"))
    : provider === "calendly" && verifyCalendly(raw, req.headers.get("calendly-webhook-signature"));
  if (!verified) return new NextResponse("Unauthorized", { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new NextResponse("Invalid JSON", { status: 400 }); }
  if (provider === "cal-com") await applyExternalBlock("CAL_COM", calComBlock(body).organizerId, calComBlock(body).block);
  else if (provider === "calendly") await applyExternalBlock("CALENDLY", calendlyBlock(body).organizerId, calendlyBlock(body).block);
  else return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ ok: true });
}
