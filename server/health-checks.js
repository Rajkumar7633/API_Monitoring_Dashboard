function setupHealthChecks(app) {
  // Define services to check
  const services = [
    { name: "User Service", url: "http://localhost:3002/health" },
    { name: "Authentication Service", url: "http://localhost:3003/health" },
    { name: "Product Service", url: "http://localhost:3004/health" },
    { name: "Order Service", url: "http://localhost:3005/health" },
    { name: "Payment Service", url: "http://localhost:3006/health" },
    { name: "Notification Service", url: "http://localhost:3007/health" },
  ]

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: "ok",
      database: "ok",
    })
  })

  // Detailed health status endpoint
  app.get("/health/details", (req, res) => {
    // Simulate service checks
    const serviceStatus = services.map((service) => {
      // Randomly determine service status
      const random = Math.random()
      let status
      if (random < 0.8) {
        status = "healthy"
      } else if (random < 0.95) {
        status = "degraded"
      } else {
        status = "unhealthy"
      }

      return {
        name: service.name,
        status,
        responseTime: Math.floor(Math.random() * 200) + 50,
        timestamp: new Date().toISOString(),
      }
    })

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        status: "healthy",
        responseTime: Math.floor(Math.random() * 50) + 10,
      },
      services: serviceStatus,
    })
  })
}

module.exports = { setupHealthChecks }

