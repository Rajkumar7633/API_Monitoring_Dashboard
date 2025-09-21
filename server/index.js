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

// Dashboard data endpoint - returns all data in a single request
app.get("/api/dashboard-data", (req, res) => {
  res.json(metricsCollector.getAllData())
})

// Alerts (recent)
app.get("/api/alerts", (req, res) => {
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

