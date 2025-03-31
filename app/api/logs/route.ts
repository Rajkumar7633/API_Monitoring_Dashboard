import { NextResponse } from "next/server"
import type { ApiLog } from "@/types/api-types"

export async function GET(request: Request) {
  // Get endpoint and time range from query parameters
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") || "all"
  const timeRange = searchParams.get("timeRange") || "24h"

  const allLogs: ApiLog[] = [
    { id: 1, endpoint: "/api/users", status: 500, message: "Internal Server Error", timestamp: "2023-06-15T14:32:21" },
    { id: 2, endpoint: "/api/auth", status: 401, message: "Unauthorized Access", timestamp: "2023-06-15T14:28:10" },
    { id: 3, endpoint: "/api/products", status: 404, message: "Resource Not Found", timestamp: "2023-06-15T14:15:45" },
    { id: 4, endpoint: "/api/auth", status: 429, message: "Too Many Requests", timestamp: "2023-06-15T14:10:33" },
    { id: 5, endpoint: "/api/orders", status: 503, message: "Service Unavailable", timestamp: "2023-06-15T13:58:22" },
    { id: 6, endpoint: "/api/payments", status: 400, message: "Bad Request", timestamp: "2023-06-15T13:45:11" },
    { id: 7, endpoint: "/api/users", status: 422, message: "Unprocessable Entity", timestamp: "2023-06-15T13:30:05" },
  ]

  // Filter logs by endpoint if specified
  const filteredLogs = endpoint === "all" ? allLogs : allLogs.filter((log) => log.endpoint === endpoint)

  return NextResponse.json(filteredLogs)
}

