import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") || "/api/users"
  const range = Number(searchParams.get("range") || "24")
  const bucket = Number(searchParams.get("bucket") || "60")

  // 1. Attempt to proxy
  const queryPath = `/api/series/error-rate?endpoint=${encodeURIComponent(endpoint)}&range=${range}&bucket=${bucket}`
  const proxied = await proxyRequest(request, queryPath)
  if (proxied) return proxied

  // 2. Mock Fallback
  const data = []
  const bucketMs = bucket * 60 * 1000
  const now = Date.now()
  const startTs = now - range * 60 * 60 * 1000
  
  // Deterministic seed based on endpoint name
  let seed = endpoint.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const baseErrorRate = (seed % 3) // 0 - 2% base error rate

  for (let ts = startTs; ts < now; ts += bucketMs) {
    const total = 100 + Math.floor(Math.random() * 500)
    // Add random spikes
    const isSpike = Math.random() > 0.93
    const errorRate = isSpike ? (10 + Math.random() * 15) : baseErrorRate + (Math.random() * 0.8)
    const errors = Math.round(total * (errorRate / 100))
    const rate = Number(errorRate.toFixed(1))

    data.push({ ts, total, errors, rate })
  }

  return NextResponse.json({ endpoint, hours: range, bucketMinutes: bucket, data })
}
