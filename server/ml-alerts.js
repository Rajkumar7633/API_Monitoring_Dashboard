// ML-based Advanced Alerting with Dynamic Threshold Optimization
class MLAlertOptimizer {
  constructor() {
    this.thresholdHistory = new Map() // endpoint -> threshold history
    this.performanceHistory = new Map() // endpoint -> performance metrics
    this.models = new Map() // endpoint -> trained model
    this.seasonalPatterns = new Map() // endpoint -> seasonal data
    this.alertHistory = [] // Recent alerts for analysis
    
    this.config = {
      learningWindow: 168, // hours (1 week)
      minDataPoints: 50,
      thresholdSensitivity: 0.95, // confidence level
      adaptationRate: 0.1, // how quickly thresholds adapt
      seasonalityDetection: true,
      anomalyThreshold: 2.5 // standard deviations
    }
  }

  // Add performance data point
  addPerformanceData(endpoint, metric, value, timestamp = Date.now()) {
    const key = `${endpoint}:${metric}`
    
    if (!this.performanceHistory.has(key)) {
      this.performanceHistory.set(key, [])
    }
    
    const history = this.performanceHistory.get(key)
    history.push({ value, timestamp })
    
    // Keep only recent data within learning window
    const cutoff = timestamp - (this.config.learningWindow * 60 * 60 * 1000)
    while (history.length > 0 && history[0].timestamp < cutoff) {
      history.shift()
    }
    
    // Update model if we have enough data
    if (history.length >= this.config.minDataPoints) {
      this.updateModel(key, history)
    }
  }

  // Update ML model for threshold optimization
  updateModel(key, history) {
    const values = history.map(h => h.value)
    
    // Calculate statistical measures
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)
    
    // Detect seasonality
    const seasonality = this.detectSeasonality(history)
    
    // Calculate dynamic thresholds using ML approach
    const thresholds = this.calculateDynamicThresholds(values, mean, stdDev, seasonality)
    
    // Store model
    this.models.set(key, {
      mean,
      stdDev,
      thresholds,
      seasonality,
      lastUpdated: Date.now(),
      dataPoints: history.length,
      accuracy: this.calculateModelAccuracy(key, history, thresholds)
    })
  }

  // Detect seasonal patterns
  detectSeasonality(history) {
    if (history.length < 24) return null
    
    // Group by hour of day
    const hourlyPatterns = new Array(24).fill(0).map(() => ({ values: [], count: 0 }))
    
    history.forEach(point => {
      const hour = new Date(point.timestamp).getHours()
      hourlyPatterns[hour].values.push(point.value)
      hourlyPatterns[hour].count++
    })
    
    // Calculate hourly averages
    const hourlyAverages = hourlyPatterns.map(pattern => {
      if (pattern.count === 0) return 0
      return pattern.values.reduce((a, b) => a + b, 0) / pattern.count
    })
    
    // Detect if there's significant hourly variation
    const overallMean = hourlyAverages.reduce((a, b) => a + b, 0) / 24
    const variance = hourlyAverages.reduce((a, b) => a + Math.pow(b - overallMean, 2), 0) / 24
    
    // If variance is significant, return seasonal pattern
    if (variance > overallMean * 0.1) {
      return {
        type: 'hourly',
        pattern: hourlyAverages,
        strength: variance / overallMean
      }
    }
    
    return null
  }

  // Calculate dynamic thresholds using ML techniques
  calculateDynamicThresholds(values, mean, stdDev, seasonality) {
    // Base thresholds using statistical methods
    const baseThresholds = {
      warning: mean + (1.5 * stdDev),
      critical: mean + (2.5 * stdDev),
      info: mean - (1.5 * stdDev)
    }
    
    // Adjust for seasonality
    if (seasonality && seasonality.type === 'hourly') {
      const currentHour = new Date().getHours()
      const seasonalFactor = seasonality.pattern[currentHour] / mean
      
      // Adjust thresholds based on seasonal patterns
      Object.keys(baseThresholds).forEach(level => {
        baseThresholds[level] *= seasonalFactor
      })
    }
    
    // Apply ML-based optimization
    const optimizedThresholds = this.optimizeThresholdsWithML(values, baseThresholds)
    
    return {
      ...baseThresholds,
      ...optimizedThresholds,
      methodology: 'ml-optimized',
      confidence: this.calculateThresholdConfidence(values, optimizedThresholds)
    }
  }

  // Optimize thresholds using machine learning
  optimizeThresholdsWithML(values, baseThresholds) {
    // Use percentile-based approach combined with statistical thresholds
    const sortedValues = [...values].sort((a, b) => a - b)
    
    const percentiles = {
      p90: this.calculatePercentile(sortedValues, 90),
      p95: this.calculatePercentile(sortedValues, 95),
      p99: this.calculatePercentile(sortedValues, 99)
    }
    
    // Combine statistical and percentile approaches
    const optimized = {}
    
    // Warning threshold: 90th percentile or statistical warning, whichever is higher
    optimized.warning = Math.max(baseThresholds.warning, percentiles.p90)
    
    // Critical threshold: 99th percentile or statistical critical, whichever is higher
    optimized.critical = Math.max(baseThresholds.critical, percentiles.p99)
    
    // Info threshold: 10th percentile or statistical info, whichever is lower
    const p10 = this.calculatePercentile(sortedValues, 10)
    optimized.info = Math.min(baseThresholds.info, p10)
    
    return optimized
  }

  // Calculate percentile
  calculatePercentile(sortedValues, percentile) {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, index)]
  }

  // Calculate threshold confidence
  calculateThresholdConfidence(values, thresholds) {
    // Calculate how well thresholds would have performed historically
    let truePositives = 0
    let falsePositives = 0
    let totalAnomalies = 0
    
    // Simple anomaly detection for validation
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const stdDev = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length)
    
    values.forEach(value => {
      const isAnomaly = Math.abs(value - mean) > (2 * stdDev)
      if (isAnomaly) totalAnomalies++
      
      const wouldAlert = value > thresholds.warning || value < thresholds.info
      if (isAnomaly && wouldAlert) truePositives++
      if (!isAnomaly && wouldAlert) falsePositives++
    })
    
    const precision = totalAnomalies > 0 ? truePositives / (truePositives + falsePositives) : 0
    const recall = totalAnomalies > 0 ? truePositives / totalAnomalies : 0
    
    return {
      precision: Math.round(precision * 100),
      recall: Math.round(recall * 100),
      f1Score: precision + recall > 0 ? Math.round((2 * precision * recall / (precision + recall)) * 100) : 0
    }
  }

  // Calculate model accuracy
  calculateModelAccuracy(key, history, thresholds) {
    // Backtest the model against historical data
    let correct = 0
    let total = 0
    
    history.forEach(point => {
      // Simple backtesting logic
      const predicted = this.predictAlert(key, point.value, thresholds)
      const actual = this.wasActuallyAlert(point.timestamp, key)
      
      if (predicted === actual) correct++
      total++
    })
    
    return total > 0 ? correct / total : 0
  }

  // Predict if current value should trigger alert
  predictAlert(endpoint, metric, value) {
    const key = `${endpoint}:${metric}`
    const model = this.models.get(key)
    
    if (!model) {
      return null // No model available
    }
    
    const thresholds = model.thresholds
    
    if (value > thresholds.critical) return { level: 'critical', confidence: 0.95 }
    if (value > thresholds.warning) return { level: 'warning', confidence: 0.85 }
    if (value < thresholds.info) return { level: 'info', confidence: 0.75 }
    
    return { level: 'normal', confidence: 0.9 }
  }

  // Check if there was actually an alert at given time
  wasActuallyAlert(timestamp, key) {
    // Simplified - in real implementation, check alert history
    return false
  }

  // Get optimized thresholds for endpoint
  getOptimizedThresholds(endpoint, metric) {
    const key = `${endpoint}:${metric}`
    const model = this.models.get(key)
    
    if (!model) {
      return null
    }
    
    return {
      endpoint,
      metric,
      thresholds: model.thresholds,
      modelAccuracy: Math.round(model.accuracy * 100),
      dataPoints: model.dataPoints,
      lastUpdated: model.lastUpdated,
      seasonalAdjustment: !!model.seasonality,
      recommendations: this.generateRecommendations(model)
    }
  }

  // Generate recommendations based on model
  generateRecommendations(model) {
    const recommendations = []
    
    if (model.accuracy < 0.8) {
      recommendations.push('Consider increasing data collection period for better accuracy')
    }
    
    if (model.seasonality && model.seasonality.strength > 0.3) {
      recommendations.push('Strong seasonal patterns detected - consider time-based alerting')
    }
    
    if (model.stdDev / model.mean > 0.5) {
      recommendations.push('High volatility detected - consider wider threshold ranges')
    }
    
    const thresholdRange = model.thresholds.critical - model.thresholds.warning
    if (thresholdRange < model.mean * 0.1) {
      recommendations.push('Threshold range too narrow - may cause alert fatigue')
    }
    
    return recommendations
  }

  // Get ML insights
  getMLInsights() {
    const insights = {
      totalModels: this.models.size,
      averageAccuracy: 0,
      seasonalEndpoints: 0,
      highVolatilityEndpoints: 0,
      recommendations: []
    }
    
    let totalAccuracy = 0
    let modelCount = 0
    
    this.models.forEach(model => {
      totalAccuracy += model.accuracy
      modelCount++
      
      if (model.seasonality) insights.seasonalEndpoints++
      if (model.stdDev / model.mean > 0.5) insights.highVolatilityEndpoints++
    })
    
    insights.averageAccuracy = modelCount > 0 ? Math.round((totalAccuracy / modelCount) * 100) : 0
    
    // Global recommendations
    if (insights.averageAccuracy < 80) {
      insights.recommendations.push('Overall model accuracy below 80% - review data quality')
    }
    
    if (insights.seasonalEndpoints > insights.totalModels * 0.3) {
      insights.recommendations.push('Many endpoints show seasonal patterns - enable seasonal adjustments')
    }
    
    return insights
  }

  // Configure ML parameters
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }

  // Train models on demand
  trainModels() {
    this.performanceHistory.forEach((history, key) => {
      if (history.length >= this.config.minDataPoints) {
        this.updateModel(key, history)
      }
    })
  }

  // Export model data
  exportModels() {
    const exported = {}
    
    this.models.forEach((model, key) => {
      exported[key] = {
        ...model,
        // Don't export sensitive timestamp data
        history: undefined
      }
    })
    
    return {
      models: exported,
      config: this.config,
      exportDate: new Date().toISOString()
    }
  }

  // Import model data
  importModels(importedData) {
    if (importedData.models) {
      Object.entries(importedData.models).forEach(([key, model]) => {
        this.models.set(key, model)
      })
    }
    
    if (importedData.config) {
      this.config = { ...this.config, ...importedData.config }
    }
  }
}

module.exports = { MLAlertOptimizer }
