// Vercel serverless function for real-time streaming
const { createMetricsCollector } = require('../server/metrics')
const { setupApiMonitoring } = require('../server/api-monitoring')
const { setupDatabaseMonitoring } = require('../server/db-monitoring')
const { setupAlertSystem } = require('../server/alerts')

// Initialize components
let metricsCollector, apiMonitor, dbMonitor, alertSystem

function initializeComponents() {
  if (!metricsCollector) {
    metricsCollector = createMetricsCollector()
    apiMonitor = setupApiMonitoring(metricsCollector)
    dbMonitor = setupDatabaseMonitoring(metricsCollector)
    alertSystem = setupAlertSystem(metricsCollector)
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    initializeComponents()
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })

    // Send initial data
    const initialData = {
      type: 'initial',
      data: {
        metrics: metricsCollector?.getMetrics() || {},
        alerts: alertSystem?.getActiveAlerts() || [],
        timestamp: new Date().toISOString()
      }
    }
    res.write(`data: ${JSON.stringify(initialData)}\n\n`)

    // Simulate real-time updates (in production, this would be event-driven)
    const interval = setInterval(() => {
      try {
        const updateData = {
          type: 'update',
          data: {
            metrics: metricsCollector?.getMetrics() || {},
            alerts: alertSystem?.getActiveAlerts() || [],
            timestamp: new Date().toISOString()
          }
        }
        res.write(`data: ${JSON.stringify(updateData)}\n\n`)
      } catch (error) {
        console.error('Stream error:', error)
        clearInterval(interval)
      }
    }, 5000) // Update every 5 seconds

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval)
    })

    req.on('aborted', () => {
      clearInterval(interval)
    })

  } catch (error) {
    console.error('Stream error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
