import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Readiness: can we reach the database? Reports only ok or degraded, never details. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    logError("ready.db_unreachable", err);
    return NextResponse.json({ status: "degraded" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
