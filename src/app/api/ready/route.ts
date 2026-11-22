import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

/** Readiness includes the columns needed by live mentor queries, not just TCP access. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    await db.$queryRaw`SELECT "schedulingMode", "verificationUrl" FROM "MentorProfile" LIMIT 0`;
    await db.$queryRaw`SELECT "key" FROM "RateLimitBucket" LIMIT 0`;
    return NextResponse.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    logError("ready.schema_or_db_unavailable", err);
    return NextResponse.json({ status: "degraded" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
