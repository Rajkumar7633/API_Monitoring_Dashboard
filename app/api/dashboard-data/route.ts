import { NextResponse } from "next/server"
import type {
  ApiEndpoint,
  ApiLog,
  ApiStats,
  Alert,
  DatabaseMetrics,
  ResourceMetrics,
  ServiceHealth,
} from "@/types/api-types"

export const dynamic = "force-dynamic"

let cachedBackendToken: string | null = null
let cachedBackendTokenAtMs = 0
let lastBackendAuthError: any = null

async function getBackendToken(base: string) {
  const explicit = process.env.BACKEND_TOKEN
  if (explicit && explicit.trim().length > 0) {
    lastBackendAuthError = null
    return explicit.trim()
  }

  const username = process.env.BACKEND_USERNAME
  const password = process.env.BACKEND_PASSWORD
  if (!username || !password) {
    lastBackendAuthError = {
      reason: "missing_credentials",
      hasUsername: Boolean(username),
      hasPassword: Boolean(password),
    }
    return null
  }

  const now = Date.now()
  if (cachedBackendToken && now - cachedBackendTokenAtMs < 20 * 60 * 1000) {
    return cachedBackendToken
  }

  let res: Response
  try {
    res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    })
  } catch (e: any) {
    lastBackendAuthError = {
      reason: "login_request_failed",
      message: String(e?.message || e),
    }
    return null
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    lastBackendAuthError = {
      reason: "login_failed",
      status: res.status,
      bodySnippet: text.slice(0, 500),
    }
    return null
  }

  const json = await res.json().catch(() => null)
  const token = json?.token
  if (typeof token !== "string" || token.length === 0) {
    lastBackendAuthError = {
      reason: "login_missing_token",
      status: res.status,
      bodySnippet: JSON.stringify(json)?.slice(0, 500),
    }
    return null
  }

  cachedBackendToken = token
  cachedBackendTokenAtMs = now
  lastBackendAuthError = null
  return token
}

async function proxyIfConfigured(pathnameWithQuery: string) {
  const backend = process.env.BACKEND_URL
  if (!backend || backend.trim().length === 0) return null

  const base = backend.replace(/\/+$/g, "")
  const target = `${base}${pathnameWithQuery.startsWith("/") ? "" : "/"}${pathnameWithQuery}`

  const token = await getBackendToken(base)
  if (!token) {
    return NextResponse.json(
      {
        error: "backend_auth_unavailable",
        message:
          "BACKEND_URL is set but no backend auth token could be obtained. Set BACKEND_TOKEN, or set BACKEND_USERNAME and BACKEND_PASSWORD in Vercel Production and redeploy.",
        details: lastBackendAuthError,
      },
      { status: 500 },
    )
  }
  const headers: Record<string, string> = {}
  if (token) headers.authorization = `Bearer ${token}`

  let res = await fetch(target, { cache: "no-store", headers })
  if (res.status === 401 && token && !process.env.BACKEND_TOKEN) {
    cachedBackendToken = null
    cachedBackendTokenAtMs = 0
    const refreshed = await getBackendToken(base)
    const retryHeaders: Record<string, string> = {}
    if (refreshed) retryHeaders.authorization = `Bearer ${refreshed}`
    res = await fetch(target, { cache: "no-store", headers: retryHeaders })
  }

  const body = await res.text()

  return new Response(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
      "cache-control": "no-store",
    },
  })
}

function generateTimeSeriesData(points: number) {
  const data: { time: string; value: number }[] = []
  const baseValue = 100 + Math.floor(Math.random() * 50)

  for (let i = 0; i < points; i++) {
    const hour = i.toString().padStart(2, "0") + ":00"
    const value = baseValue + Math.floor(Math.random() * 150 - 50)
    data.push({ time: hour, value: Math.max(20, value) })
  }

  return data
}

export async function GET(request: Request) {
  const proxied = await proxyIfConfigured(new URL(request.url).pathname + new URL(request.url).search)
  if (proxied) return proxied

  const { searchParams } = new URL(request.url)
  const timeRange = searchParams.get("timeRange") || "24h"

  const stats: ApiStats = {
    totalRequests: 4800 + Math.floor(Math.random() * 200),
    requestsChange: 12.5 + (Math.random() * 5 - 2.5),
    errorRate: 1.7 + (Math.random() * 0.6 - 0.3),
    errorRateChange: -0.3 + (Math.random() * 0.6 - 0.3),
    avgResponseTime: 145 + Math.floor(Math.random() * 30 - 15),
    responseTimeChange: 23 + Math.floor(Math.random() * 10 - 5),
    uptime: 99.98 + (Math.random() * 0.04 - 0.02),
  }

  const endpointsSeed = [
    { name: "/api/users", requests: 1200, errors: 23 },
    { name: "/api/products", requests: 890, errors: 12 },
    { name: "/api/orders", requests: 760, errors: 8 },
    { name: "/api/auth", requests: 1500, errors: 35 },
    { name: "/api/payments", requests: 450, errors: 5 },
  ]

  const endpoints: ApiEndpoint[] = endpointsSeed.map((endpoint) => ({
    ...endpoint,
    requests: endpoint.requests + Math.floor(Math.random() * 100),
    errors: endpoint.errors + Math.floor(Math.random() * 5),
    responseTime: generateTimeSeriesData(24),
  }))

  const logs: ApiLog[] = [
    {
      id: 1,
      endpoint: "/api/users",
      status: 500,
      message: "Internal Server Error",
      timestamp: "2023-06-15T14:32:21",
      duration: 842,
    },
    {
      id: 2,
      endpoint: "/api/auth",
      status: 401,
      message: "Unauthorized Access",
      timestamp: "2023-06-15T14:28:10",
      duration: 120,
    },
    {
      id: 3,
      endpoint: "/api/products",
      status: 404,
      message: "Resource Not Found",
      timestamp: "2023-06-15T14:15:45",
      duration: 76,
    },
    {
      id: 4,
      endpoint: "/api/auth",
      status: 429,
      message: "Too Many Requests",
      timestamp: "2023-06-15T14:10:33",
      duration: 210,
    },
    {
      id: 5,
      endpoint: "/api/orders",
      status: 503,
      message: "Service Unavailable",
      timestamp: "2023-06-15T13:58:22",
      duration: 1560,
    },
  ]

  const alerts: Alert[] = [
    { id: 1, type: "error", message: "High error rate on /api/auth endpoint", time: "2 minutes ago" },
    { id: 2, type: "warning", message: "CPU usage above 80% threshold", time: "15 minutes ago" },
    { id: 3, type: "error", message: "Database connection failures detected", time: "32 minutes ago" },
    { id: 4, type: "warning", message: "Memory usage approaching limit", time: "1 hour ago" },
  ]

  const cpuCurrent = 60 + Math.floor(Math.random() * 20)
  const memoryUsed = 12 + (Math.random() * 1.5 - 0.75)

  const resourceMetrics: ResourceMetrics = {
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

  const databaseMetrics: DatabaseMetrics = {
    queries: {
      total: 15200 + Math.floor(Math.random() * 300),
      slow: 8 + Math.floor(Math.random() * 3),
      average: 12 + Math.floor(Math.random() * 10),
    },
    connections: {
      active: 12 + Math.floor(Math.random() * 5),
      idle: 6 + Math.floor(Math.random() * 3),
      max: 50,
      usedPercentage: 0,
    },
    slowQueries: [],
  }
  databaseMetrics.connections.usedPercentage = Math.round(
    ((databaseMetrics.connections.active + databaseMetrics.connections.idle) / databaseMetrics.connections.max) * 100,
  )

  const serviceHealth: ServiceHealth[] = [
    {
      id: 1,
      name: "User Service",
      status: "Healthy",
      responseTime: 120 + Math.floor(Math.random() * 40),
      uptime: "99.9%",
      lastChecked: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Auth Service",
      status: "Healthy",
      responseTime: 90 + Math.floor(Math.random() * 30),
      uptime: "99.95%",
      lastChecked: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Payments Service",
      status: "Degraded",
      responseTime: 250 + Math.floor(Math.random() * 120),
      uptime: "99.2%",
      lastChecked: new Date().toISOString(),
    },
  ]

  return NextResponse.json({
    stats,
    endpoints,
    logs,
    alerts,
    resourceMetrics,
    databaseMetrics,
    serviceHealth,
    meta: {
      timeRange,
      timestamp: new Date().toISOString(),
    },
  })
}
