import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") || "/api/users"
  const range = Number(searchParams.get("range") || "24")
  const bucket = Number(searchParams.get("bucket") || "60")

  // 1. Attempt to proxy
  const queryPath = `/api/series/requests?endpoint=${encodeURIComponent(endpoint)}&range=${range}&bucket=${bucket}`
  const proxied = await proxyRequest(request, queryPath)
  if (proxied) return proxied

  // 2. Mock Fallback
  const data = []
  const bucketMs = bucket * 60 * 1000
  const now = Date.now()
  const startTs = now - range * 60 * 60 * 1000
  
  // Deterministic seed based on endpoint name
  let seed = endpoint.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const baseCount = 200 + (seed % 400) // 200 - 600 baseline

  for (let ts = startTs; ts < now; ts += bucketMs) {
    const hour = new Date(ts).getHours()
    const timeFactor = Math.sin((hour / 24) * Math.PI * 2) * 100 + 150 // Peak times wave
    const count = Math.max(10, Math.round(baseCount + timeFactor + (Math.random() * 50 - 25)))

    data.push({ ts, count })
  }

  return NextResponse.json({ endpoint, hours: range, bucketMinutes: bucket, data })
}
