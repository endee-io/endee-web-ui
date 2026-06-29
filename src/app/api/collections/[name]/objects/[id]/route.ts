import { NextResponse } from "next/server"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// DELETE /api/collections/<name>/objects/<id>?db=<database>  -> delete one object
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string; id: string }> }
) {
  try {
    const db = requireDatabase(request)
    const { name, id } = await params
    const collection = await getImpersonatedClient(db).getCollection(name)
    const result = await collection.deleteObject(id)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
