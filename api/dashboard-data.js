// Vercel serverless function for dashboard data
const { createMetricsCollector } = require('../server/metrics')
const { setupApiMonitoring } = require('../server/api-monitoring')
const { setupDatabaseMonitoring } = require('../server/db-monitoring')
const { setupAlertSystem } = require('../server/alerts')
const { setupHealthChecks } = require('../server/health-checks')
const { initPersistenceApi } = require('../server/persistence/sqlite')

// Initialize components
let metricsCollector, apiMonitor, dbMonitor, alertSystem, healthChecks, persistenceApi

function initializeComponents() {
  if (!metricsCollector) {
    metricsCollector = createMetricsCollector()
    apiMonitor = setupApiMonitoring(metricsCollector)
    dbMonitor = setupDatabaseMonitoring(metricsCollector)
    alertSystem = setupAlertSystem(metricsCollector)
    healthChecks = setupHealthChecks(metricsCollector)
    
    try {
      persistenceApi = initPersistenceApi()
    } catch (error) {
      console.warn('SQLite persistence not available, using in-memory fallback')
    }
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    initializeComponents()
    
    // Get dashboard data
    const metrics = metricsCollector?.getMetrics() || {}
    const alerts = alertSystem?.getActiveAlerts() || []
    const health = healthChecks?.getHealthStatus() || {}
    const apiStats = apiMonitor?.getStats() || {}
    const dbStats = dbMonitor?.getStats() || {}

    const dashboardData = {
      timestamp: new Date().toISOString(),
      metrics,
      alerts,
      health,
      apiStats,
      dbStats,
      uptime: process.uptime(),
      version: '2.0.0'
    }

    res.status(200).json(dashboardData)
  } catch (error) {
    console.error('Dashboard data error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
