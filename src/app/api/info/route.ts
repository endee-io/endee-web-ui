import { getServerConfig } from "@/lib/endeeServer"
import { errorResponse, passthroughJson } from "@/lib/apiRoute"

export const dynamic = "force-dynamic"

// GET /api/info -> server + license info (version, build_arch, machine_id, license).
// Server-level (root token), not scoped to a database — mirrors /license/*.
export async function GET(request: Request) {
  try {
    const { url, token } = await getServerConfig(request)
    const upstream = await fetch(`${url}/info`, {
      headers: { Authorization: token },
      cache: "no-store",
    })
    return passthroughJson(upstream)
  } catch (error) {
    return errorResponse(error)
  }
}
