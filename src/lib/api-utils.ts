// Shared helpers for the API routes: safe JSON body parsing + validation.
import { NextResponse } from "next/server";
import { sanitizeBills, sanitizeHousehold } from "./household";
import { sanitizeTariff } from "./tariff";
import type { Bill, Household, Tariff } from "./types";

export interface Payload {
  household: Household;
  bills: Bill[];
  tariff: Tariff;
  raw: Record<string, unknown>;
}

const MAX_BODY = 200_000;

export async function readPayload(req: Request, { needHousehold = true } = {}): Promise<Payload | NextResponse> {
  let raw: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return bad("Request too large", 413);
    raw = text ? JSON.parse(text) : {};
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("Body must be a JSON object");
  } catch {
    return bad("Invalid JSON");
  }
  if (needHousehold && (!raw.household || typeof raw.household !== "object")) return bad("Missing household");
  return {
    household: sanitizeHousehold(raw.household),
    bills: sanitizeBills(raw.bills),
    tariff: sanitizeTariff(raw.tariff),
    raw,
  };
}

export function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export const json = (data: unknown) => NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });

/** Optional ?today=YYYY-MM-DD override (used by tests for stable output). */
export function todayFrom(raw: Record<string, unknown>): Date {
  const t = typeof raw.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.today) ? new Date(`${raw.today}T12:00:00`) : new Date();
  return Number.isNaN(t.getTime()) ? new Date() : t;
}
