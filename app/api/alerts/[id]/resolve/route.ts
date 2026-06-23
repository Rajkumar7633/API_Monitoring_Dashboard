import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxied = await proxyRequest(request, `/api/alerts/${id}/resolve`)
  if (proxied) return proxied

  return NextResponse.json({
    id: Number(id) || id,
    status: "resolved",
    message: "Alert marked as resolved",
    resolvedAt: new Date().toISOString()
  })
}
