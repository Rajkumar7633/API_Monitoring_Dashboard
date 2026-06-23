import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") || "/api/users"
  const range = Number(searchParams.get("range") || "24")
  const bucket = Number(searchParams.get("bucket") || "60")

  // 1. Attempt to proxy
  const queryPath = `/api/series/latency?endpoint=${encodeURIComponent(endpoint)}&range=${range}&bucket=${bucket}`
  const proxied = await proxyRequest(request, queryPath)
  if (proxied) return proxied

  // 2. Mock Fallback
  const data = []
  const bucketMs = bucket * 60 * 1000
  const now = Date.now()
  const startTs = now - range * 60 * 60 * 1000
  
  // Deterministic seed based on endpoint name
  let seed = endpoint.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const baseLatency = 80 + (seed % 120) // 80 - 200ms baseline

  for (let ts = startTs; ts < now; ts += bucketMs) {
    // Generate some hourly wave pattern
    const hour = new Date(ts).getHours()
    const wave = Math.sin((hour / 24) * Math.PI * 2) * 30 // sin wave amplitude 30ms
    const noise = Math.sin(ts) * 15
    const p50 = Math.max(10, Math.round(baseLatency + wave + noise))
    const p95 = Math.round(p50 * (1.5 + Math.random() * 0.5))
    const p99 = Math.round(p95 * (1.2 + Math.random() * 0.3))
    const count = 50 + Math.floor(Math.random() * 200)

    data.push({ ts, p50, p95, p99, count })
  }

  return NextResponse.json({ endpoint, hours: range, bucketMinutes: bucket, data })
}
