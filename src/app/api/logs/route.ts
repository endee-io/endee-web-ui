import { NextResponse } from "next/server"
import { requireDatabase, backupFetch } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

/** Server-enforced maximum number of log lines per request. */
const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

// GET /api/logs?limit=<0-500>&db=<database>
// -> recent log lines for the database. Raw fetch: the endee client doesn't
//    expose this endpoint yet.
export async function GET(request: Request) {
  try {
    const db = requireDatabase(request)
    const rawLimit = new URL(request.url).searchParams.get("limit")
    const parsed = rawLimit === null ? DEFAULT_LIMIT : Number(rawLimit)
    if (!Number.isFinite(parsed)) {
      return NextResponse.json({ error: "Invalid limit parameter." }, { status: 400 })
    }
    const limit = Math.min(Math.max(Math.trunc(parsed), 0), MAX_LIMIT)
    const upstream = await backupFetch(request, db, `/logs?limit=${limit}`)
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
