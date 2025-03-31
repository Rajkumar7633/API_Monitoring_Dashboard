const express = require("express")
const http = require("http")
const cors = require("cors")
const { createMetricsCollector } = require("./metrics")
const { setupApiMonitoring } = require("./api-monitoring")
const { setupDatabaseMonitoring } = require("./db-monitoring")
const { setupAlertSystem } = require("./alerts")
const { setupLogging } = require("./logging")
const { setupHealthChecks } = require("./health-checks")

// Create Express app
const app = express()
const server = http.createServer(app)

// Configure CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
)

app.use(express.json())

// Initialize metrics collector
const metricsCollector = createMetricsCollector()

// Set up API monitoring
setupApiMonitoring(app, metricsCollector)

// Set up database monitoring
setupDatabaseMonitoring(metricsCollector)

// Set up alert system
setupAlertSystem(metricsCollector)

// Set up logging
setupLogging(app)

// Set up health checks
setupHealthChecks(app)

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

// Dashboard data endpoint - returns all data in a single request
app.get("/api/dashboard-data", (req, res) => {
  res.json(metricsCollector.getAllData())
})

// Start the server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = { app, server }

