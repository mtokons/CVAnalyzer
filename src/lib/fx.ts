import { prisma } from "@/lib/prisma";

// Base currency for the platform.
export const BASE_CURRENCY = "EUR";

// Common currencies surfaced in the UI; experts can bill in any of these.
export const SUPPORTED_CURRENCIES = [
  "EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "INR",
  "PKR", "BDT", "AED", "SAR", "TRY", "EGP", "ZAR", "KES", "NGN", "CAD",
  "AUD", "JPY", "CNY", "SGD", "BRL",
];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
// Free, no-key endpoints (base = EUR). Tried in order with a fallback.
const FX_ENDPOINTS = [
  "https://api.frankfurter.app/latest?from=EUR",
  "https://open.er-api.com/v6/latest/EUR",
];

/** Normalises responses from the supported FX providers to a {CODE: rate} map. */
function parseRates(json: any): Record<string, number> | null {
  if (json?.rates && typeof json.rates === "object") return json.rates;
  return null;
}

/**
 * Returns a map of 1 EUR -> rate, cached daily in the DB. Falls back to the
 * last cached values (or EUR-only) if the network/providers are unavailable.
 */
export async function getRates(): Promise<Record<string, number>> {
  const cached = await prisma.exchangeRate.findMany();
  const fresh =
    cached.length > 0 &&
    Date.now() - new Date(cached[0].fetchedAt).getTime() < ONE_DAY_MS;

  if (fresh) {
    const map: Record<string, number> = { EUR: 1 };
    for (const r of cached) map[r.code] = r.rate;
    return map;
  }

  for (const url of FX_ENDPOINTS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const rates = parseRates(await res.json());
      if (!rates) continue;
      const now = new Date();
      await prisma.$transaction(
        Object.entries(rates).map(([code, rate]) =>
          prisma.exchangeRate.upsert({
            where: { code },
            update: { rate: rate as number, fetchedAt: now },
            create: { code, rate: rate as number, fetchedAt: now },
          })
        )
      );
      return { EUR: 1, ...rates };
    } catch {
      // try next provider
    }
  }

  // Network failed — return whatever we cached, else EUR-only.
  const map: Record<string, number> = { EUR: 1 };
  for (const r of cached) map[r.code] = r.rate;
  return map;
}

/** Converts an amount in `from` currency into EUR using cached rates. */
export async function toEur(amount?: number | null, from = "EUR"): Promise<number | null> {
  if (amount == null) return null;
  if (from === "EUR") return round2(amount);
  const rates = await getRates();
  const rate = rates[from];
  if (!rate) return round2(amount); // unknown currency: treat as EUR
  return round2(amount / rate);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
