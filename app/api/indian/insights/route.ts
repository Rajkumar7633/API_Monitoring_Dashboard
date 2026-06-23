import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const proxied = await proxyRequest(request, "/api/indian/insights")
  if (proxied) return proxied

  // Standalone Fallback
  return NextResponse.json({
    digitalGrowth: "India has 800+ million active internet users with massive UPI adoption.",
    mobileFirst: "Over 85% of active traffic is mobile-first, predominantly via Jio and Airtel.",
    regionalLanguages: "APIs serving localized portals experience 3x increase in micro-transactions.",
    peakUsage: "Network peak usage occurs between 8:00 PM and 11:30 PM (IST) across all regions.",
    emergingTech: "5G rollouts in metro centers have reduced average edge latency by 45%.",
    compliance: "CERT-In requires prompt logging of unauthorized access and system errors."
  })
}
