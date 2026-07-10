import { NextResponse } from "next/server"
import { requireDatabase, backupFetch } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/collections/<name>/objects/<id>/links?field=<field>&db=<database>
// -> graph neighbors of an object for a dense field. Raw fetch: the endee
//    client doesn't expose this endpoint yet.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name, id } = await params
    const field = new URL(request.url).searchParams.get("field")?.trim()
    if (!field) {
      return NextResponse.json({ error: "Missing field parameter." }, { status: 400 })
    }
    const upstream = await backupFetch(
      request,
      db,
      `/collection/${name}/objects/${id}/links?field=${encodeURIComponent(field)}`
    )
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
