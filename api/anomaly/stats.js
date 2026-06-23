// Vercel serverless function for anomaly detection stats
const { createMetricsCollector } = require('../../server/metrics')
const { IndianFeatures } = require('../../server/indian-features')

let metricsCollector, indianFeatures

function initializeComponents() {
  if (!metricsCollector) {
    metricsCollector = createMetricsCollector()
    indianFeatures = new IndianFeatures()
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
    
    const metrics = metricsCollector?.getMetrics() || {}
    
    // Calculate anomaly stats
    const anomalyStats = {
      totalEndpoints: Object.keys(metrics.endpoints || {}).length,
      anomalousEndpoints: 0,
      avgResponseTime: 0,
      errorRate: 0,
      healthScore: 85,
      lastAnalysis: new Date().toISOString(),
      predictions: []
    }

    // Simple anomaly detection logic
    if (metrics.endpoints) {
      let totalResponseTime = 0
      let totalRequests = 0
      let totalErrors = 0
      
      Object.values(metrics.endpoints).forEach(endpoint => {
        if (endpoint.avgResponseTime > 1000) {
          anomalyStats.anomalousEndpoints++
        }
        totalResponseTime += endpoint.avgResponseTime || 0
        totalRequests += endpoint.requestCount || 0
        totalErrors += endpoint.errorCount || 0
      })
      
      anomalyStats.avgResponseTime = totalResponseTime / Object.keys(metrics.endpoints).length || 0
      anomalyStats.errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
      anomalyStats.healthScore = Math.max(0, 100 - (anomalyStats.errorRate * 10) - (anomalyStats.avgResponseTime / 50))
    }

    res.status(200).json({
      success: true,
      data: anomalyStats,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Anomaly stats error:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
}
