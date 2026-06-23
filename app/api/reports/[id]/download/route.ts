import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxied = await proxyRequest(request, `/api/reports/${id}/download`)
  if (proxied) return proxied

  // Standalone Mock Fallback
  return NextResponse.json({
    error: "Mock mode: report downloaded locally (mock files are not persisted on disk)."
  }, { status: 200 })
}
