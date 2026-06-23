import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const proxied = await proxyRequest(request, "/api/reports/templates")
  if (proxied) return proxied

  // Standalone Fallback
  return NextResponse.json([
    { id: "daily-sla", name: "Daily SLA & Compliance Report", description: "Aggregates P95/P99 latency, SLA availability target compliance, and DPDP rules validation.", format: "pdf" },
    { id: "weekly-performance", name: "Weekly Performance Trend", description: "Weekly request count, error logs breakdown, and load statistics.", format: "excel" },
    { id: "monthly-incidents", name: "Monthly Incident Log Summary", description: "Aggregates Cert-In logs, triggered alerts, MTTA, and MTTR averages.", format: "csv" }
  ])
}
