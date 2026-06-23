import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

const mockTracesSpans = [
  {
    id: "span-1",
    traceId: "trace-001",
    operationName: "HTTP GET /api/users",
    serviceName: "api-gateway",
    startTime: Date.now() - 1000,
    duration: 245,
    status: "ok",
    tags: { "http.method": "GET", "http.status_code": 200 }
  },
  {
    id: "span-2",
    traceId: "trace-001",
    operationName: "Database Query: SELECT users",
    serviceName: "user-service",
    startTime: Date.now() - 900,
    duration: 120,
    status: "ok",
    tags: { "db.type": "sqlite", "db.statement": "SELECT * FROM users" },
    parentId: "span-1"
  },
  {
    id: "span-3",
    traceId: "trace-001",
    operationName: "Cache Lookup: user:123",
    serviceName: "cache-service",
    startTime: Date.now() - 850,
    duration: 15,
    status: "ok",
    tags: { "cache.hit": "true" },
    parentId: "span-2"
  },
  {
    id: "span-4",
    traceId: "trace-002",
    operationName: "HTTP POST /api/orders",
    serviceName: "api-gateway",
    startTime: Date.now() - 500,
    duration: 890,
    status: "error",
    tags: { "http.method": "POST", "http.status_code": 500 }
  },
  {
    id: "span-5",
    traceId: "trace-002",
    operationName: "Process Payment",
    serviceName: "payment-service",
    startTime: Date.now() - 450,
    duration: 750,
    status: "error",
    tags: { "payment.gateway": "stripe", "error.type": "timeout" },
    parentId: "span-4"
  },
  {
    id: "span-6",
    traceId: "trace-003",
    operationName: "HTTP GET /api/products",
    serviceName: "api-gateway",
    startTime: Date.now() - 200,
    duration: 180,
    status: "ok",
    tags: { "http.method": "GET", "http.status_code": 200 }
  },
  {
    id: "span-7",
    traceId: "trace-003",
    operationName: "Elasticsearch Query",
    serviceName: "search-service",
    startTime: Date.now() - 150,
    duration: 95,
    status: "ok",
    tags: { "es.index": "products", "es.query.size": 20 },
    parentId: "span-6"
  }
]

export async function GET(request: Request) {
  const proxied = await proxyRequest(request, "/api/traces")
  if (proxied && proxied.status !== 404) return proxied

  // Standalone Fallback
  return NextResponse.json(mockTracesSpans)
}
