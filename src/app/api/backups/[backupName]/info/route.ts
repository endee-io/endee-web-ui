import { backupFetch, requireDatabase } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/backups/<backupName>/info?db=<database>  -> backup metadata
export async function GET(
  request: Request,
  { params }: { params: Promise<{ backupName: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { backupName } = await params
    const upstream = await backupFetch(
      db,
      `/backups/${encodeURIComponent(backupName)}/info`,
      { method: "GET" }
    )
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
