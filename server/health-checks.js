function setupHealthChecks(app, metricsCollector) {
  // Define services to check (can be overridden via env SERVICES_JSON)
  const defaultServices = [
    { name: "User Service", url: "http://localhost:3002/health" },
    { name: "Authentication Service", url: "http://localhost:3003/health" },
    { name: "Product Service", url: "http://localhost:3004/health" },
    { name: "Order Service", url: "http://localhost:3005/health" },
    { name: "Payment Service", url: "http://localhost:3006/health" },
    { name: "Notification Service", url: "http://localhost:3007/health" },
  ]

  let services = defaultServices
  try {
    if (process.env.SERVICES_JSON) {
      const parsed = JSON.parse(process.env.SERVICES_JSON)
      if (Array.isArray(parsed)) services = parsed
    }
  } catch (_) {
    // Ignore parse errors and keep defaults
  }

  const intervalMs = Number(process.env.HEALTHCHECK_INTERVAL_MS || 30000)
  const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 3000)
  const retries = Math.max(0, Number(process.env.HEALTHCHECK_RETRIES || 1))
  const slowMs = Number(process.env.HEALTHCHECK_SLOW_MS || 800)
  const simulate = process.env.ENABLE_SIMULATION === 'true'

  // Track simple uptime stats per service
  const serviceStats = new Map() // name -> { total: number, up: number }

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    })
  })

  // Detailed health status endpoint uses collected metrics
  app.get("/health/details", (req, res) => {
    const snapshot = metricsCollector.getAllData()
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: snapshot.serviceHealth || [],
      database: snapshot.databaseMetrics || {},
      resources: snapshot.resourceMetrics || {},
    })
  })

  // Single run function
  const runOnce = async () => {
    for (const svc of services) {
      if (simulate) {
        const rnd = Math.random()
        const status = rnd < 0.8 ? 'Healthy' : rnd < 0.95 ? 'Degraded' : 'Unhealthy'
        const responseTime = Math.floor(Math.random() * 200) + 50
        // update uptime
        const st = serviceStats.get(svc.name) || { total: 0, up: 0 }
        st.total += 1
        if (status !== 'Unhealthy') st.up += 1
        serviceStats.set(svc.name, st)
        const uptimeStr = `${((st.up / st.total) * 100).toFixed(1)}%`
        metricsCollector.recordServiceHealth(svc.name, status, responseTime, uptimeStr)
        continue
      }

      // Real check with retry & timeout
      let attempt = 0
      let lastRt = 0
      let classified = 'Unhealthy'
      while (attempt <= retries) {
        const start = Date.now()
        try {
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), timeoutMs)
          const resp = await fetch(svc.url, { method: 'GET', signal: controller.signal })
          clearTimeout(t)
          lastRt = Date.now() - start
          if (resp.ok) {
            classified = lastRt > slowMs ? 'Degraded' : 'Healthy'
            break
          }
          // Non-OK: classify 5xx as Unhealthy, others Degraded
          classified = resp.status >= 500 ? 'Unhealthy' : 'Degraded'
          break
        } catch (e) {
          lastRt = Date.now() - start
          // timeout/connection error -> try again unless out of retries
          classified = 'Unhealthy'
          attempt += 1
          if (attempt > retries) break
          continue
        }
      }

      // update uptime stats
      const st = serviceStats.get(svc.name) || { total: 0, up: 0 }
      st.total += 1
      if (classified !== 'Unhealthy') st.up += 1
      serviceStats.set(svc.name, st)
      const uptimeStr = `${((st.up / st.total) * 100).toFixed(1)}%`
      metricsCollector.recordServiceHealth(svc.name, classified, lastRt || timeoutMs, uptimeStr)
    }
  }

  // Background loop to check services and record into metrics
  setInterval(runOnce, intervalMs)

  // Expose runner for API
  app.locals.runHealthCheck = runOnce
}

module.exports = { setupHealthChecks }

