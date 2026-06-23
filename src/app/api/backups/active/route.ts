import { backupFetch, requireDatabase } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/backups/active?db=<database>  -> active backup status
export async function GET(request: Request) {
  try {
    const db = requireDatabase(request)
    const upstream = await backupFetch(db, "/backups/active", { method: "GET" })
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
