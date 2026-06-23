import { backupFetch, requireDatabase } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// POST /api/backups/upload?db=<database>  -> upload a .tar backup (multipart)
export async function POST(request: Request) {
  try {
    const db = requireDatabase(request)
    const formData = await request.formData()
    const upstream = await backupFetch(db, "/backups/upload", {
      method: "POST",
      body: formData,
    })
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
