import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const proxied = await proxyRequest(request, "/api/reports/history")
  if (proxied) return proxied

  // Standalone Fallback
  return NextResponse.json([
    { id: "rep-001", templateId: "daily-sla", format: "pdf", generatedAt: new Date(Date.now() - 3600_000).toISOString(), size: "482 KB", status: "completed" },
    { id: "rep-002", templateId: "weekly-performance", format: "excel", generatedAt: new Date(Date.now() - 86400_000).toISOString(), size: "1.2 MB", status: "completed" },
    { id: "rep-003", templateId: "monthly-incidents", format: "csv", generatedAt: new Date(Date.now() - 172800_000).toISOString(), size: "84 KB", status: "completed" }
  ])
}
