import { NextResponse } from "next/server"
import type { TokenType } from "endee"
import { getImpersonatedClient, requireDatabase } from "@/lib/endeeServer"
import { errorResponse } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/tokens?db=<database>  -> list the selected database's tokens
export async function GET(request: Request) {
  try {
    const db = requireDatabase(request)
    const tokens = await getImpersonatedClient(request, db).listMyTokens()
    return NextResponse.json({ tokens })
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/tokens?db=<database>
//   body { name, token_type }  -> mint a new token; returns the db_token (once)
export async function POST(request: Request) {
  try {
    const db = requireDatabase(request)
    const { name, token_type } = (await request.json()) as {
      name: string
      token_type: TokenType
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }
    const result = await getImpersonatedClient(request, db).createMyToken(name.trim(), token_type)
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
