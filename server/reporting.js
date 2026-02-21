// Comprehensive Reporting and Analytics with Export Capabilities
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

class ReportingEngine {
  constructor() {
    this.reportTemplates = new Map()
    this.scheduledReports = new Map()
    this.reportHistory = new Map()
    this.dataPath = path.join(__dirname, 'data', 'reports')
    
    this.ensureDataDirectory()
    this.initializeTemplates()
    this.loadScheduledReports()
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true })
    }
  }

  initializeTemplates() {
    // Predefined report templates
    this.reportTemplates.set('performance-summary', {
      name: 'Performance Summary',
      description: 'Overall system performance overview',
      metrics: ['responseTime', 'errorRate', 'throughput', 'uptime'],
      timeRanges: ['1h', '24h', '7d', '30d'],
      formats: ['pdf', 'excel', 'csv', 'json'],
      charts: ['line', 'bar', 'pie']
    })

    this.reportTemplates.set('error-analysis', {
      name: 'Error Analysis',
      description: 'Detailed error analysis and trends',
      metrics: ['errorRate', 'errorTypes', 'errorDistribution', 'mttr'],
      timeRanges: ['1h', '24h', '7d', '30d'],
      formats: ['pdf', 'excel', 'csv', 'json'],
      charts: ['line', 'bar', 'heatmap']
    })

    this.reportTemplates.set('service-health', {
      name: 'Service Health Report',
      description: 'Service availability and health metrics',
      metrics: ['uptime', 'responseTime', 'statusDistribution', 'healthScore'],
      timeRanges: ['1h', '24h', '7d', '30d'],
      formats: ['pdf', 'excel', 'csv', 'json'],
      charts: ['gauge', 'line', 'bar']
    })

    this.reportTemplates.set('usage-analytics', {
      name: 'Usage Analytics',
      description: 'API usage patterns and analytics',
      metrics: ['requestCount', 'topEndpoints', 'userActivity', 'geographicDistribution'],
      timeRanges: ['1h', '24h', '7d', '30d'],
      formats: ['pdf', 'excel', 'csv', 'json'],
      charts: ['bar', 'pie', 'map', 'heatmap']
    })

    this.reportTemplates.set('compliance-report', {
      name: 'Compliance Report',
      description: 'SLA and regulatory compliance metrics',
      metrics: ['slaCompliance', 'auditLogs', 'securityEvents', 'dataRetention'],
      timeRanges: ['24h', '7d', '30d', '90d'],
      formats: ['pdf', 'excel', 'csv', 'json'],
      charts: ['gauge', 'line', 'table']
    })
  }

  loadScheduledReports() {
    try {
      const scheduledPath = path.join(this.dataPath, 'scheduled.json')
      if (fs.existsSync(scheduledPath)) {
        const data = fs.readFileSync(scheduledPath, 'utf8')
        const scheduled = JSON.parse(data)
        scheduled.forEach(report => {
          this.scheduledReports.set(report.id, report)
        })
      }
    } catch (error) {
      console.error('Error loading scheduled reports:', error)
    }
  }

  saveScheduledReports() {
    try {
      const scheduledPath = path.join(this.dataPath, 'scheduled.json')
      const scheduled = Array.from(this.scheduledReports.values())
      fs.writeFileSync(scheduledPath, JSON.stringify(scheduled, null, 2))
    } catch (error) {
      console.error('Error saving scheduled reports:', error)
    }
  }

  // Generate report based on template and parameters
  async generateReport(templateId, parameters, metricsData) {
    const template = this.reportTemplates.get(templateId)
    if (!template) {
      throw new Error('Report template not found')
    }

    const report = {
      id: crypto.randomUUID(),
      templateId,
      templateName: template.name,
      parameters,
      generatedAt: new Date().toISOString(),
      generatedBy: parameters.userId || 'system',
      timeRange: parameters.timeRange || '24h',
      metrics: template.metrics,
      format: parameters.format || 'pdf',
      status: 'generating',
      data: null,
      insights: [],
      recommendations: []
    }

    try {
      // Process metrics data
      const processedData = this.processMetricsData(template.metrics, metricsData, parameters)
      
      // Generate insights
      const insights = this.generateInsights(processedData, template)
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(processedData, insights)
      
      // Create report content based on format
      const reportContent = await this.createReportContent(processedData, template, parameters.format)
      
      // Update report
      report.data = reportContent
      report.insights = insights
      report.recommendations = recommendations
      report.status = 'completed'
      report.fileSize = this.calculateFileSize(reportContent)
      report.downloadUrl = `/api/reports/${report.id}/download`

      // Save to history
      this.saveReportToHistory(report)

    } catch (error) {
      report.status = 'failed'
      report.error = error.message
      console.error('Report generation failed:', error)
    }

    return report
  }

  // Process raw metrics data for reporting
  processMetricsData(metrics, rawData, parameters) {
    const processed = {}
    const timeRange = parameters.timeRange || '24h'
    
    metrics.forEach(metric => {
      switch (metric) {
        case 'responseTime':
          processed.responseTime = this.aggregateResponseTime(rawData, timeRange)
          break
        case 'errorRate':
          processed.errorRate = this.aggregateErrorRate(rawData, timeRange)
          break
        case 'throughput':
          processed.throughput = this.aggregateThroughput(rawData, timeRange)
          break
        case 'uptime':
          processed.uptime = this.aggregateUptime(rawData, timeRange)
          break
        case 'errorTypes':
          processed.errorTypes = this.aggregateErrorTypes(rawData, timeRange)
          break
        case 'topEndpoints':
          processed.topEndpoints = this.aggregateTopEndpoints(rawData, timeRange)
          break
        case 'slaCompliance':
          processed.slaCompliance = this.calculateSLACompliance(rawData, timeRange)
          break
        default:
          processed[metric] = rawData[metric] || null
      }
    })

    return processed
  }

  // Aggregate response time metrics
  aggregateResponseTime(data, timeRange) {
    const responseTimes = data.endpoints?.map(endpoint => ({
      name: endpoint.name,
      avg: endpoint.responseTime?.reduce((sum, point) => sum + point.value, 0) / endpoint.responseTime.length || 0,
      min: Math.min(...endpoint.responseTime?.map(p => p.value) || [0]),
      max: Math.max(...endpoint.responseTime?.map(p => p.value) || [0]),
      p95: this.calculatePercentile(endpoint.responseTime?.map(p => p.value) || [], 95),
      p99: this.calculatePercentile(endpoint.responseTime?.map(p => p.value) || [], 99)
    })) || []

    return {
      overall: {
        avg: responseTimes.reduce((sum, ep) => sum + ep.avg, 0) / responseTimes.length || 0,
        min: Math.min(...responseTimes.map(ep => ep.min)),
        max: Math.max(...responseTimes.map(ep => ep.max))
      },
      byEndpoint: responseTimes
    }
  }

  // Aggregate error rate metrics
  aggregateErrorRate(data, timeRange) {
    const errorRates = data.endpoints?.map(endpoint => {
      const totalRequests = endpoint.requests || 0
      const totalErrors = endpoint.errors || 0
      return {
        name: endpoint.name,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        totalRequests,
        totalErrors
      }
    }) || []

    const totalRequests = errorRates.reduce((sum, ep) => sum + ep.totalRequests, 0)
    const totalErrors = errorRates.reduce((sum, ep) => sum + ep.totalErrors, 0)

    return {
      overall: {
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        totalRequests,
        totalErrors
      },
      byEndpoint: errorRates.sort((a, b) => b.errorRate - a.errorRate)
    }
  }

  // Aggregate throughput metrics
  aggregateThroughput(data, timeRange) {
    return {
      requestsPerSecond: data.stats?.requestsChange || 0,
      totalRequests: data.stats?.totalRequests || 0,
      peakThroughput: this.calculatePeakThroughput(data, timeRange)
    }
  }

  // Aggregate uptime metrics
  aggregateUptime(data, timeRange) {
    const serviceUptime = data.serviceHealth?.map(service => ({
      name: service.name,
      uptime: parseFloat(service.uptime) || 0,
      status: service.status
    })) || []

    return {
      overall: serviceUptime.length > 0 ? 
        serviceUptime.reduce((sum, s) => sum + s.uptime, 0) / serviceUptime.length : 0,
      byService: serviceUptime
    }
  }

  // Generate insights from processed data
  generateInsights(data, template) {
    const insights = []

    // Performance insights
    if (data.responseTime) {
      const avgResponseTime = data.responseTime.overall.avg
      if (avgResponseTime > 500) {
        insights.push({
          type: 'performance',
          severity: 'warning',
          title: 'High Response Times',
          description: `Average response time is ${avgResponseTime.toFixed(0)}ms, which exceeds recommended thresholds`,
          recommendation: 'Investigate slow endpoints and optimize database queries'
        })
      }
    }

    // Error rate insights
    if (data.errorRate) {
      const errorRate = data.errorRate.overall.errorRate
      if (errorRate > 5) {
        insights.push({
          type: 'reliability',
          severity: 'critical',
          title: 'High Error Rate',
          description: `Overall error rate is ${errorRate.toFixed(2)}%, which is above acceptable levels`,
          recommendation: 'Prioritize fixing critical errors and implement better error handling'
        })
      }
    }

    // Uptime insights
    if (data.uptime) {
      const uptime = data.uptime.overall
      if (uptime < 99) {
        insights.push({
          type: 'availability',
          severity: 'warning',
          title: 'Low Service Availability',
          description: `Overall uptime is ${uptime.toFixed(2)}%, below SLA requirements`,
          recommendation: 'Review service reliability and implement better monitoring'
        })
      }
    }

    return insights
  }

  // Generate recommendations based on insights
  generateRecommendations(data, insights) {
    const recommendations = []

    insights.forEach(insight => {
      recommendations.push({
        category: insight.type,
        priority: insight.severity === 'critical' ? 'high' : insight.severity === 'warning' ? 'medium' : 'low',
        action: insight.recommendation,
        estimatedImpact: this.estimateImpact(insight),
        effort: this.estimateEffort(insight)
      })
    })

    // Add general recommendations
    recommendations.push({
      category: 'monitoring',
      priority: 'medium',
      action: 'Set up automated alerts for critical metrics',
      estimatedImpact: 'High',
      effort: 'Low'
    })

    return recommendations
  }

  // Create report content based on format
  async createReportContent(data, template, format) {
    switch (format) {
      case 'json':
        return this.createJSONReport(data, template)
      case 'csv':
        return this.createCSVReport(data, template)
      case 'excel':
        return this.createExcelReport(data, template)
      case 'pdf':
        return this.createPDFReport(data, template)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  // Create JSON report
  createJSONReport(data, template) {
    return {
      metadata: {
        template: template.name,
        generatedAt: new Date().toISOString(),
        version: '1.0'
      },
      data,
      summary: this.generateExecutiveSummary(data)
    }
  }

  // Create CSV report
  createCSVReport(data, template) {
    const csvData = []
    
    // Add header
    csvData.push('Metric,Value,Unit,Timestamp')
    
    // Add data rows
    Object.entries(data).forEach(([metric, values]) => {
      if (typeof values === 'object' && values.overall) {
        Object.entries(values.overall).forEach(([key, value]) => {
          csvData.push(`${metric}_${key},${value},--,${new Date().toISOString()}`)
        })
      }
    })

    return csvData.join('\n')
  }

  // Create Excel report (simplified - would use library like xlsx in production)
  createExcelReport(data, template) {
    return {
      type: 'excel',
      worksheets: [
        {
          name: 'Summary',
          data: this.createSummaryWorksheet(data)
        },
        {
          name: 'Details',
          data: this.createDetailsWorksheet(data)
        }
      ]
    }
  }

  // Create PDF report (simplified - would use library like puppeteer in production)
  createPDFReport(data, template) {
    return {
      type: 'pdf',
      content: this.generatePDFContent(data, template),
      metadata: {
        title: template.name,
        author: 'API Monitoring Dashboard',
        subject: 'System Performance Report'
      }
    }
  }

  // Schedule recurring report
  scheduleReport(templateId, parameters, schedule) {
    const scheduledReport = {
      id: crypto.randomUUID(),
      templateId,
      parameters,
      schedule: {
        frequency: schedule.frequency, // 'daily', 'weekly', 'monthly'
        time: schedule.time, // HH:MM format
        dayOfWeek: schedule.dayOfWeek, // 0-6 for weekly
        dayOfMonth: schedule.dayOfMonth, // 1-31 for monthly
        timezone: schedule.timezone || 'UTC'
      },
      recipients: schedule.recipients || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: this.calculateNextRun(schedule)
    }

    this.scheduledReports.set(scheduledReport.id, scheduledReport)
    this.saveScheduledReports()

    return scheduledReport
  }

  // Get scheduled reports
  getScheduledReports() {
    return Array.from(this.scheduledReports.values())
  }

  // Update scheduled report
  updateScheduledReport(reportId, updates) {
    const report = this.scheduledReports.get(reportId)
    if (!report) {
      throw new Error('Scheduled report not found')
    }

    Object.assign(report, updates)
    if (updates.schedule) {
      report.nextRun = this.calculateNextRun(updates.schedule)
    }

    this.scheduledReports.set(reportId, report)
    this.saveScheduledReports()

    return report
  }

  // Delete scheduled report
  deleteScheduledReport(reportId) {
    const deleted = this.scheduledReports.delete(reportId)
    if (deleted) {
      this.saveScheduledReports()
    }
    return deleted
  }

  // Get report history
  getReportHistory(filters = {}) {
    let history = Array.from(this.reportHistory.values())

    // Apply filters
    if (filters.templateId) {
      history = history.filter(report => report.templateId === filters.templateId)
    }
    if (filters.userId) {
      history = history.filter(report => report.generatedBy === filters.userId)
    }
    if (filters.dateFrom) {
      history = history.filter(report => new Date(report.generatedAt) >= new Date(filters.dateFrom))
    }
    if (filters.dateTo) {
      history = history.filter(report => new Date(report.generatedAt) <= new Date(filters.dateTo))
    }

    // Sort by generatedAt descending
    history.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))

    return history
  }

  // Save report to history
  saveReportToHistory(report) {
    this.reportHistory.set(report.id, report)
    
    // Keep only last 1000 reports
    if (this.reportHistory.size > 1000) {
      const oldest = Array.from(this.reportHistory.keys()).slice(0, 100)
      oldest.forEach(id => this.reportHistory.delete(id))
    }

    // Save to disk
    this.saveReportHistory()
  }

  saveReportHistory() {
    try {
      const historyPath = path.join(this.dataPath, 'history.json')
      const history = Array.from(this.reportHistory.values())
      fs.writeFileSync(historyPath, JSON.stringify(history, null, 2))
    } catch (error) {
      console.error('Error saving report history:', error)
    }
  }

  // Utility methods
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }

  calculatePeakThroughput(data, timeRange) {
    // Simplified - would analyze actual time series data
    return (data.stats?.totalRequests || 0) / 3600 // rough estimate
  }

  calculateSLACompliance(data, timeRange) {
    const uptime = this.aggregateUptime(data, timeRange)
    return {
      compliance: uptime.overall >= 99.9 ? 'compliant' : 'non-compliant',
      slaTarget: 99.9,
      actualUptime: uptime.overall
    }
  }

  aggregateErrorTypes(data, timeRange) {
    // Simplified - would categorize actual error types
    return {
      '4xx': 60,
      '5xx': 30,
      'timeouts': 10
    }
  }

  aggregateTopEndpoints(data, timeRange) {
    return data.endpoints?.map(endpoint => ({
      name: endpoint.name,
      requests: endpoint.requests,
      errors: endpoint.errors,
      avgResponseTime: endpoint.responseTime?.reduce((sum, point) => sum + point.value, 0) / endpoint.responseTime.length || 0
    })).sort((a, b) => b.requests - a.requests).slice(0, 10) || []
  }

  generateExecutiveSummary(data) {
    return {
      keyMetrics: {
        avgResponseTime: data.responseTime?.overall.avg || 0,
        errorRate: data.errorRate?.overall.errorRate || 0,
        uptime: data.uptime?.overall || 0,
        totalRequests: data.throughput?.totalRequests || 0
      },
      status: this.calculateOverallStatus(data),
      highlights: this.generateHighlights(data)
    }
  }

  calculateOverallStatus(data) {
    const errorRate = data.errorRate?.overall.errorRate || 0
    const uptime = data.uptime?.overall || 0
    const responseTime = data.responseTime?.overall.avg || 0

    if (errorRate > 5 || uptime < 99) return 'critical'
    if (errorRate > 1 || uptime < 99.5 || responseTime > 500) return 'warning'
    return 'healthy'
  }

  generateHighlights(data) {
    const highlights = []
    
    if (data.errorRate?.overall.errorRate < 1) {
      highlights.push('Excellent error rate performance')
    }
    if (data.uptime?.overall > 99.9) {
      highlights.push('Outstanding service availability')
    }
    if (data.responseTime?.overall.avg < 200) {
      highlights.push('Fast response times')
    }

    return highlights
  }

  estimateImpact(insight) {
    switch (insight.type) {
      case 'performance': return 'Medium'
      case 'reliability': return 'High'
      case 'availability': return 'High'
      default: return 'Medium'
    }
  }

  estimateEffort(insight) {
    switch (insight.type) {
      case 'performance': return 'Medium'
      case 'reliability': return 'High'
      case 'availability': return 'Medium'
      default: return 'Low'
    }
  }

  calculateNextRun(schedule) {
    const now = new Date()
    const nextRun = new Date(now)

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1)
        break
      case 'weekly':
        nextRun.setDate(now.getDate() + (7 - now.getDay() + (schedule.dayOfWeek || 0)) % 7 || 7)
        break
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1)
        nextRun.setDate(schedule.dayOfMonth || 1)
        break
    }

    // Set time
    const [hours, minutes] = (schedule.time || '00:00').split(':').map(Number)
    nextRun.setHours(hours, minutes, 0, 0)

    return nextRun.toISOString()
  }

  calculateFileSize(content) {
    if (typeof content === 'string') {
      return Buffer.byteLength(content, 'utf8')
    } else if (typeof content === 'object') {
      return Buffer.byteLength(JSON.stringify(content), 'utf8')
    }
    return 0
  }

  createSummaryWorksheet(data) {
    return [
      ['Metric', 'Value', 'Status'],
      ['Average Response Time', `${data.responseTime?.overall.avg?.toFixed(2) || 0}ms`, ''],
      ['Error Rate', `${data.errorRate?.overall.errorRate?.toFixed(2) || 0}%`, ''],
      ['Uptime', `${data.uptime?.overall?.toFixed(2) || 0}%`, ''],
      ['Total Requests', data.throughput?.totalRequests || 0, '']
    ]
  }

  createDetailsWorksheet(data) {
    const rows = [['Endpoint', 'Requests', 'Errors', 'Avg Response Time', 'Error Rate']]
    
    data.errorRate?.byEndpoint?.forEach(endpoint => {
      rows.push([
        endpoint.name,
        endpoint.totalRequests,
        endpoint.totalErrors,
        '', // Would calculate from response time data
        `${endpoint.errorRate.toFixed(2)}%`
      ])
    })

    return rows
  }

  generatePDFContent(data, template) {
    return {
      sections: [
        {
          title: 'Executive Summary',
          content: this.generateExecutiveSummary(data)
        },
        {
          title: 'Performance Metrics',
          content: data.responseTime
        },
        {
          title: 'Error Analysis',
          content: data.errorRate
        },
        {
          title: 'Service Availability',
          content: data.uptime
        }
      ]
    }
  }
}

module.exports = { ReportingEngine }
