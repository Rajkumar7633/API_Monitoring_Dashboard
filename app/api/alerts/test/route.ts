import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const proxied = await proxyRequest(request, "/api/alerts/test")
  if (proxied) return proxied

  return NextResponse.json({ ok: true, results: { slack: 200, webhook: 200 } })
}
