import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

const defaultSettings = {
  schemaVersion: "1.0",
  apiKeys: { production: "", development: "" },
  monitors: [
    { name: "Local Health", url: "http://localhost:3001/api/health", method: "GET", intervalMs: 60000 }
  ],
  alerts: { slackWebhookUrl: "", webhookUrl: "" },
  synthetics: { jitterPct: 0.2, spreadStartMs: 2000 },
  tracing: { otlpEndpoint: "" }
}

export async function GET(request: Request) {
  // 1. Attempt to proxy
  const proxied = await proxyRequest(request, "/api/settings")
  if (proxied) return proxied

  // 2. Standalone Fallback
  if (!(global as any)._settings) {
    ;(global as any)._settings = { ...defaultSettings }
  }
  return NextResponse.json((global as any)._settings)
}

export async function POST(request: Request) {
  // 1. Attempt to proxy
  const proxied = await proxyRequest(request, "/api/settings")
  if (proxied) return proxied

  // 2. Standalone Fallback
  try {
    const body = await request.json()
    ;(global as any)._settings = {
      ...defaultSettings,
      ...body
    }
    return NextResponse.json((global as any)._settings)
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to parse body" }, { status: 400 })
  }
}
