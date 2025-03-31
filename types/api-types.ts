export interface ApiStats {
  totalRequests: number
  requestsChange: number
  errorRate: number
  errorRateChange: number
  avgResponseTime: number
  responseTimeChange: number
  uptime: number
}

export interface TimePoint {
  time: string
  value: number
}

export interface ApiEndpoint {
  name: string
  requests: number
  errors: number
  responseTime: TimePoint[]
}

export interface ApiLog {
  id: number
  endpoint: string
  status: number
  message: string
  timestamp: string
  duration: number
  requestPayload?: string
  responsePayload?: string
  traceId?: string
}

export interface Alert {
  id: number
  type: "error" | "warning" | "info"
  message: string
  time: string
  service?: string
  details?: string
}

export interface ResourceMetrics {
  cpu: {
    current: number
    peak: number
    average: number
    cores: number
  }
  memory: {
    total: number
    used: number
    free: number
    usedPercentage: number
  }
}

export interface DatabaseMetrics {
  queries: {
    total: number
    slow: number
    average: number
  }
  connections: {
    active: number
    idle: number
    max: number
    usedPercentage: number
  }
  slowQueries: {
    query: string
    duration: number
    timestamp: string
  }[]
}

export interface ServiceHealth {
  id: number
  name: string
  status: "Healthy" | "Degraded" | "Unhealthy"
  uptime: string
  responseTime: number
  lastChecked: string
}

