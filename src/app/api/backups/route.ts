import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/backups?db=<database>  -> list backups
export async function GET(request: Request) {
  try {
    const db = requireDatabase(request)
    const result = await getImpersonatedClient(db).listBackups()
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
