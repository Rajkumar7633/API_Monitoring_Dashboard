import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

const mockSnapshots = [
  { id: "snap-1", source: "api", endpoint: "/api/users", method: "GET", status: 500, traceId: "tr-001", ts: Date.now() - 10 * 60000 },
  { id: "snap-2", source: "api", endpoint: "/api/auth", method: "POST", status: 401, traceId: "tr-002", ts: Date.now() - 25 * 60000 },
  { id: "snap-3", source: "api", endpoint: "/api/products", method: "GET", status: 404, traceId: "tr-003", ts: Date.now() - 40 * 60000 },
  { id: "snap-4", source: "api", endpoint: "/api/auth", method: "POST", status: 429, traceId: "tr-004", ts: Date.now() - 55 * 60000 },
  { id: "snap-5", source: "api", endpoint: "/api/orders", method: "POST", status: 503, traceId: "tr-005", ts: Date.now() - 70 * 60000 },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const hours = Number(searchParams.get("hours") || "24")
  const limit = Number(searchParams.get("limit") || "100")

  const proxied = await proxyRequest(request, `/api/errors/snapshots?hours=${hours}&limit=${limit}`)
  if (proxied) return proxied

  // Standalone Fallback
  return NextResponse.json({ items: mockSnapshots, count: mockSnapshots.length })
}
