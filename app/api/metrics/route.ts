import { NextResponse } from "next/server"
import type { ResourceMetrics } from "@/types/api-types"

export async function GET() {
  const cpuCurrent = 60 + Math.floor(Math.random() * 20)
  const memoryUsed = 12 + (Math.random() * 1.5 - 0.75)

  const metrics: ResourceMetrics = {
    cpu: {
      current: cpuCurrent,
      peak: 85 + Math.floor(Math.random() * 10),
      average: 45 + Math.floor(Math.random() * 15),
      cores: 8,
    },
    memory: {
      total: 16,
      used: memoryUsed,
      free: 16 - memoryUsed,
      usedPercentage: Math.round((memoryUsed / 16) * 100),
    },
  }

  return NextResponse.json(metrics)
}

