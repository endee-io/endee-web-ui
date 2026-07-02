import { NextResponse } from "next/server"
import { getAppMode } from "@/lib/appConfig"

export const dynamic = "force-dynamic"

// GET /api/mode -> { mode: "bundled" | "independent" }
// Exposes the runtime APP_MODE so the client can conditionally render server
// management (add / import / download) in independent mode only.
export async function GET() {
  return NextResponse.json({ mode: getAppMode() })
}
