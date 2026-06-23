import { NextResponse } from "next/server"
import { getDataSourceMode } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET() {
  const mode = getDataSourceMode()
  const backend = mode === "mock" ? null : process.env.BACKEND_URL
  if (backend && backend.trim().length > 0) {
    try {
      const res = await fetch(`${backend.replace(/\/+$/g, "")}/api/health`, {
        cache: "no-store",
      })
      const body = await res.text()
      return new NextResponse(body, {
        status: res.status,
        headers: {
          "content-type": res.headers.get("content-type") || "application/json",
          "cache-control": "no-store",
        },
      })
    } catch (error: any) {
      return NextResponse.json(
        { ok: false, error: "backend_unreachable", message: String(error?.message || error) },
        { status: 502 },
      )
    }
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
}
