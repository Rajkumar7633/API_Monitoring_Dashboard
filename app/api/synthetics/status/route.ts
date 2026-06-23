import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // 1. Attempt to proxy
  const proxied = await proxyRequest(request, "/api/synthetics/status")
  if (proxied) return proxied

  // 2. Standalone Fallback
  const running = (global as any)._syntheticsRunning ?? false
  return NextResponse.json({ running, monitorsCount: 1 })
}
