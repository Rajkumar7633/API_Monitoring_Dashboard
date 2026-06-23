import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const proxied = await proxyRequest(request, `/api/alerts/${id}/ack`)
  if (proxied) return proxied

  return NextResponse.json({
    id: Number(id) || id,
    status: "acknowledged",
    message: "Alert marked as acknowledged",
    acknowledgedAt: new Date().toISOString()
  })
}
