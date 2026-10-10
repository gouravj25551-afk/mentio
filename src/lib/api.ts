import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { HttpError } from "@/lib/errors";
import { logError } from "@/lib/log";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Maps thrown errors to responses. Only HttpError and validation messages are
 * shown to callers; anything unexpected is logged and returned as a generic 500
 * so internal details (Prisma errors, stack traces) never reach the client.
 */
export function apiCatch(err: unknown) {
  if (err instanceof HttpError) return apiError(err.message, err.status);
  if (err instanceof ZodError) return apiError(err.issues[0]?.message ?? "Invalid request", 422);
  logError("api.unhandled", err);
  return apiError("Something went wrong. Please try again.", 500);
}

/** Parses a JSON body, turning malformed JSON into a 400 instead of a 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}
