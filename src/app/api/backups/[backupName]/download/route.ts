import { NextResponse } from "next/server"
import { backendUrlWithToken, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/backups/<backupName>/download?db=<database>
//   -> { url } pointing at the backend download endpoint with the auth token.
//      The browser then hits that URL directly to stream the .tar.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ backupName: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { backupName } = await params
    const url = backendUrlWithToken(
      db,
      `/backups/${encodeURIComponent(backupName)}/download`
    )
    return NextResponse.json({ url })
  } catch (error) {
    return errorResponse(error)
  }
}
