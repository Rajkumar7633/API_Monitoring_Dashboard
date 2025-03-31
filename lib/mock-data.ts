import type {
  ApiStats,
  ApiEndpoint,
  ApiLog,
  Alert,
  ResourceMetrics,
  DatabaseMetrics,
  ServiceHealth,
} from "@/types/api-types"

// Mock stats data
const stats: ApiStats = {
  totalRequests: 4800,
  requestsChange: 12.5,
  errorRate: 1.7,
  errorRateChange: -0.3,
  avgResponseTime: 145,
  responseTimeChange: 23,
  uptime: 99.98,
}

// Mock endpoints data
const endpoints: ApiEndpoint[] = [
  {
    name: "/api/users",
    requests: 1200,
    errors: 23,
    responseTime: Array(24)
      .fill(0)
      .map((_, i) => ({
        time: `${i.toString().padStart(2, "0")}:00`,
        value: 100 + Math.floor(Math.random() * 150),
      })),
  },
  {
    name: "/api/products",
    requests: 890,
    errors: 12,
    responseTime: Array(24)
      .fill(0)
      .map((_, i) => ({
        time: `${i.toString().padStart(2, "0")}:00`,
        value: 100 + Math.floor(Math.random() * 150),
      })),
  },
  {
    name: "/api/orders",
    requests: 760,
    errors: 8,
    responseTime: Array(24)
      .fill(0)
      .map((_, i) => ({
        time: `${i.toString().padStart(2, "0")}:00`,
        value: 100 + Math.floor(Math.random() * 150),
      })),
  },
  {
    name: "/api/auth",
    requests: 1500,
    errors: 35,
    responseTime: Array(24)
      .fill(0)
      .map((_, i) => ({
        time: `${i.toString().padStart(2, "0")}:00`,
        value: 100 + Math.floor(Math.random() * 150),
      })),
  },
  {
    name: "/api/payments",
    requests: 450,
    errors: 5,
    responseTime: Array(24)
      .fill(0)
      .map((_, i) => ({
        time: `${i.toString().padStart(2, "0")}:00`,
        value: 100 + Math.floor(Math.random() * 150),
      })),
  },
]

// Mock logs data
const logs: ApiLog[] = [
  {
    id: 1,
    endpoint: "/api/users",
    status: 500,
    message: "Internal Server Error",
    timestamp: "2023-06-15T14:32:21",
    duration: 230,
  },
  {
    id: 2,
    endpoint: "/api/auth",
    status: 401,
    message: "Unauthorized Access",
    timestamp: "2023-06-15T14:28:10",
    duration: 45,
  },
  {
    id: 3,
    endpoint: "/api/products",
    status: 404,
    message: "Resource Not Found",
    timestamp: "2023-06-15T14:15:45",
    duration: 30,
  },
  {
    id: 4,
    endpoint: "/api/auth",
    status: 429,
    message: "Too Many Requests",
    timestamp: "2023-06-15T14:10:33",
    duration: 25,
  },
  {
    id: 5,
    endpoint: "/api/orders",
    status: 503,
    message: "Service Unavailable",
    timestamp: "2023-06-15T13:58:22",
    duration: 180,
  },
]

// Mock alerts data
const alerts: Alert[] = [
  { id: 1, type: "error", message: "High error rate on /api/auth endpoint", time: "2 minutes ago" },
  { id: 2, type: "warning", message: "CPU usage above 80% threshold", time: "15 minutes ago" },
  { id: 3, type: "error", message: "Database connection failures detected", time: "32 minutes ago" },
  { id: 4, type: "warning", message: "Memory usage approaching limit", time: "1 hour ago" },
]

// Mock resource metrics data
const resourceMetrics: ResourceMetrics = {
  cpu: {
    current: 62,
    peak: 87,
    average: 45,
    cores: 8,
  },
  memory: {
    total: 16,
    used: 12.5,
    free: 3.5,
    usedPercentage: 78,
  },
}

// Mock database metrics data
const databaseMetrics: DatabaseMetrics = {
  queries: {
    total: 12500,
    slow: 23,
    average: 45.2,
  },
  connections: {
    active: 8,
    idle: 12,
    max: 20,
    usedPercentage: 40,
  },
  slowQueries: [
    { query: "SELECT * FROM users WHERE last_login > ?", duration: 250, timestamp: "2023-06-15T14:32:21" },
    { query: "UPDATE orders SET status = ? WHERE created_at < ?", duration: 320, timestamp: "2023-06-15T14:28:10" },
  ],
}

// Mock service health data
const serviceHealth: ServiceHealth[] = [
  {
    id: 1,
    name: "User Service",
    status: "Healthy",
    uptime: "99.9%",
    responseTime: 45,
    lastChecked: "2023-06-15T14:32:21",
  },
  {
    id: 2,
    name: "Authentication Service",
    status: "Healthy",
    uptime: "99.8%",
    responseTime: 65,
    lastChecked: "2023-06-15T14:32:21",
  },
  {
    id: 3,
    name: "Product Service",
    status: "Degraded",
    uptime: "98.5%",
    responseTime: 180,
    lastChecked: "2023-06-15T14:32:21",
  },
  {
    id: 4,
    name: "Order Service",
    status: "Healthy",
    uptime: "99.7%",
    responseTime: 55,
    lastChecked: "2023-06-15T14:32:21",
  },
  {
    id: 5,
    name: "Payment Service",
    status: "Healthy",
    uptime: "99.9%",
    responseTime: 70,
    lastChecked: "2023-06-15T14:32:21",
  },
  {
    id: 6,
    name: "Notification Service",
    status: "Unhealthy",
    uptime: "95.2%",
    responseTime: 250,
    lastChecked: "2023-06-15T14:32:21",
  },
]

// Export all mock data as a single object
export const mockData = {
  stats,
  endpoints,
  logs,
  alerts,
  resourceMetrics,
  databaseMetrics,
  serviceHealth,
}

