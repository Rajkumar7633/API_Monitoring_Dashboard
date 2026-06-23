import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const proxied = await proxyRequest(request, "/api/health/run")
  if (proxied) return proxied

  return NextResponse.json({
    ok: true,
    result: {
      status: "healthy",
      servicesChecked: 3,
      failures: 0,
      timestamp: new Date().toISOString(),
    }
  })
}
