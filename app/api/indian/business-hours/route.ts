import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const region = searchParams.get("region") || ""
  
  const query = region ? `/api/indian/business-hours/${region}` : "/api/indian/business-hours"
  const proxied = await proxyRequest(request, query)
  if (proxied) return proxied

  // Standalone Fallback
  const baseHours = {
    start: "09:00",
    end: "18:00",
    timezone: "Asia/Kolkata",
    lunchStart: "13:00",
    lunchEnd: "14:00",
    workDays: [1, 2, 3, 4, 5]
  }
  if (region === "West") baseHours.start = "08:30"
  else if (region === "South") baseHours.start = "09:30"

  return NextResponse.json(baseHours)
}
