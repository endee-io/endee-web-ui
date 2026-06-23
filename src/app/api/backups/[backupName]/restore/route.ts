import { backupFetch, requireDatabase } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/backups/<backupName>/restore?db=<database>  -> restore into target index
export async function POST(
  request: Request,
  { params }: { params: Promise<{ backupName: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { backupName } = await params
    const body = await request.text()
    const upstream = await backupFetch(
      db,
      `/backups/${encodeURIComponent(backupName)}/restore`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }
    )
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
