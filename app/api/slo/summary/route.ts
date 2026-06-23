import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get("endpoint") || "/api/users"
  const hours = Number(searchParams.get("hours") || "24")
  const availabilityTarget = Number(searchParams.get("availabilityTarget") || "99.9")
  const latencyP95TargetMs = Number(searchParams.get("latencyP95TargetMs") || "400")

  // 1. Attempt to proxy
  const queryPath = `/api/slo/summary?endpoint=${encodeURIComponent(endpoint)}&hours=${hours}&availabilityTarget=${availabilityTarget}&latencyP95TargetMs=${latencyP95TargetMs}`
  const proxied = await proxyRequest(request, queryPath)
  if (proxied) return proxied

  // 2. Mock Fallback
  const total = 5000 + Math.floor(Math.random() * 2000)
  const errors = Math.floor(Math.random() * 15) // small errors to keep availability high
  const availability = total ? (1 - errors / total) * 100 : 100
  
  const seed = endpoint.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const p95 = 120 + (seed % 100) + Math.floor(Math.random() * 20)
  const p99 = Math.round(p95 * 1.5)
  const compliant = p95 <= latencyP95TargetMs

  const consumed = Math.max(0, 100 - availability)
  const budget = Math.max(0, availabilityTarget - consumed)
  const budgetUsedPct = availabilityTarget > 0 ? Math.min(100, (consumed / availabilityTarget) * 100) : 0

  return NextResponse.json({
    endpoint,
    windowHours: hours,
    totals: { total, errors },
    availability: Number(availability.toFixed(3)),
    availabilityTarget,
    errorBudgetRemaining: Number(budget.toFixed(3)),
    errorBudgetUsedPct: Number(budgetUsedPct.toFixed(2)),
    latency: { p95, p99, targetP95: latencyP95TargetMs, compliant }
  })
}
