import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiCatch(err: unknown) {
  if (err instanceof ZodError) {
    return apiError(err.issues[0]?.message ?? "Invalid request", 422);
  }
  if (err instanceof Error) {
    const unauthMessages = ["UNAUTHENTICATED", "Not permitted"];
    if (unauthMessages.includes(err.message)) return apiError(err.message, 401);
    return apiError(err.message, 400);
  }
  return apiError("Unknown error", 500);
}
