import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const proxied = await proxyRequest(request, "/api/synthetics/start")
  if (proxied) return proxied

  ;(global as any)._syntheticsRunning = true
  return NextResponse.json({ running: true, monitorsCount: 1 })
}
