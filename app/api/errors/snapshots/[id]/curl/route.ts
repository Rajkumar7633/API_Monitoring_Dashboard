import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxied = await proxyRequest(request, `/api/errors/snapshots/${id}/curl`)
  if (proxied) return proxied

  // Standalone Fallback
  // Let's resolve the request details locally and format curl command
  const host = request.headers.get("host") || "localhost:3000"
  const protocol = request.url.startsWith("https") ? "https" : "http"

  const details: Record<string, any> = {
    "snap-1": { endpoint: "/api/users", method: "GET", headers: { "accept": "*/*" }, body: null },
    "snap-2": { endpoint: "/api/auth", method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "malicious_user" }) },
    "snap-3": { endpoint: "/api/products", method: "GET", headers: {}, body: null },
    "snap-4": { endpoint: "/api/auth", method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "admin" }) },
    "snap-5": { endpoint: "/api/orders", method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ id: 4, quantity: 2 }] }) }
  }

  const d = details[id] || { endpoint: "/api/unknown", method: "GET", headers: {}, body: null }
  
  const headerFlags = Object.entries(d.headers)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(" ")

  const bodyFlag = d.body ? `--data '${d.body}'` : ""
  const fullUrl = `${protocol}://${host}${d.endpoint}`
  const cmd = `curl -i -X ${d.method} ${headerFlags} ${bodyFlag} "${fullUrl}"`.replace(/\s+/g, " ").trim()

  return new Response(cmd, {
    headers: {
      "content-type": "text/plain",
      "cache-control": "no-store",
    }
  })
}
