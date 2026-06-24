import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { aiService } from "@/services/ai.service";

export const runtime = "nodejs";

// GET /api/ai/status — report the active AI provider (no secrets exposed)
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    engine: aiService.engine,
    model: aiService.modelName,
    live: aiService.isLive(),
  });
}
