import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  // 1. Attempt to proxy
  const proxied = await proxyRequest(request, "/api/sim/stop")
  if (proxied) return proxied

  // 2. Standalone Fallback
  ;(global as any)._simRunning = false
  return NextResponse.json({ running: false })
}
