import { NextResponse } from "next/server"
import type { ApiStats } from "@/types/api-types"

export async function GET(request: Request) {
  // Get time range from query parameters
  const { searchParams } = new URL(request.url)
  const timeRange = searchParams.get("timeRange") || "24h"

  // Generate mock stats data
  const stats: ApiStats = {
    totalRequests: 4800 + Math.floor(Math.random() * 200),
    requestsChange: 12.5 + (Math.random() * 5 - 2.5),
    errorRate: 1.7 + (Math.random() * 0.6 - 0.3),
    errorRateChange: -0.3 + (Math.random() * 0.6 - 0.3),
    avgResponseTime: 145 + Math.floor(Math.random() * 30 - 15),
    responseTimeChange: 23 + Math.floor(Math.random() * 10 - 5),
    uptime: 99.98 + (Math.random() * 0.04 - 0.02),
  }

  return NextResponse.json(stats)
}

