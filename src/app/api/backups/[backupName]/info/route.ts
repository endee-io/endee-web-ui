import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/backups/<backupName>/info?db=<database>  -> backup metadata
export async function GET(
  request: Request,
  { params }: { params: Promise<{ backupName: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { backupName } = await params
    const result = await getImpersonatedClient(request, db).backupInfo(backupName)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
