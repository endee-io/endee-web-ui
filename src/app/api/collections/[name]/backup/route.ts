import { backupFetch, requireDatabase } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/collections/<name>/backup?db=<database>  -> create a backup of a collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const body = await request.text()
    const upstream = await backupFetch(
      db,
      `/index/${encodeURIComponent(name)}/backup`,
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
