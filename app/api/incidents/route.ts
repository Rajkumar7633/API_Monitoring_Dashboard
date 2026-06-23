import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const hours = Number(searchParams.get("hours") || "24")
  const limit = Number(searchParams.get("limit") || "100")

  const proxied = await proxyRequest(request, `/api/incidents?hours=${hours}&limit=${limit}`)
  if (proxied) return proxied

  // Mock Fallback
  const items = [
    {
      kind: "alert",
      id: "alert-101",
      service: "Auth Service",
      severity: "error",
      message: "High error rate on /api/auth endpoint",
      details: "Error rate exceeded 15% threshold",
      status: "active",
      ts: Date.now() - 120_000 // 2 minutes ago
    },
    {
      kind: "alert",
      id: "alert-102",
      service: "System",
      severity: "warning",
      message: "CPU usage above 80% threshold",
      details: "Current CPU usage 84%",
      status: "active",
      ts: Date.now() - 900_000 // 15 minutes ago
    },
    {
      kind: "service_check",
      id: "check-payment-101",
      service: "Payments Service",
      status: "Degraded",
      response_ms: 382,
      ts: Date.now() - 1800_000 // 30 minutes ago
    }
  ]

  return NextResponse.json({ hours, count: items.length, items })
}
