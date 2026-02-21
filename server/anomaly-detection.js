// AI-Powered Anomaly Detection Module
// Uses statistical methods and machine learning for intelligent alerting

class AnomalyDetector {
  constructor() {
    this.metricsHistory = new Map() // Store historical metrics
    this.baselineData = new Map() // Store baseline statistics
    this.anomalyThresholds = {
      sensitivity: 2.5, // Standard deviations from mean
      minDataPoints: 10, // Minimum data points for baseline
      windowSize: 100, // Rolling window size
      seasonalityPeriod: 24 // Hours for daily patterns
    }
    this.models = new Map() // Store trained models per metric
  }

  // Add new metric data point
  addMetricData(endpoint, metric, value, timestamp = Date.now()) {
    const key = `${endpoint}:${metric}`
    
    if (!this.metricsHistory.has(key)) {
      this.metricsHistory.set(key, [])
    }
    
    const history = this.metricsHistory.get(key)
    history.push({ value, timestamp })
    
    // Keep only recent data points
    if (history.length > this.anomalyThresholds.windowSize) {
      history.shift()
    }
    
    // Update baseline if we have enough data
    if (history.length >= this.anomalyThresholds.minDataPoints) {
      this.updateBaseline(key)
    }
  }

  // Calculate baseline statistics
  updateBaseline(key) {
    const history = this.metricsHistory.get(key)
    if (!history || history.length < this.anomalyThresholds.minDataPoints) return

    const values = history.map(h => h.value)
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    // Detect seasonality (simplified approach)
    const seasonalPattern = this.detectSeasonality(history)
    
    this.baselineData.set(key, {
      mean,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      median: this.calculateMedian(values),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99),
      seasonalPattern,
      lastUpdated: Date.now()
    })
  }

  // Simple seasonality detection
  detectSeasonality(history) {
    if (history.length < 24) return null // Need at least 24 hours of data
    
    const hourlyPatterns = new Array(24).fill(0)
    const hourlyCounts = new Array(24).fill(0)
    
    history.forEach(point => {
      const hour = new Date(point.timestamp).getHours()
      hourlyPatterns[hour] += point.value
      hourlyCounts[hour]++
    })
    
    // Normalize hourly patterns
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyPatterns[i] /= hourlyCounts[i]
      }
    }
    
    return hourlyPatterns
  }

  // Check if current value is anomalous
  detectAnomaly(endpoint, metric, value, timestamp = Date.now()) {
    const key = `${endpoint}:${metric}`
    const baseline = this.baselineData.get(key)
    
    if (!baseline) {
      return { isAnomalous: false, confidence: 0, reason: 'Insufficient baseline data' }
    }

    // Z-score based detection
    const zScore = Math.abs((value - baseline.mean) / baseline.stdDev)
    let isAnomalous = zScore > this.anomalyThresholds.sensitivity
    let confidence = Math.min(zScore / this.anomalyThresholds.sensitivity, 1)
    let reason = `Z-score: ${zScore.toFixed(2)} (threshold: ${this.anomalyThresholds.sensitivity})`

    // Seasonal adjustment
    if (baseline.seasonalPattern) {
      const hour = new Date(timestamp).getHours()
      const seasonalExpected = baseline.seasonalPattern[hour]
      const seasonalDeviation = Math.abs((value - seasonalExpected) / baseline.stdDev)
      
      if (seasonalDeviation > this.anomalyThresholds.sensitivity * 1.5) {
        isAnomalous = true
        confidence = Math.max(confidence, seasonalDeviation / (this.anomalyThresholds.sensitivity * 1.5))
        reason += ` | Seasonal deviation: ${seasonalDeviation.toFixed(2)}`
      }
    }

    // Percentile-based detection for extreme values
    if (value > baseline.p99 || value < baseline.min) {
      isAnomalous = true
      confidence = Math.max(confidence, 0.9)
      reason += ` | Beyond 99th percentile`
    }

    // Trend detection
    const trendAnomaly = this.detectTrendAnomaly(key, value, timestamp)
    if (trendAnomaly.isAnomalous) {
      isAnomalous = true
      confidence = Math.max(confidence, trendAnomaly.confidence)
      reason += ` | Trend: ${trendAnomaly.reason}`
    }

    return {
      isAnomalous,
      confidence: Math.round(confidence * 100),
      reason,
      baseline: {
        mean: baseline.mean,
        stdDev: baseline.stdDev,
        median: baseline.median
      }
    }
  }

  // Detect sudden trend changes
  detectTrendAnomaly(key, currentValue, timestamp) {
    const history = this.metricsHistory.get(key)
    if (!history || history.length < 5) {
      return { isAnomalous: false, confidence: 0, reason: 'Insufficient data for trend analysis' }
    }

    const recentValues = history.slice(-5).map(h => h.value)
    const olderValues = history.slice(-10, -5).map(h => h.value)
    
    if (olderValues.length < 3) {
      return { isAnomalous: false, confidence: 0, reason: 'Insufficient historical data' }
    }

    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length
    const olderAvg = olderValues.reduce((a, b) => a + b, 0) / olderValues.length
    
    const percentChange = Math.abs((recentAvg - olderAvg) / olderAvg) * 100
    
    if (percentChange > 50) { // More than 50% change
      return {
        isAnomalous: true,
        confidence: Math.min(percentChange / 100, 1),
        reason: `${percentChange.toFixed(1)}% sudden change detected`
      }
    }

    return { isAnomalous: false, confidence: 0, reason: 'No significant trend change' }
  }

  // Predict next values using simple linear regression
  predictNext(endpoint, metric, steps = 1) {
    const key = `${endpoint}:${metric}`
    const history = this.metricsHistory.get(key)
    
    if (!history || history.length < 5) {
      return { prediction: null, confidence: 0, error: 'Insufficient data for prediction' }
    }

    const values = history.slice(-10).map(h => h.value)
    const n = values.length
    
    // Simple linear regression
    const xMean = (n - 1) / 2
    const yMean = values.reduce((a, b) => a + b, 0) / n
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean)
      denominator += Math.pow(i - xMean, 2)
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0
    const intercept = yMean - slope * xMean
    
    const nextValue = intercept + slope * (n + steps - 1)
    
    // Calculate confidence based on historical variance
    const baseline = this.baselineData.get(key)
    const confidence = baseline ? Math.max(0, 1 - (baseline.stdDev / Math.abs(baseline.mean))) : 0.5
    
    return {
      prediction: Math.round(nextValue * 100) / 100,
      confidence: Math.round(confidence * 100),
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      slope: Math.round(slope * 100) / 100
    }
  }

  // Get health score for endpoint
  getHealthScore(endpoint) {
    const metrics = ['responseTime', 'errorRate', 'throughput']
    let totalScore = 0
    let metricCount = 0
    
    metrics.forEach(metric => {
      const key = `${endpoint}:${metric}`
      const baseline = this.baselineData.get(key)
      
      if (baseline) {
        // Simple health scoring based on deviation from baseline
        const currentData = this.metricsHistory.get(key)
        if (currentData && currentData.length > 0) {
          const current = currentData[currentData.length - 1].value
          const deviation = Math.abs((current - baseline.mean) / baseline.stdDev)
          const score = Math.max(0, 100 - (deviation * 20)) // Convert to 0-100 scale
          totalScore += score
          metricCount++
        }
      }
    })
    
    return metricCount > 0 ? Math.round(totalScore / metricCount) : 50 // Default to 50 if no data
  }

  // Utility functions
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }

  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  // Get anomaly statistics
  getAnomalyStats() {
    const stats = {
      totalMetrics: this.metricsHistory.size,
      metricsWithBaseline: this.baselineData.size,
      recentAnomalies: [],
      healthScores: new Map()
    }

    // Check for recent anomalies in all metrics
    this.metricsHistory.forEach((history, key) => {
      if (history.length > 0) {
        const latest = history[history.length - 1]
        const [endpoint, metric] = key.split(':')
        const anomaly = this.detectAnomaly(endpoint, metric, latest.value, latest.timestamp)
        
        if (anomaly.isAnomalous) {
          stats.recentAnomalies.push({
            endpoint,
            metric,
            value: latest.value,
            confidence: anomaly.confidence,
            reason: anomaly.reason,
            timestamp: latest.timestamp
          })
        }

        // Update health score
        if (!stats.healthScores.has(endpoint)) {
          stats.healthScores.set(endpoint, this.getHealthScore(endpoint))
        }
      }
    })

    return stats
  }

  // Configure anomaly detection parameters
  configure(config) {
    this.anomalyThresholds = { ...this.anomalyThresholds, ...config }
  }
}

module.exports = { AnomalyDetector }
