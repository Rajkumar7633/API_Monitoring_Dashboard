function setupAlertSystem(metricsCollector) {
  // Configure alert thresholds
  const thresholds = {
    errorRate: Number(process.env.THRESHOLD_ERROR_RATE || 5), // %
    responseTime: Number(process.env.THRESHOLD_RESPONSE_TIME || 500), // ms
    cpuUsage: Number(process.env.THRESHOLD_CPU || 80), // %
    memoryUsage: Number(process.env.THRESHOLD_MEMORY || 75), // %
    databaseQueryTime: Number(process.env.THRESHOLD_DB_QUERY || 500), // ms
  }

  const useRandom = process.env.ENABLE_RANDOM_ALERTS === 'true'

 
  metricsCollector.getAlertThresholds = () => ({ ...thresholds })
  metricsCollector.setAlertThresholds = (updates = {}) => {
    const allowed = [
      'errorRate',
      'responseTime',
      'cpuUsage',
      'memoryUsage',
      'databaseQueryTime',
    ]
    for (const k of Object.keys(updates || {})) {
      if (allowed.includes(k)) {
        const num = Number(updates[k])
        if (!Number.isNaN(num)) thresholds[k] = num
      }
    }
    return { ...thresholds }
  }

  // Set up periodic checks for threshold violations
  setInterval(() => {
    let snapshot
    if (useRandom) {
      snapshot = {
        stats: { errorRate: Math.random() * 10, avgResponseTime: 200 + Math.random() * 500 },
        resourceMetrics: {
          cpu: { current: 50 + Math.random() * 50 },
          memory: { usedPercentage: 60 + Math.random() * 30 },
        },
      }
    } else {
      snapshot = metricsCollector.getAllData()
    }

    const currentErrorRate = snapshot.stats?.errorRate || 0
    const currentAvgResp = snapshot.stats?.avgResponseTime || 0
    const currentCpu = snapshot.resourceMetrics?.cpu?.current || 0
    const currentMem = snapshot.resourceMetrics?.memory?.usedPercentage || 0

    if (currentErrorRate > thresholds.errorRate) {
      metricsCollector.addAlert(
        'error',
        'High error rate detected',
        'API Gateway',
        `Current: ${currentErrorRate.toFixed(1)}% | Threshold: ${thresholds.errorRate}%`,
      )
    }

    if (currentAvgResp > thresholds.responseTime) {
      metricsCollector.addAlert(
        'warning',
        'Slow average response time',
        'API Gateway',
        `Current: ${currentAvgResp.toFixed(0)}ms | Threshold: ${thresholds.responseTime}ms`,
      )
    }

    if (currentCpu > thresholds.cpuUsage) {
      metricsCollector.addAlert(
        'warning',
        'High CPU usage detected',
        'System',
        `Current: ${currentCpu.toFixed(1)}% | Threshold: ${thresholds.cpuUsage}%`,
      )
    }

    if (currentMem > thresholds.memoryUsage) {
      metricsCollector.addAlert(
        'warning',
        'High memory usage detected',
        'System',
        `Current: ${currentMem.toFixed(1)}% | Threshold: ${thresholds.memoryUsage}%`,
      )
    }
  }, Number(process.env.ALERT_CHECK_INTERVAL_MS || 60000)) // Check every minute by default
}

module.exports = { setupAlertSystem }

