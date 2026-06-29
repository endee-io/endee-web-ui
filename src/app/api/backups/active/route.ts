import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/backups/active?db=<database>  -> active backup status
export async function GET(request: Request) {
  try {
    const db = requireDatabase(request)
    const result = await getImpersonatedClient(db).activeBackup()
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
