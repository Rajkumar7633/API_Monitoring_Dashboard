import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const proxied = await proxyRequest(request, "/api/synthetics/run")
  if (proxied) return proxied

  return NextResponse.json({ ok: true, result: { checked: 1, failed: 0, timeMs: 42 } })
}
