// In-memory storage for metrics
const metrics = {
  stats: {
    totalRequests: 0,
    requestsChange: 0,
    errorRate: 0,
    errorRateChange: 0,
    avgResponseTime: 0,
    responseTimeChange: 0,
    uptime: 99.98,
  },
  endpoints: [],
  logs: [],
  alerts: [],
  resourceMetrics: {
    cpu: {
      current: 0,
      peak: 0,
      average: 0,
      cores: require("os").cpus().length,
    },
    memory: {
      total: Math.round(require("os").totalmem() / (1024 * 1024 * 1024)),
      used: 0,
      free: 0,
      usedPercentage: 0,
    },
  },
  databaseMetrics: {
    queries: {
      total: 0,
      slow: 0,
      average: 0,
    },
    connections: {
      active: 0,
      idle: 0,
      max: 20,
      usedPercentage: 0,
    },
    slowQueries: [],
  },
  serviceHealth: [],
}

// Initialize endpoints
const defaultEndpoints = ["/api/users", "/api/products", "/api/orders", "/api/auth", "/api/payments"]

defaultEndpoints.forEach((endpoint) => {
  metrics.endpoints.push({
    name: endpoint,
    requests: 0,
    errors: 0,
    responseTime: generateTimeSeriesData(24),
  })
})

// Initialize service health
const defaultServices = [
  { name: "User Service", status: "Healthy" },
  { name: "Authentication Service", status: "Healthy" },
  { name: "Product Service", status: "Degraded" },
  { name: "Order Service", status: "Healthy" },
  { name: "Payment Service", status: "Healthy" },
  { name: "Notification Service", status: "Unhealthy" },
]

defaultServices.forEach((service, index) => {
  metrics.serviceHealth.push({
    id: index + 1,
    name: service.name,
    status: service.status,
    uptime: service.status === "Healthy" ? "99.9%" : service.status === "Degraded" ? "98.5%" : "95.2%",
    responseTime: Math.floor(Math.random() * 200) + 50,
    lastChecked: new Date().toISOString(),
  })
})

function createMetricsCollector() {
  // Record API request
  const recordApiRequest = (endpoint, duration, status) => {
    // Update total requests
    metrics.stats.totalRequests++

    // Find or create endpoint
    let endpointData = metrics.endpoints.find((e) => e.name === endpoint)
    if (!endpointData) {
      endpointData = {
        name: endpoint,
        requests: 0,
        errors: 0,
        responseTime: generateTimeSeriesData(24),
      }
      metrics.endpoints.push(endpointData)
    }

    // Update endpoint metrics
    endpointData.requests++
    if (status >= 400) {
      endpointData.errors++
    }

    // Update response time
    const hour = new Date().getHours()
    const hourStr = hour.toString().padStart(2, "0") + ":00"
    const timePoint = endpointData.responseTime.find((t) => t.time === hourStr)
    if (timePoint) {
      // Weighted average to smooth out values
      timePoint.value = timePoint.value * 0.8 + duration * 0.2
    }

    // Update overall stats
    const totalErrors = metrics.endpoints.reduce((sum, e) => sum + e.errors, 0)
    const totalRequests = metrics.endpoints.reduce((sum, e) => sum + e.requests, 0)

    metrics.stats.errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

    // Calculate average response time
    let totalResponseTime = 0
    let responseTimePoints = 0

    metrics.endpoints.forEach((e) => {
      e.responseTime.forEach((t) => {
        totalResponseTime += t.value
        responseTimePoints++
      })
    })

    metrics.stats.avgResponseTime = responseTimePoints > 0 ? Math.round(totalResponseTime / responseTimePoints) : 0

    // Add log entry if error
    if (status >= 400) {
      addLog({
        endpoint,
        status,
        message: getErrorMessage(status),
        timestamp: new Date().toISOString(),
        duration,
      })
    }

    // Check for alerts
    if (status >= 500) {
      addAlert("error", `Server error on ${endpoint}`, "API Gateway", `Status code: ${status}`)
    } else if (status >= 400) {
      addAlert("warning", `Client error on ${endpoint}`, "API Gateway", `Status code: ${status}`)
    }

    if (duration > 500) {
      addAlert("warning", `Slow response on ${endpoint}`, "API Gateway", `Response time: ${duration}ms`)
    }
  }

  // Record database query
  const recordDatabaseQuery = (query, duration) => {
    metrics.databaseMetrics.queries.total++

    // Update average query time
    const currentTotal = metrics.databaseMetrics.queries.average * (metrics.databaseMetrics.queries.total - 1)
    metrics.databaseMetrics.queries.average = (currentTotal + duration) / metrics.databaseMetrics.queries.total

    // Check for slow queries (> 100ms)
    if (duration > 100) {
      metrics.databaseMetrics.queries.slow++

      // Add to slow queries list (keep last 10)
      metrics.databaseMetrics.slowQueries.unshift({
        query: query.substring(0, 100), // Truncate long queries
        duration,
        timestamp: new Date().toISOString(),
      })

      // Keep only the last 10 slow queries
      if (metrics.databaseMetrics.slowQueries.length > 10) {
        metrics.databaseMetrics.slowQueries.pop()
      }

      // Alert on very slow queries
      if (duration > 500) {
        addAlert("warning", "Slow database query detected", "Database", `Query took ${duration}ms`)
      }
    }

    // Update connection metrics (simulate)
    metrics.databaseMetrics.connections.active = Math.floor(Math.random() * 10) + 1
    metrics.databaseMetrics.connections.idle =
      metrics.databaseMetrics.connections.max - metrics.databaseMetrics.connections.active
    metrics.databaseMetrics.connections.usedPercentage =
      (metrics.databaseMetrics.connections.active / metrics.databaseMetrics.connections.max) * 100
  }

  // Record service health
  const recordServiceHealth = (service, status, responseTime) => {
    const serviceData = metrics.serviceHealth.find((s) => s.name === service)

    if (serviceData) {
      const previousStatus = serviceData.status
      serviceData.status = status
      serviceData.responseTime = responseTime
      serviceData.lastChecked = new Date().toISOString()

      // Alert on status change
      if (previousStatus !== serviceData.status) {
        if (serviceData.status === "Unhealthy") {
          addAlert("error", `${service} is now unhealthy`, service, `Response time: ${responseTime}ms`)
        } else if (serviceData.status === "Degraded") {
          addAlert("warning", `${service} is degraded`, service, `Response time: ${responseTime}ms`)
        } else if (previousStatus !== "Healthy") {
          addAlert("info", `${service} has recovered`, service, "Service is now healthy")
        }
      }
    }
  }

  // Add alert
  const addAlert = (type, message, service, details) => {
    const alert = {
      id: Date.now(),
      type,
      message,
      time: "just now",
      service,
      details,
    }

    metrics.alerts.unshift(alert)

    // Keep only the last 100 alerts
    if (metrics.alerts.length > 100) {
      metrics.alerts.pop()
    }
  }

  // Add log
  const addLog = (logData) => {
    const log = {
      id: Date.now(),
      ...logData,
    }

    metrics.logs.unshift(log)

    // Keep only the last 1000 logs
    if (metrics.logs.length > 1000) {
      metrics.logs.pop()
    }
  }

  // Update resource metrics
  const updateResourceMetrics = () => {
    const os = require("os")

    // CPU usage
    const cpuUsage = (os.loadavg()[0] / os.cpus().length) * 100
    metrics.resourceMetrics.cpu.current = Math.min(Math.round(cpuUsage), 100)
    metrics.resourceMetrics.cpu.peak = Math.max(metrics.resourceMetrics.cpu.peak, metrics.resourceMetrics.cpu.current)

    // Calculate rolling average
    metrics.resourceMetrics.cpu.average =
      metrics.resourceMetrics.cpu.average * 0.8 + metrics.resourceMetrics.cpu.current * 0.2

    // Memory usage
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    metrics.resourceMetrics.memory.total = Math.round(totalMem / (1024 * 1024 * 1024))
    metrics.resourceMetrics.memory.free = Math.round(freeMem / (1024 * 1024 * 1024))
    metrics.resourceMetrics.memory.used = Math.round(usedMem / (1024 * 1024 * 1024))
    metrics.resourceMetrics.memory.usedPercentage = Math.round((usedMem / totalMem) * 100)

    // Alert on high resource usage
    if (metrics.resourceMetrics.cpu.current > 80) {
      addAlert("warning", "High CPU usage detected", "System", `CPU usage: ${metrics.resourceMetrics.cpu.current}%`)
    }

    if (metrics.resourceMetrics.memory.usedPercentage > 80) {
      addAlert(
        "warning",
        "High memory usage detected",
        "System",
        `Memory usage: ${metrics.resourceMetrics.memory.usedPercentage}%`,
      )
    }
  }

  // Get all data
  const getAllData = () => {
    // Update resource metrics before returning
    updateResourceMetrics()

    return metrics
  }

  // Start periodic updates
  setInterval(updateResourceMetrics, 5000) // Update every 5 seconds

  return {
    recordApiRequest,
    recordDatabaseQuery,
    recordServiceHealth,
    addAlert,
    addLog,
    updateResourceMetrics,
    getAllData,
  }
}

// Helper functions
function generateTimeSeriesData(points) {
  const data = []
  const baseValue = 100 + Math.floor(Math.random() * 50)

  for (let i = 0; i < points; i++) {
    const hour = i.toString().padStart(2, "0") + ":00"
    const value = baseValue + Math.floor(Math.random() * 150 - 50)
    data.push({ time: hour, value: Math.max(20, value) })
  }

  return data
}

function getErrorMessage(status) {
  switch (status) {
    case 400:
      return "Bad Request"
    case 401:
      return "Unauthorized"
    case 403:
      return "Forbidden"
    case 404:
      return "Not Found"
    case 422:
      return "Unprocessable Entity"
    case 429:
      return "Too Many Requests"
    case 500:
      return "Internal Server Error"
    case 502:
      return "Bad Gateway"
    case 503:
      return "Service Unavailable"
    case 504:
      return "Gateway Timeout"
    default:
      return `Error ${status}`
  }
}

module.exports = { createMetricsCollector }

