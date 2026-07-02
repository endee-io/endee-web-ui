import { NextResponse } from "next/server"
import { backupFetch, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/backups/<backupName>/download?db=<database>
//   -> streams the .tar through this proxy. The backend is fetched server-side
//      (its URL may be a compose-internal host, and its token must not reach the
//      browser), and the bytes are piped straight back to the client.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ backupName: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { backupName } = await params
    const upstream = await backupFetch(
      request,
      db,
      `/backups/${encodeURIComponent(backupName)}/download`
    )
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "")
      return NextResponse.json(
        { error: text || `Download failed (status ${upstream.status}).` },
        { status: upstream.status || 502 }
      )
    }
    const headers = new Headers()
    headers.set(
      "Content-Type",
      upstream.headers.get("Content-Type") || "application/x-tar"
    )
    headers.set(
      "Content-Disposition",
      upstream.headers.get("Content-Disposition") ||
        `attachment; filename="${backupName}.tar"`
    )
    const len = upstream.headers.get("Content-Length")
    if (len) headers.set("Content-Length", len)
    return new NextResponse(upstream.body, { status: 200, headers })
  } catch (error) {
    return errorResponse(error)
  }
}
