import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const proxied = await proxyRequest(request, "/api/synthetics/test")
  if (proxied) return proxied

  // Return a mock successful check result
  return NextResponse.json({
    ok: true,
    result: {
      status: 200,
      responseTimeMs: 85,
      bodySize: 1024,
      dnsTimeMs: 12,
      tcpTimeMs: 22,
      sslTimeMs: 15,
      certExpiryDays: 245,
    }
  })
}
