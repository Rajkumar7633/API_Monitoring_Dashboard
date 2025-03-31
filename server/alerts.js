function setupAlertSystem(metricsCollector) {
  // Configure alert thresholds
  const thresholds = {
    errorRate: 5, // 5% error rate
    responseTime: 500, // 500ms
    cpuUsage: 80, // 80% CPU usage
    memoryUsage: 75, // 75% memory usage
    databaseQueryTime: 500, // 500ms for slow queries
  }

  // Set up periodic checks for threshold violations
  setInterval(() => {
    // Simulate random metrics
    const currentMetrics = {
      errorRate: Math.random() * 10,
      responseTime: 200 + Math.random() * 500,
      cpuUsage: 50 + Math.random() * 50,
      memoryUsage: 60 + Math.random() * 30,
    }

    // Check for threshold violations
    if (currentMetrics.errorRate > thresholds.errorRate) {
      metricsCollector.addAlert(
        "error",
        `High error rate detected: ${currentMetrics.errorRate.toFixed(1)}%`,
        "API Gateway",
        `Threshold: ${thresholds.errorRate}%`,
      )
    }

    if (currentMetrics.responseTime > thresholds.responseTime) {
      metricsCollector.addAlert(
        "warning",
        `Slow response time: ${currentMetrics.responseTime.toFixed(0)}ms`,
        "API Gateway",
        `Threshold: ${thresholds.responseTime}ms`,
      )
    }

    if (currentMetrics.cpuUsage > thresholds.cpuUsage) {
      metricsCollector.addAlert(
        "warning",
        `High CPU usage: ${currentMetrics.cpuUsage.toFixed(1)}%`,
        "System",
        `Threshold: ${thresholds.cpuUsage}%`,
      )
    }

    if (currentMetrics.memoryUsage > thresholds.memoryUsage) {
      metricsCollector.addAlert(
        "warning",
        `High memory usage: ${currentMetrics.memoryUsage.toFixed(1)}%`,
        "System",
        `Threshold: ${thresholds.memoryUsage}%`,
      )
    }
  }, 60000) // Check every minute
}

module.exports = { setupAlertSystem }

