import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const proxied = await proxyRequest(request, "/api/synthetics/stop")
  if (proxied) return proxied

  ;(global as any)._syntheticsRunning = false
  return NextResponse.json({ running: false, monitorsCount: 1 })
}
