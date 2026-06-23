import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

const defaultThresholds = {
  cpuWarning: 80,
  cpuCritical: 90,
  memoryWarning: 85,
  memoryCritical: 95,
  dbConnWarning: 75,
  dbConnCritical: 90,
  latencyWarningMs: 500,
  latencyCriticalMs: 1500,
  errorRateWarning: 5,
  errorRateCritical: 15,
}

export async function GET(request: Request) {
  // 1. Attempt to proxy
  const proxied = await proxyRequest(request, "/api/thresholds")
  if (proxied) return proxied

  // 2. Standalone Fallback
  if (!(global as any)._thresholds) {
    ;(global as any)._thresholds = { ...defaultThresholds }
  }
  return NextResponse.json((global as any)._thresholds)
}

export async function POST(request: Request) {
  // 1. Attempt to proxy
  const proxied = await proxyRequest(request, "/api/thresholds")
  if (proxied) return proxied

  // 2. Standalone Fallback
  try {
    const body = await request.json()
    ;(global as any)._thresholds = {
      ...defaultThresholds,
      ...body
    }
    return NextResponse.json((global as any)._thresholds)
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to parse body" }, { status: 400 })
  }
}
