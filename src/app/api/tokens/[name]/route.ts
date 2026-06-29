import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// DELETE /api/tokens/<name>?db=<database>  -> delete one of this database's tokens
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name } = await params
    const result = await getImpersonatedClient(db).deleteMyToken(name)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
