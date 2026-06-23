import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

const mockSnapshotsDetails: Record<string, any> = {
  "snap-1": {
    id: "snap-1",
    source: "api",
    endpoint: "/api/users",
    method: "GET",
    status: 500,
    request_headers: { "user-agent": "Mozilla/5.0", "accept": "*/*" },
    request_body: null,
    response_snippet: "TypeError: Cannot read properties of undefined (reading 'name')\n    at UserController.getUsers (/server/controllers/user.js:24:12)",
    traceId: "tr-001",
    ts: Date.now() - 10 * 60000
  },
  "snap-2": {
    id: "snap-2",
    source: "api",
    endpoint: "/api/auth",
    method: "POST",
    status: 401,
    request_headers: { "content-type": "application/json" },
    request_body: { username: "malicious_user" },
    response_snippet: "{\"error\":\"Unauthorized\",\"message\":\"Invalid credentials provided\"}",
    traceId: "tr-002",
    ts: Date.now() - 25 * 60000
  },
  "snap-3": {
    id: "snap-3",
    source: "api",
    endpoint: "/api/products",
    method: "GET",
    status: 404,
    request_headers: {},
    request_body: null,
    response_snippet: "Product with ID 9999 not found",
    traceId: "tr-003",
    ts: Date.now() - 40 * 60000
  },
  "snap-4": {
    id: "snap-4",
    source: "api",
    endpoint: "/api/auth",
    method: "POST",
    status: 429,
    request_headers: { "x-forwarded-for": "103.45.2.1" },
    request_body: { username: "admin" },
    response_snippet: "Too Many Requests - Rate limit exceeded. Retry in 60s.",
    traceId: "tr-004",
    ts: Date.now() - 55 * 60000
  },
  "snap-5": {
    id: "snap-5",
    source: "api",
    endpoint: "/api/orders",
    method: "POST",
    status: 503,
    request_headers: { "content-type": "application/json" },
    request_body: { items: [{ id: 4, quantity: 2 }] },
    response_snippet: "Service Unavailable - Order processing queue full",
    traceId: "tr-005",
    ts: Date.now() - 70 * 60000
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxied = await proxyRequest(request, `/api/errors/snapshots/${id}`)
  if (proxied) return proxied

  // Standalone Fallback
  const detail = mockSnapshotsDetails[id] || {
    id,
    source: "api",
    endpoint: "/api/unknown",
    method: "GET",
    status: 500,
    request_headers: {},
    request_body: null,
    response_snippet: "An error occurred but details are not cached locally.",
    traceId: "tr-unknown",
    ts: Date.now()
  }

  return NextResponse.json(detail)
}
