import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const proxied = await proxyRequest(request, "/api/reports/generate")
  if (proxied) return proxied

  // Return mock generated report details
  try {
    const body = await request.json()
    const { templateId } = body
    
    return NextResponse.json({
      id: `rep-${Math.floor(100 + Math.random() * 900)}`,
      templateId,
      format: templateId === "weekly-performance" ? "excel" : templateId === "monthly-incidents" ? "csv" : "pdf",
      generatedAt: new Date().toISOString(),
      size: `${100 + Math.floor(Math.random() * 800)} KB`,
      status: "completed",
      downloadUrl: "#"
    })
  } catch (e: any) {
    return NextResponse.json({ error: "Failed to parse body" }, { status: 400 })
  }
}
