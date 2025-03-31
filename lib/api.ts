import type { Alert, ApiEndpoint, ApiLog, ApiStats, ResourceMetrics } from "@/types/api-types"

// Simulated API client for fetching dashboard data
// In a real application, this would make actual API calls to your backend

export async function fetchStats(timeRange: string): Promise<ApiStats> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Mock data based on time range
  return {
    totalRequests: 4800 + Math.floor(Math.random() * 200),
    requestsChange: 12.5 + (Math.random() * 5 - 2.5),
    errorRate: 1.7 + (Math.random() * 0.6 - 0.3),
    errorRateChange: -0.3 + (Math.random() * 0.6 - 0.3),
    avgResponseTime: 145 + Math.floor(Math.random() * 30 - 15),
    responseTimeChange: 23 + Math.floor(Math.random() * 10 - 5),
    uptime: 99.98 + (Math.random() * 0.04 - 0.02),
  }
}

export async function fetchEndpoints(timeRange: string): Promise<ApiEndpoint[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 700))

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
  return endpoints.map((endpoint) => ({
    ...endpoint,
    responseTime: generateTimeSeriesData(24),
  }))
}

export async function fetchLogs(endpoint: string, timeRange: string): Promise<ApiLog[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 600))

  const allLogs = [
    { id: 1, endpoint: "/api/users", status: 500, message: "Internal Server Error", timestamp: "2023-06-15T14:32:21" },
    { id: 2, endpoint: "/api/auth", status: 401, message: "Unauthorized Access", timestamp: "2023-06-15T14:28:10" },
    { id: 3, endpoint: "/api/products", status: 404, message: "Resource Not Found", timestamp: "2023-06-15T14:15:45" },
    { id: 4, endpoint: "/api/auth", status: 429, message: "Too Many Requests", timestamp: "2023-06-15T14:10:33" },
    { id: 5, endpoint: "/api/orders", status: 503, message: "Service Unavailable", timestamp: "2023-06-15T13:58:22" },
    { id: 6, endpoint: "/api/payments", status: 400, message: "Bad Request", timestamp: "2023-06-15T13:45:11" },
    { id: 7, endpoint: "/api/users", status: 422, message: "Unprocessable Entity", timestamp: "2023-06-15T13:30:05" },
  ]

  // Filter logs by endpoint if specified
  return endpoint === "all" ? allLogs : allLogs.filter((log) => log.endpoint === endpoint)
}

export async function fetchAlerts(): Promise<Alert[]> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 400))

  return [
    { id: 1, type: "error", message: "High error rate on /api/auth endpoint", time: "2 minutes ago" },
    { id: 2, type: "warning", message: "CPU usage above 80% threshold", time: "15 minutes ago" },
    { id: 3, type: "error", message: "Database connection failures detected", time: "32 minutes ago" },
    { id: 4, type: "warning", message: "Memory usage approaching limit", time: "1 hour ago" },
  ]
}

export async function fetchMetrics(): Promise<ResourceMetrics> {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 550))

  const cpuCurrent = 60 + Math.floor(Math.random() * 20)
  const memoryUsed = 12 + (Math.random() * 1.5 - 0.75)

  return {
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

