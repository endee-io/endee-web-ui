import { NextResponse } from "next/server"
import type { DbType } from "endee"
import { getAdminClient } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

/**
 * Server-side proxy for the server's databases. Runs on the server only so the
 * admin ROOT_TOKEN (required for /admin/dbs) is never exposed to the browser.
 *
 * GET  /api/databases  ->  { databases: DatabaseInfo[] }
 * POST /api/databases  ->  create a database; returns the new db_token (once)
 */

// This route depends on request-time env/secrets; never statically cache it.
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const databases = await (await getAdminClient(request)).listDatabases()
    return NextResponse.json({ databases })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const { db_name, db_type } = (await request.json()) as {
      db_name: string
      db_type: DbType
    }
    if (!db_name || !db_name.trim()) {
      return NextResponse.json({ error: "db_name is required" }, { status: 400 })
    }
    const result = await (await getAdminClient(request)).createDatabase(db_name.trim(), db_type)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
