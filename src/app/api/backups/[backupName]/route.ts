import { backupFetch, requireDatabase } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// DELETE /api/backups/<backupName>?db=<database>  -> delete a backup
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ backupName: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { backupName } = await params
    const upstream = await backupFetch(
      db,
      `/backups/${encodeURIComponent(backupName)}`,
      { method: "DELETE" }
    )
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
