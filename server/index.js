// Optional dotenv loading (won't crash if not installed)
try {
  require("dotenv").config()
} catch (_) {}

const express = require("express")
const http = require("http")
const cors = require("cors")
const { createMetricsCollector } = require("./metrics")
const { setupApiMonitoring } = require("./api-monitoring")
const { setupDatabaseMonitoring } = require("./db-monitoring")
const { setupAlertSystem } = require("./alerts")
const { setupLogging } = require("./logging")
const { setupHealthChecks } = require("./health-checks")
const { setupRealtime } = require("./realtime")
const { createSimulator } = require("./simulator")
const { createSynthetics } = require("./synthetics")
const { initPersistenceApi } = require("./persistence/sqlite")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const { startTracing } = require("./tracing")
const { eventBus } = require("./event-bus")
const { getActiveTraceId } = require("./tracing")
const { 
  userManagement, 
  createAuthMiddleware, 
  requirePermission, 
  ROLES, 
  PERMISSIONS 
} = require("./auth")
const { IndianFeatures } = require("./indian-features")
const { MLAlertOptimizer } = require("./ml-alerts")
const { CollaborationManager } = require("./collaboration")
const { ReportingEngine } = require("./reporting")
const { IntegrationMarketplace } = require("./integrations")

// Create Express app
const app = express()
const server = http.createServer(app)

// Configure CORS with normalized, allowlisted origins
function normalizeOrigin(value) {
  try {
    if (!value) return "";
    return String(value).replace(/\/+$/g, "");
  } catch (_) { return String(value || ""); }
}

const envList = (process.env.FRONTEND_URLS || "").split(",").map(s => s.trim()).filter(Boolean)
const single = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []
const defaults = ["http://localhost:3000"]
const allowList = [...new Set([...envList, ...single, ...defaults].map(normalizeOrigin))]

app.use((req, res, next) => { res.setHeader('Vary', 'Origin'); next(); })

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no Origin)
      if (!origin) return callback(null, true)
      const o = normalizeOrigin(origin)
      if (allowList.includes(o)) return callback(null, true)
      return callback(new Error(`CORS not allowed for origin: ${origin}`), false)
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
)

app.use(express.json())

// Lightweight request-id middleware (foundation for tracing)
app.use((req, res, next) => {
  const rid = req.headers["x-request-id"] || crypto.randomUUID()
  req.id = String(rid)
  res.setHeader("x-request-id", String(rid))
  next()
})

// Emit error snapshots on 4xx/5xx responses
app.use((req, res, next) => {
  const startHr = process.hrtime.bigint()
  res.on("finish", () => {
    try {
      if (res.statusCode >= 400) {
        const durationMs = Number((process.hrtime.bigint() - startHr) / 1000000n)
        eventBus.emit("errors:snapshot", {
          source: "api",
          endpoint: req.originalUrl || req.url,
          method: (req.method || 'GET').toUpperCase(),
          status: res.statusCode,
          requestHeaders: req.headers,
          requestBody: req.body,
          responseSnippet: `status=${res.statusCode} durationMs=${durationMs}`,
          traceId: getActiveTraceId && getActiveTraceId(),
          ts: Date.now(),
        })
      }
    } catch (_) {}
  })
  next()
})

// Initialize metrics collector
const metricsCollector = createMetricsCollector()
const simulator = createSimulator(metricsCollector)
const synthetics = createSynthetics(metricsCollector)
const indianFeatures = new IndianFeatures()
const mlAlertOptimizer = new MLAlertOptimizer()
const collaborationManager = new CollaborationManager()
const reportingEngine = new ReportingEngine()
const integrationMarketplace = new IntegrationMarketplace()

// Set up API monitoring
setupApiMonitoring(app, metricsCollector)

// Set up database monitoring
setupDatabaseMonitoring(metricsCollector)

// Set up alert system
setupAlertSystem(metricsCollector)

// Set up logging
setupLogging(app)

// Set up health checks
setupHealthChecks(app, metricsCollector)

// Realtime SSE stream
setupRealtime(app)

// Persistence API (latency/error-rate/request series)
initPersistenceApi(app)

// API routes
app.get('/', (req, res) => {
  res.type('text').send('API backend is running. Try /api/health or /api/dashboard-data')
})

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }
    
    const user = userManagement.verifyUser(username, password)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const sessionToken = userManagement.createSession(user)
    
    res.json({
      user,
      token: sessionToken,
      permissions: ROLE_PERMISSIONS[user.role] || []
    })
  } catch (e) {
    res.status(500).json({ error: 'Login failed' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.body?.token
    
    if (token) {
      userManagement.removeSession(token)
    }
    
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (e) {
    res.status(500).json({ error: 'Logout failed' })
  }
})

app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const session = userManagement.validateSession(token)
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    
    res.json({
      user: session,
      permissions: ROLE_PERMISSIONS[session.role] || []
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to get user info' })
  }
})

// User management endpoints (admin only)
app.get('/api/users', requirePermission(PERMISSIONS.USERS_VIEW), (req, res) => {
  try {
    const users = userManagement.getUsers()
    res.json(users)
  } catch (e) {
    res.status(500).json({ error: 'Failed to get users' })
  }
})

app.post('/api/users', requirePermission(PERMISSIONS.USERS_CREATE), (req, res) => {
  try {
    const newUser = userManagement.createUser(req.body)
    res.status(201).json(newUser)
  } catch (e) {
    res.status(500).json({ error: 'Failed to create user' })
  }
})

app.put('/api/users/:id', requirePermission(PERMISSIONS.USERS_EDIT), (req, res) => {
  try {
    const updatedUser = userManagement.updateUser(req.params.id, req.body)
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(updatedUser)
  } catch (e) {
    res.status(500).json({ error: 'Failed to update user' })
  }
})

app.delete('/api/users/:id', requirePermission(PERMISSIONS.USERS_DELETE), (req, res) => {
  try {
    const success = userManagement.deleteUser(req.params.id)
    if (!success) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ success: true, message: 'User deleted successfully' })
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

// Service catalog endpoint
app.get("/api/catalog/services", (req, res) => {
  try {
    const p = path.join(__dirname, "catalog", "services.json")
    const raw = fs.readFileSync(p, "utf-8")
    const json = JSON.parse(raw)
    res.json(json)
  } catch (e) {
    res.status(500).json({ error: "Failed to read service catalog" })
  }
})

// Simple settings store
const SETTINGS_PATH = path.join(__dirname, "settings.json")
function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8")
    const json = JSON.parse(raw)
    if (!json.schemaVersion) json.schemaVersion = "1.0"
    if (!json.apiKeys) json.apiKeys = { production: "", development: "" }
    if (!Array.isArray(json.monitors)) json.monitors = []
    if (!json.alerts) json.alerts = { slackWebhookUrl: "", webhookUrl: "" }
    if (!json.synthetics) json.synthetics = { jitterPct: 0.2, spreadStartMs: 2000 }
    if (!json.tracing) json.tracing = { otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '' }
    return json
  } catch (_) {
    return { schemaVersion: "1.0", apiKeys: { production: "", development: "" }, monitors: [], alerts: { slackWebhookUrl: "", webhookUrl: "" }, synthetics: { jitterPct: 0.2, spreadStartMs: 2000 } }
  }
}
function writeSettings(obj) {
  // Basic validation/sanitization for monitors
  const cleanMonitors = Array.isArray(obj?.monitors) ? obj.monitors.map((m) => ({
    name: String(m?.name || "Monitor"),
    url: String(m?.url || ""),
    method: String(m?.method || 'GET').toUpperCase(),
    expectedStatus: Number(m?.expectedStatus ?? 200),
    maxLatencyMs: Math.max(1, Number(m?.maxLatencyMs ?? 1000)),
    intervalMs: Math.max(1000, Number(m?.intervalMs ?? 60000)),
    headers: typeof m?.headers === 'object' && m?.headers !== null ? m.headers : {},
    useDevKey: !!m?.useDevKey,
    bearerToken: m?.bearerToken ? String(m.bearerToken) : undefined,
    expectedBodyContains: m?.expectedBodyContains ? String(m.expectedBodyContains) : undefined,
    jitterPct: Math.min(0.9, Math.max(0, Number(m?.jitterPct ?? NaN))) || undefined,
    backoff: !!m?.backoff,
  })).filter(m => m.url) : []

  const safe = {
    schemaVersion: String(obj?.schemaVersion || "1.0"),
    apiKeys: {
      production: String(obj?.apiKeys?.production || ""),
      development: String(obj?.apiKeys?.development || ""),
    },
    monitors: cleanMonitors,
    alerts: {
      slackWebhookUrl: String(obj?.alerts?.slackWebhookUrl || ""),
      webhookUrl: String(obj?.alerts?.webhookUrl || ""),
    },
    synthetics: {
      jitterPct: Math.min(0.9, Math.max(0, Number(obj?.synthetics?.jitterPct ?? 0.2))),
      spreadStartMs: Math.max(0, Number(obj?.synthetics?.spreadStartMs ?? 2000)),
    },
    tracing: {
      otlpEndpoint: String(obj?.tracing?.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || ''),
    },
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(safe, null, 2))
  return safe
}

app.get("/api/settings", (req, res) => {
  try {
    res.json(readSettings())
  } catch (e) {
    res.status(500).json({ error: "Failed to read settings" })
  }
})

app.post("/api/settings", (req, res) => {
  try {
    const saved = writeSettings(req.body || {})
    // if synthetics is running, restart to pick up new monitors
    try { synthetics.stop() } catch {}
    try { synthetics.start() } catch {}
    res.json(saved)
  } catch (e) {
    res.status(500).json({ error: "Failed to save settings" })
  }
})

// Start tracing (best-effort). Reads OTLP endpoint from settings or env.
try {
  const settings = readSettings()
  const otlp = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || settings?.tracing?.otlpEndpoint
  startTracing({ serviceName: 'api-monitor', otlpEndpoint: otlp })
} catch (_) {}

// Simulator controls
app.get("/api/sim/status", (req, res) => {
  try {
    res.json(simulator.status())
  } catch (e) {
    res.status(500).json({ error: "Failed to get simulator status" })
  }
})

app.post("/api/sim/start", (req, res) => {
  try {
    const { rps, dbQps } = req.body || {}
    const state = simulator.start({ rps, dbQps })
    res.json(state)
  } catch (e) {
    res.status(500).json({ error: "Failed to start simulator" })
  }
})

app.post("/api/sim/stop", (req, res) => {
  try {
    const state = simulator.stop()
    res.json(state)
  } catch (e) {
    res.status(500).json({ error: "Failed to stop simulator" })
  }
})

// Synthetics controls
app.get("/api/synthetics/status", (req, res) => {
  try {
    res.json(synthetics.status())
  } catch (e) {
    res.status(500).json({ error: "Failed to get synthetics status" })
  }
})

app.post("/api/synthetics/start", (req, res) => {
  try {
    const state = synthetics.start()
    res.json(state)
  } catch (e) {
    res.status(500).json({ error: "Failed to start synthetics" })
  }
})

app.post("/api/synthetics/stop", (req, res) => {
  try {
    const state = synthetics.stop()
    res.json(state)
  } catch (e) {
    res.status(500).json({ error: "Failed to stop synthetics" })
  }
})

app.post("/api/synthetics/run", async (req, res) => {
  try {
    const result = await synthetics.runOnce()
    res.json({ ok: true, result })
  } catch (e) {
    res.status(500).json({ error: "Failed to run synthetics" })
  }
})

// Test a single monitor on-demand from Settings
app.post("/api/synthetics/test", async (req, res) => {
  try {
    const monitor = req.body || {}
    const result = await synthetics.runSingle(monitor)
    res.json({ ok: true, result })
  } catch (e) {
    res.status(500).json({ error: "Failed to test monitor" })
  }
})

// Send a test notification to Slack/Webhook using saved settings
app.post("/api/alerts/test", async (req, res) => {
  try {
    const settings = readSettings()
    const { title = "Test Notification", message = "Hello from API Monitor" } = req.body || {}
    const slack = settings?.alerts?.slackWebhookUrl
    const hook = settings?.alerts?.webhookUrl
    const payload = { text: `[*TEST*] ${title} — ${message}` }
    const results = {}
    if (slack) {
      try {
        const r = await fetch(slack, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        results.slack = r.status
      } catch (e) { results.slack = String(e?.message || e) }
    }
    if (hook) {
      try {
        const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'test', title, message, ts: Date.now() }) })
        results.webhook = r.status
      } catch (e) { results.webhook = String(e?.message || e) }
    }
    res.json({ ok: true, results })
  } catch (e) {
    res.status(500).json({ error: 'Failed to send test alert' })
  }
})

// Acknowledge an alert
app.post("/api/alerts/:id/ack", (req, res) => {
  try {
    if (typeof metricsCollector.updateAlertStatus !== "function") {
      return res.status(404).json({ error: "Alert actions not available" })
    }
    const updated = metricsCollector.updateAlertStatus(req.params.id, "ack")
    if (!updated) return res.status(404).json({ error: "Alert not found" })
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: "Failed to update alert" })
  }
})

// Resolve an alert
app.post("/api/alerts/:id/resolve", (req, res) => {
  try {
    if (typeof metricsCollector.updateAlertStatus !== "function") {
      return res.status(404).json({ error: "Alert actions not available" })
    }
    const updated = metricsCollector.updateAlertStatus(req.params.id, "resolve")
    if (!updated) return res.status(404).json({ error: "Alert not found" })
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: "Failed to update alert" })
  }
})

// Trigger immediate health check run
app.post("/api/health/run", async (req, res) => {
  try {
    if (typeof app.locals.runHealthCheck !== "function") {
      return res.status(404).json({ error: "Health check runner not available" })
    }
    const result = await app.locals.runHealthCheck()
    res.json({ ok: true, result })
  } catch (e) {
    res.status(500).json({ error: "Failed to run health checks" })
  }
})

// Anomaly Detection API endpoints
app.get("/api/anomaly/stats", (req, res) => {
  try {
    const anomalyDetector = metricsCollector.getAnomalyDetector()
    if (!anomalyDetector) {
      return res.status(404).json({ error: "Anomaly detector not available" })
    }
    const stats = anomalyDetector.getAnomalyStats()
    res.json(stats)
  } catch (e) {
    res.status(500).json({ error: "Failed to get anomaly stats" })
  }
})

app.get("/api/anomaly/predict/:endpoint/:metric", (req, res) => {
  try {
    const anomalyDetector = metricsCollector.getAnomalyDetector()
    if (!anomalyDetector) {
      return res.status(404).json({ error: "Anomaly detector not available" })
    }
    const { endpoint, metric } = req.params
    const { steps = 1 } = req.query
    const prediction = anomalyDetector.predictNext(endpoint, metric, parseInt(steps))
    res.json(prediction)
  } catch (e) {
    res.status(500).json({ error: "Failed to get prediction" })
  }
})

app.get("/api/anomaly/health/:endpoint", (req, res) => {
  try {
    const anomalyDetector = metricsCollector.getAnomalyDetector()
    if (!anomalyDetector) {
      return res.status(404).json({ error: "Anomaly detector not available" })
    }
    const { endpoint } = req.params
    const healthScore = anomalyDetector.getHealthScore(endpoint)
    res.json({ endpoint, healthScore })
  } catch (e) {
    res.status(500).json({ error: "Failed to get health score" })
  }
})

app.post("/api/anomaly/configure", (req, res) => {
  try {
    const anomalyDetector = metricsCollector.getAnomalyDetector()
    if (!anomalyDetector) {
      return res.status(404).json({ error: "Anomaly detector not available" })
    }
    anomalyDetector.configure(req.body || {})
    res.json({ success: true, message: "Anomaly detector configured" })
  } catch (e) {
    res.status(500).json({ error: "Failed to configure anomaly detector" })
  }
})

// Indian Market Features API endpoints
app.get("/api/indian/region/:ip", (req, res) => {
  try {
    const { ip } = req.params
    const regionInfo = indianFeatures.detectIndianRegion(ip)
    res.json(regionInfo)
  } catch (e) {
    res.status(500).json({ error: "Failed to detect region" })
  }
})

app.get("/api/indian/holidays", (req, res) => {
  try {
    const holidays = indianFeatures.indianHolidays
    const today = indianFeatures.isIndianHoliday()
    res.json({ holidays, todayHoliday: today })
  } catch (e) {
    res.status(500).json({ error: "Failed to get holidays" })
  }
})

app.get("/api/indian/business-hours/:region?", (req, res) => {
  try {
    const { region } = req.params
    const businessHours = indianFeatures.getIndianBusinessHours(region)
    res.json(businessHours)
  } catch (e) {
    res.status(500).json({ error: "Failed to get business hours" })
  }
})

app.get("/api/indian/isp/:hostname/:ip", (req, res) => {
  try {
    const { hostname, ip } = req.params
    const ispInfo = indianFeatures.detectIndianISP(hostname, ip)
    res.json(ispInfo)
  } catch (e) {
    res.status(500).json({ error: "Failed to detect ISP" })
  }
})

app.get("/api/indian/benchmarks/:region", (req, res) => {
  try {
    const { region } = req.params
    const benchmarks = indianFeatures.getRegionalBenchmarks(region)
    res.json(benchmarks)
  } catch (e) {
    res.status(500).json({ error: "Failed to get benchmarks" })
  }
})

app.get("/api/indian/compliance", (req, res) => {
  try {
    const compliance = indianFeatures.getComplianceInfo()
    res.json(compliance)
  } catch (e) {
    res.status(500).json({ error: "Failed to get compliance info" })
  }
})

app.get("/api/indian/insights", (req, res) => {
  try {
    const insights = indianFeatures.getMarketInsights()
    res.json(insights)
  } catch (e) {
    res.status(500).json({ error: "Failed to get market insights" })
  }
})

app.post("/api/indian/analyze", (req, res) => {
  try {
    const { metrics, region, timeOfDay } = req.body
    const analysis = indianFeatures.analyzeIndianPerformance(metrics, region, timeOfDay)
    res.json(analysis)
  } catch (e) {
    res.status(500).json({ error: "Failed to analyze performance" })
  }
})

// ML-based Alert Optimization API endpoints
app.get("/api/ml/thresholds/:endpoint/:metric", (req, res) => {
  try {
    const { endpoint, metric } = req.params
    const thresholds = mlAlertOptimizer.getOptimizedThresholds(endpoint, metric)
    res.json(thresholds)
  } catch (e) {
    res.status(500).json({ error: "Failed to get ML thresholds" })
  }
})

app.post("/api/ml/train", (req, res) => {
  try {
    mlAlertOptimizer.trainModels()
    res.json({ success: true, message: "ML models trained successfully" })
  } catch (e) {
    res.status(500).json({ error: "Failed to train ML models" })
  }
})

app.get("/api/ml/insights", (req, res) => {
  try {
    const insights = mlAlertOptimizer.getMLInsights()
    res.json(insights)
  } catch (e) {
    res.status(500).json({ error: "Failed to get ML insights" })
  }
})

app.post("/api/ml/configure", (req, res) => {
  try {
    mlAlertOptimizer.configure(req.body || {})
    res.json({ success: true, message: "ML alert optimizer configured" })
  } catch (e) {
    res.status(500).json({ error: "Failed to configure ML optimizer" })
  }
})

app.get("/api/ml/export", (req, res) => {
  try {
    const models = mlAlertOptimizer.exportModels()
    res.json(models)
  } catch (e) {
    res.status(500).json({ error: "Failed to export ML models" })
  }
})

app.post("/api/ml/import", (req, res) => {
  try {
    mlAlertOptimizer.importModels(req.body || {})
    res.json({ success: true, message: "ML models imported successfully" })
  } catch (e) {
    res.status(500).json({ error: "Failed to import ML models" })
  }
})

app.post("/api/ml/performance", (req, res) => {
  try {
    const { endpoint, metric, value } = req.body
    mlAlertOptimizer.addPerformanceData(endpoint, metric, value)
    
    // Get prediction
    const prediction = mlAlertOptimizer.predictAlert(endpoint, metric, value)
    res.json({ success: true, prediction })
  } catch (e) {
    res.status(500).json({ error: "Failed to process performance data" })
  }
})

// Collaboration API endpoints
app.post("/api/collaboration/dashboards", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const dashboard = collaborationManager.createSharedDashboard(userId, req.body)
    res.status(201).json(dashboard)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to create shared dashboard" })
  }
})

app.get("/api/collaboration/dashboards", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const dashboards = collaborationManager.getUserDashboards(userId)
    res.json(dashboards)
  } catch (e) {
    res.status(500).json({ error: "Failed to get user dashboards" })
  }
})

app.put("/api/collaboration/dashboards/:id", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const dashboard = collaborationManager.updateSharedDashboard(id, userId, req.body)
    res.json(dashboard)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to update dashboard" })
  }
})

app.post("/api/collaboration/dashboards/:id/collaborators", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { email, role } = req.body
    const collaborator = collaborationManager.addCollaborator(id, userId, email, role)
    res.status(201).json(collaborator)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to add collaborator" })
  }
})

app.delete("/api/collaboration/dashboards/:id/collaborators/:collaboratorId", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id, collaboratorId } = req.params
    const userId = req.user.userId
    const removed = collaborationManager.removeCollaborator(id, userId, collaboratorId)
    res.json(removed)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to remove collaborator" })
  }
})

app.get("/api/collaboration/dashboards/:id/comments", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const comments = collaborationManager.getDashboardComments(id)
    res.json(comments)
  } catch (e) {
    res.status(500).json({ error: "Failed to get comments" })
  }
})

app.post("/api/collaboration/dashboards/:id/comments", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const { content, position } = req.body
    const comment = collaborationManager.addComment(id, userId, content, position)
    res.status(201).json(comment)
  } catch (e) {
    res.status(500).json({ error: "Failed to add comment" })
  }
})

app.post("/api/collaboration/dashboards/:id/comments/:commentId/reply", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id, commentId } = req.params
    const userId = req.user.userId
    const { content } = req.body
    const reply = collaborationManager.replyToComment(id, commentId, userId, content)
    res.status(201).json(reply)
  } catch (e) {
    res.status(500).json({ error: "Failed to reply to comment" })
  }
})

app.put("/api/collaboration/dashboards/:id/comments/:commentId/resolve", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id, commentId } = req.params
    const userId = req.user.userId
    const comment = collaborationManager.resolveComment(id, commentId, userId)
    res.json(comment)
  } catch (e) {
    res.status(500).json({ error: "Failed to resolve comment" })
  }
})

app.get("/api/collaboration/dashboards/:id/activities", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const { limit = 50 } = req.query
    const activities = collaborationManager.getDashboardActivities(id, parseInt(limit))
    res.json(activities)
  } catch (e) {
    res.status(500).json({ error: "Failed to get activities" })
  }
})

app.get("/api/collaboration/dashboards/:id/stats", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const stats = collaborationManager.getDashboardStats(id)
    res.json(stats)
  } catch (e) {
    res.status(500).json({ error: "Failed to get dashboard stats" })
  }
})

app.get("/api/collaboration/search", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const { query, tags, startDate, endDate } = req.query
    
    const filters = {}
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags]
    if (startDate) filters.startDate = startDate
    if (endDate) filters.endDate = endDate
    
    const results = collaborationManager.searchDashboards(userId, query, filters)
    res.json(results)
  } catch (e) {
    res.status(500).json({ error: "Failed to search dashboards" })
  }
})

app.get("/api/collaboration/dashboards/:id/export", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.userId
    const exportData = collaborationManager.exportDashboard(id, userId)
    res.json(exportData)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to export dashboard" })
  }
})

app.post("/api/collaboration/import", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const dashboard = collaborationManager.importDashboard(userId, req.body)
    res.status(201).json(dashboard)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to import dashboard" })
  }
})

// Reporting and Analytics API endpoints
app.get("/api/reports/templates", (req, res) => {
  try {
    const templates = Array.from(reportingEngine.reportTemplates.entries()).map(([id, template]) => ({
      id,
      ...template
    }))
    res.json(templates)
  } catch (e) {
    res.status(500).json({ error: "Failed to get report templates" })
  }
})

app.post("/api/reports/generate", createAuthMiddleware(userManagement), async (req, res) => {
  try {
    const { templateId, parameters } = req.body
    const metricsData = metricsCollector.getAllData()
    
    // Add user ID to parameters
    parameters.userId = req.user.userId
    
    const report = await reportingEngine.generateReport(templateId, parameters, metricsData)
    res.json(report)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to generate report" })
  }
})

app.get("/api/reports/:id/download", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const report = reportingEngine.reportHistory.get(id)
    
    if (!report) {
      return res.status(404).json({ error: "Report not found" })
    }

    // Check permissions
    if (report.generatedBy !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" })
    }

    // Set appropriate headers based on format
    const contentType = {
      'pdf': 'application/pdf',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'json': 'application/json'
    }[report.format] || 'application/octet-stream'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.${report.format}"`)
    
    if (typeof report.data === 'string') {
      res.send(report.data)
    } else {
      res.json(report.data)
    }
  } catch (e) {
    res.status(500).json({ error: "Failed to download report" })
  }
})

app.get("/api/reports/history", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const filters = {
      userId: req.user.role === 'admin' ? undefined : req.user.userId,
      templateId: req.query.templateId,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    }
    
    const history = reportingEngine.getReportHistory(filters)
    res.json(history)
  } catch (e) {
    res.status(500).json({ error: "Failed to get report history" })
  }
})

app.post("/api/reports/schedule", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { templateId, parameters, schedule } = req.body
    parameters.userId = req.user.userId
    
    const scheduledReport = reportingEngine.scheduleReport(templateId, parameters, schedule)
    res.status(201).json(scheduledReport)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to schedule report" })
  }
})

app.get("/api/reports/scheduled", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const scheduledReports = reportingEngine.getScheduledReports()
    
    // Filter by user if not admin
    const filtered = req.user.role === 'admin' 
      ? scheduledReports 
      : scheduledReports.filter(report => report.parameters.userId === req.user.userId)
    
    res.json(filtered)
  } catch (e) {
    res.status(500).json({ error: "Failed to get scheduled reports" })
  }
})

app.put("/api/reports/schedule/:id", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const updated = reportingEngine.updateScheduledReport(id, req.body)
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to update scheduled report" })
  }
})

app.delete("/api/reports/schedule/:id", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { id } = req.params
    const deleted = reportingEngine.deleteScheduledReport(id)
    res.json({ success: deleted })
  } catch (e) {
    res.status(500).json({ error: "Failed to delete scheduled report" })
  }
})

app.get("/api/analytics/dashboard", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const { timeRange = '24h' } = req.query
    const data = metricsCollector.getAllData()
    
    // Generate analytics summary
    const analytics = {
      summary: {
        totalRequests: data.stats.totalRequests,
        errorRate: data.stats.errorRate,
        avgResponseTime: data.stats.avgResponseTime,
        uptime: data.stats.uptime,
        activeAlerts: data.alerts?.filter(a => a.status === 'active').length || 0
      },
      trends: {
        requestsTrend: calculateTrend(data.endpoints, 'requests'),
        errorRateTrend: calculateTrend(data.endpoints, 'errors'),
        responseTimeTrend: calculateTrend(data.endpoints, 'responseTime')
      },
      topEndpoints: data.endpoints?.sort((a, b) => b.requests - a.requests).slice(0, 10) || [],
      recentAlerts: data.alerts?.slice(0, 5) || [],
      systemHealth: {
        cpu: data.resourceMetrics?.cpu?.current || 0,
        memory: data.resourceMetrics?.memory?.usedPercentage || 0,
        disk: 75 // Placeholder
      }
    }
    
    res.json(analytics)
  } catch (e) {
    res.status(500).json({ error: "Failed to get analytics data" })
  }
})

// Helper function for trend calculation
function calculateTrend(endpoints, metric) {
  if (!endpoints || endpoints.length === 0) return { direction: 'stable', change: 0 }
  
  const current = endpoints.reduce((sum, ep) => sum + (ep[metric] || 0), 0)
  const previous = current * 0.9 // Simplified - would use historical data
  const change = ((current - previous) / previous) * 100
  
  return {
    direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
    change: Math.round(change * 100) / 100
  }
}

// Integration Marketplace API endpoints
app.get("/api/integrations", (req, res) => {
  try {
    const { category, region, search } = req.query
    const filters = {}
    if (category) filters.category = category
    if (region) filters.region = region
    if (search) filters.search = search
    
    const integrations = integrationMarketplace.getAvailableIntegrations(filters)
    res.json(integrations)
  } catch (e) {
    res.status(500).json({ error: "Failed to get integrations" })
  }
})

app.get("/api/integrations/:id", (req, res) => {
  try {
    const { id } = req.params
    const integration = integrationMarketplace.getIntegration(id)
    if (!integration) {
      return res.status(404).json({ error: "Integration not found" })
    }
    res.json(integration)
  } catch (e) {
    res.status(500).json({ error: "Failed to get integration" })
  }
})

app.get("/api/integrations/categories", (req, res) => {
  try {
    const categories = integrationMarketplace.getCategories()
    res.json(categories)
  } catch (e) {
    res.status(500).json({ error: "Failed to get categories" })
  }
})

app.get("/api/integrations/popular", (req, res) => {
  try {
    const { limit = 10 } = req.query
    const popular = integrationMarketplace.getPopularIntegrations(parseInt(limit))
    res.json(popular)
  } catch (e) {
    res.status(500).json({ error: "Failed to get popular integrations" })
  }
})

app.post("/api/integrations/test", createAuthMiddleware(userManagement), async (req, res) => {
  try {
    const { integrationId, config } = req.body
    const testResult = await integrationMarketplace.testIntegration(integrationId, config)
    res.json(testResult)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to test integration" })
  }
})

app.post("/api/user/integrations", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const { integrationId, config } = req.body
    const userIntegration = integrationMarketplace.installIntegration(userId, integrationId, config)
    res.status(201).json(userIntegration)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to install integration" })
  }
})

app.get("/api/user/integrations", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const userIntegrations = integrationMarketplace.getUserIntegrations(userId)
    res.json(userIntegrations)
  } catch (e) {
    res.status(500).json({ error: "Failed to get user integrations" })
  }
})

app.put("/api/user/integrations/:id", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const { id } = req.params
    const updated = integrationMarketplace.updateIntegration(userId, id, req.body)
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to update integration" })
  }
})

app.delete("/api/user/integrations/:id", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const { id } = req.params
    const removed = integrationMarketplace.uninstallIntegration(userId, id)
    res.json(removed)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to uninstall integration" })
  }
})

app.get("/api/user/integrations/:id/metrics", createAuthMiddleware(userManagement), (req, res) => {
  try {
    const userId = req.user.userId
    const { id } = req.params
    const metrics = integrationMarketplace.getIntegrationMetrics(userId, id)
    res.json(metrics)
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to get integration metrics" })
  }
})

// Dashboard data endpoint - returns all data in a single request
app.get("/api/dashboard-data", createAuthMiddleware(userManagement), requirePermission(PERMISSIONS.DASHBOARD_VIEW), (req, res) => {
  res.json(metricsCollector.getAllData())
})

// Alerts (recent)
app.get("/api/alerts", createAuthMiddleware(userManagement), requirePermission(PERMISSIONS.ALERTS_VIEW), (req, res) => {
  try {
    const { alerts } = metricsCollector.getAllData()
    res.json(alerts || [])
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch alerts" })
  }
})

// Alert thresholds - get
app.get("/api/thresholds", (req, res) => {
  try {
    if (typeof metricsCollector.getAlertThresholds !== "function") {
      return res.status(404).json({ error: "Thresholds not available" })
    }
    res.json(metricsCollector.getAlertThresholds())
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch thresholds" })
  }
})

// Alert thresholds - update
app.post("/api/thresholds", (req, res) => {
  try {
    if (typeof metricsCollector.setAlertThresholds !== "function") {
      return res.status(404).json({ error: "Thresholds not available" })
    }
    const updated = metricsCollector.setAlertThresholds(req.body || {})
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: "Failed to update thresholds" })
  }
})

// Start the server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  // Optional autostart simulator
  if (process.env.SIMULATOR_AUTOSTART === "true") {
    const rps = Number(process.env.SIMULATOR_RPS || 6)
    const dbQps = Number(process.env.SIMULATOR_DB_QPS || 3)
    try {
      simulator.start({ rps, dbQps })
      console.log(`Simulator autostarted (rps=${rps}, dbQps=${dbQps})`)
    } catch (e) {
      console.error("Failed to autostart simulator:", e?.message || e)
    }
  }

  // Keepalive ping to prevent Render free instances from idling (best-effort)
  try {
    const base = normalizeOrigin(process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL || "")
    const keepAliveUrl = base ? `${base}/api/health` : null
    const intervalMs = Math.max(60000, Number(process.env.KEEPALIVE_INTERVAL_MS || 300000)) // default 5 min
    if (keepAliveUrl && typeof setInterval === 'function') {
      setInterval(async () => {
        try {
          // Node 18+ has global fetch; ignore errors silently
          if (typeof fetch === 'function') {
            await fetch(keepAliveUrl, { method: 'GET', headers: { 'x-keepalive': '1' } })
          }
        } catch (_) {}
      }, intervalMs)
      console.log(`Keepalive enabled → pinging ${keepAliveUrl} every ${Math.round(intervalMs/1000)}s`)
    }
  } catch (_) {}
})

module.exports = { app, server }

