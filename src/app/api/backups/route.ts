import { backupFetch, requireDatabase } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/backups?db=<database>  -> list backups
export async function GET(request: Request) {
  try {
    const db = requireDatabase(request)
    const upstream = await backupFetch(db, "/backups", { method: "GET" })
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
