import { NextResponse } from "next/server";
import { requireProjectManager } from "@/lib/pm-guard";
import { getRates, SUPPORTED_CURRENCIES } from "@/lib/fx";

export const runtime = "nodejs";

// GET /api/pm/fx — cached daily EUR-based exchange rates
export async function GET() {
  const actor = await requireProjectManager();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rates = await getRates();
  return NextResponse.json({ base: "EUR", rates, currencies: SUPPORTED_CURRENCIES });
}
