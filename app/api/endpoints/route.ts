import { NextResponse } from "next/server"
import type { ApiEndpoint } from "@/types/api-types"

export async function GET(request: Request) {
  // Get time range from query parameters
  const { searchParams } = new URL(request.url)
  const timeRange = searchParams.get("timeRange") || "24h"

  const endpoints = [
    {
      name: "/api/users",
      requests: 1200 + Math.floor(Math.random() * 100),
      errors: 23 + Math.floor(Math.random() * 5),
    },
    {
      name: "/api/products",
      requests: 890 + Math.floor(Math.random() * 80),
      errors: 12 + Math.floor(Math.random() * 4),
    },
    { name: "/api/orders", requests: 760 + Math.floor(Math.random() * 70), errors: 8 + Math.floor(Math.random() * 3) },
    { name: "/api/auth", requests: 1500 + Math.floor(Math.random() * 120), errors: 35 + Math.floor(Math.random() * 7) },
    {
      name: "/api/payments",
      requests: 450 + Math.floor(Math.random() * 50),
      errors: 5 + Math.floor(Math.random() * 2),
    },
  ]

  // Generate response time data for each endpoint
  const result: ApiEndpoint[] = endpoints.map((endpoint) => ({
    ...endpoint,
    responseTime: generateTimeSeriesData(24),
  }))

  return NextResponse.json(result)
}

// Helper function to generate time series data
function generateTimeSeriesData(points: number) {
  const data = []
  const baseValue = 100 + Math.floor(Math.random() * 50)

  for (let i = 0; i < points; i++) {
    const hour = i.toString().padStart(2, "0") + ":00"
    const value = baseValue + Math.floor(Math.random() * 150 - 50)
    data.push({ time: hour, value: Math.max(20, value) })
  }

  return data
}

