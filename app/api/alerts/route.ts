import { NextResponse } from "next/server"
import type { Alert } from "@/types/api-types"

export async function GET() {
  const alerts: Alert[] = [
    { id: 1, type: "error", message: "High error rate on /api/auth endpoint", time: "2 minutes ago" },
    { id: 2, type: "warning", message: "CPU usage above 80% threshold", time: "15 minutes ago" },
    { id: 3, type: "error", message: "Database connection failures detected", time: "32 minutes ago" },
    { id: 4, type: "warning", message: "Memory usage approaching limit", time: "1 hour ago" },
  ]

  return NextResponse.json(alerts)
}

