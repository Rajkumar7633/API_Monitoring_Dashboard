import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // 1. Attempt to proxy
  const proxied = await proxyRequest(request, "/api/sim/status")
  if (proxied) return proxied

  // 2. Standalone Fallback
  const running = (global as any)._simRunning ?? false
  return NextResponse.json({ running })
}
