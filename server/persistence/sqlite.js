const fs = require('fs')
const path = require('path')
let Database
let PERSIST_DISABLED = false
try {
  Database = require('better-sqlite3')
} catch (e) {
  console.warn('[persistence] better-sqlite3 not available, persistence disabled:', e?.message || e)
  PERSIST_DISABLED = true
}
const { eventBus } = require('../event-bus')

// In-memory fallback buffer for error snapshots when SQLite is unavailable
const MEM_SNAPSHOT_CAP = 200
const memSnapshots = []
function memPushSnapshot(snap) {
  try {
    const id = String(snap.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`)
    memSnapshots.unshift({
      id,
      source: String(snap.source || 'server'),
      endpoint: String(snap.endpoint || ''),
      method: String(snap.method || 'GET'),
      status: Number(snap.status || 0),
      request_headers: snap.requestHeaders || {},
      request_body: snap.requestBody ?? null,
      response_snippet: String(snap.responseSnippet || ''),
      traceId: snap.traceId || null,
      ts: Number(snap.ts || Date.now()),
    })
    if (memSnapshots.length > MEM_SNAPSHOT_CAP) memSnapshots.pop()
  } catch {}
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'metrics.db')

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }) } catch (_) {}
}

function initDb() {
  if (PERSIST_DISABLED) return null
  ensureDir(DATA_DIR)
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      status INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_requests_ts ON requests(ts);
    CREATE INDEX IF NOT EXISTS idx_requests_ep_ts ON requests(endpoint, ts);

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      endpoint TEXT,
      status INTEGER,
      message TEXT,
      duration_ms INTEGER,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_logs_ts ON logs(ts);

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      type TEXT,
      service TEXT,
      message TEXT,
      details TEXT,
      status TEXT,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_ts ON alerts(ts);

    CREATE TABLE IF NOT EXISTS service_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service TEXT NOT NULL,
      status TEXT NOT NULL,
      response_ms INTEGER NOT NULL,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_checks_service_ts ON service_checks(service, ts);

    CREATE TABLE IF NOT EXISTS error_snapshots (
      id TEXT PRIMARY KEY,
      source TEXT,
      endpoint TEXT,
      method TEXT,
      status INTEGER,
      request_headers TEXT,
      request_body TEXT,
      response_snippet TEXT,
      trace_id TEXT,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_errsnap_ts ON error_snapshots(ts);
  `)
  return db
}

const db = initDb()

// prepared statements
const stmtInsertReq = db ? db.prepare(`INSERT INTO requests(endpoint, status, duration_ms, ts) VALUES(?,?,?,?)`) : null
const stmtInsertLog = db ? db.prepare(`INSERT INTO logs(id, endpoint, status, message, duration_ms, ts) VALUES(?,?,?,?,?,?)`) : null
const stmtInsertAlert = db ? db.prepare(`INSERT INTO alerts(id, type, service, message, details, status, ts) VALUES(?,?,?,?,?,?,?)`) : null
const stmtInsertCheck = db ? db.prepare(`INSERT INTO service_checks(service, status, response_ms, ts) VALUES(?,?,?,?)`) : null
const stmtInsertSnapshot = db ? db.prepare(`INSERT INTO error_snapshots(id, source, endpoint, method, status, request_headers, request_body, response_snippet, trace_id, ts) VALUES(?,?,?,?,?,?,?,?,?,?)`) : null

function onMetricsApi({ endpoint, duration, status }) {
  if (!stmtInsertReq) return
  try { stmtInsertReq.run(endpoint, status, Math.round(duration || 0), Date.now()) } catch (_) {}
}

function onMetricsLog(log) {
  // log has id, endpoint, status, message, timestamp, duration
  if (!stmtInsertLog) return
  const ts = log.timestamp ? Date.parse(log.timestamp) : Date.now()
  try {
    stmtInsertLog.run(String(log.id), log.endpoint || null, log.status || null, log.message || null, Math.round(log.duration || 0), ts)
  } catch (_) { /* ignore duplicate */ }
}

function onMetricsAlert(alert) {
  if (!stmtInsertAlert) return
  const ts = Date.now()
  try {
    stmtInsertAlert.run(String(alert.id), alert.type || null, alert.service || null, alert.message || null, alert.details || null, alert.status || null, ts)
  } catch (_) { /* ignore duplicate */ }
}

function onMetricsService({ service }) {
  if (!service || !stmtInsertCheck) return
  try { stmtInsertCheck.run(service.name, service.status, Math.round(service.responseTime || 0), Date.now()) } catch (_) {}
}

// Helpers for error snapshots
function redactHeaders(h) {
  try {
    const copy = { ...(h || {}) }
    if (copy.authorization) copy.authorization = '***'
    if (copy['x-api-key']) copy['x-api-key'] = '***'
    return copy
  } catch { return {} }
}

function onErrorSnapshot(snap) {
  if (!stmtInsertSnapshot) {
    // persistence disabled: also store in memory
    memPushSnapshot(snap)
    return
  }
  try {
    const id = String(snap.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`)
    const source = String(snap.source || 'server')
    const endpoint = String(snap.endpoint || '')
    const method = String(snap.method || 'GET')
    const status = Number(snap.status || 0)
    const reqHeaders = JSON.stringify(redactHeaders(snap.requestHeaders || {}))
    const reqBody = typeof snap.requestBody === 'string' ? snap.requestBody : JSON.stringify(snap.requestBody || '')
    const resp = String(snap.responseSnippet || '')
    const traceId = snap.traceId ? String(snap.traceId) : null
    const ts = Number(snap.ts || Date.now())
    stmtInsertSnapshot.run(id, source, endpoint, method, status, reqHeaders, reqBody, resp, traceId, ts)
  } catch (_) {}
}

// Attach listeners immediately so persistence starts when module is imported
function attachListeners() {
  if (!PERSIST_DISABLED) {
    eventBus.on('metrics:api', onMetricsApi)
    eventBus.on('metrics:log', onMetricsLog)
    eventBus.on('metrics:alert', onMetricsAlert)
    eventBus.on('metrics:service', onMetricsService)
  }
  // Always listen for error snapshots; store to DB or memory
  eventBus.on('errors:snapshot', onErrorSnapshot)
}

attachListeners()

// Helper to compute percentile from sorted array
function percentile(sortedArr, p) { // p in [0,100]
  if (!sortedArr.length) return 0
  const idx = (p / 100) * (sortedArr.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sortedArr[lo]
  const w = idx - lo
  return Math.round(sortedArr[lo] * (1 - w) + sortedArr[hi] * w)
}

// Query latency series (bucketed) for an endpoint
function getLatencySeries({ endpoint, hours = 24, bucketMinutes = 60 }) {
  const toTs = Date.now()
  const fromTs = toTs - Number(hours) * 60 * 60 * 1000
  if (PERSIST_DISABLED || !db) return []
  const rows = db.prepare(`SELECT duration_ms, ts FROM requests WHERE endpoint = ? AND ts BETWEEN ? AND ? ORDER BY ts ASC`).all(endpoint, fromTs, toTs)
  const bucketMs = Number(bucketMinutes) * 60 * 1000
  const bucketMap = new Map()
  for (const r of rows) {
    const key = Math.floor(r.ts / bucketMs) * bucketMs
    let arr = bucketMap.get(key)
    if (!arr) { arr = []; bucketMap.set(key, arr) }
    arr.push(r.duration_ms)
  }
  const result = []
  const keys = Array.from(bucketMap.keys()).sort((a,b)=>a-b)
  for (const k of keys) {
    const arr = bucketMap.get(k)
    arr.sort((a,b)=>a-b)
    result.push({ ts: k, p50: percentile(arr,50), p95: percentile(arr,95), p99: percentile(arr,99), count: arr.length })
  }
  return result
}

// Query error-rate series (bucketed) for an endpoint
function getErrorRateSeries({ endpoint, hours = 24, bucketMinutes = 60 }) {
  const toTs = Date.now()
  const fromTs = toTs - Number(hours) * 60 * 60 * 1000
  if (PERSIST_DISABLED || !db) return []
  const rows = db.prepare(`SELECT status, ts FROM requests WHERE endpoint = ? AND ts BETWEEN ? AND ? ORDER BY ts ASC`).all(endpoint, fromTs, toTs)
  const bucketMs = Number(bucketMinutes) * 60 * 1000
  const bucket = new Map()
  for (const r of rows) {
    const key = Math.floor(r.ts / bucketMs) * bucketMs
    let obj = bucket.get(key)
    if (!obj) { obj = { total:0, errors:0 }; bucket.set(key, obj) }
    obj.total += 1
    if (r.status >= 400) obj.errors += 1
  }
  const out = []
  const keys = Array.from(bucket.keys()).sort((a,b)=>a-b)
  for (const k of keys) {
    const o = bucket.get(k)
    const rate = o.total ? Math.round((o.errors / o.total) * 1000) / 10 : 0 // percentage with 0.1 precision
    out.push({ ts: k, total: o.total, errors: o.errors, rate })
  }
  return out
}

// Query request volume series
function getRequestSeries({ endpoint, hours = 24, bucketMinutes = 60 }) {
  const toTs = Date.now()
  const fromTs = toTs - Number(hours) * 60 * 60 * 1000
  if (PERSIST_DISABLED || !db) return []
  const rows = db.prepare(`SELECT ts FROM requests WHERE endpoint = ? AND ts BETWEEN ? AND ? ORDER BY ts ASC`).all(endpoint, fromTs, toTs)
  const bucketMs = Number(bucketMinutes) * 60 * 1000
  const counts = new Map()
  for (const r of rows) {
    const key = Math.floor(r.ts / bucketMs) * bucketMs
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const out = []
  const keys = Array.from(counts.keys()).sort((a,b)=>a-b)
  for (const k of keys) out.push({ ts: k, count: counts.get(k) })
  return out
}

function initPersistenceApi(app) {
  app.get('/api/series/latency', (req, res) => {
    const endpoint = req.query.endpoint
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' })
    const hours = Number(req.query.range || 24)
    const bucketMinutes = Number(req.query.bucket || 60)
    try {
      const data = getLatencySeries({ endpoint, hours, bucketMinutes })
      res.json({ endpoint, hours, bucketMinutes, data })
    } catch (e) {
      res.status(500).json({ error: 'failed to query latency series' })
    }
  })

  app.get('/api/series/error-rate', (req, res) => {
    const endpoint = req.query.endpoint
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' })
    const hours = Number(req.query.range || 24)
    const bucketMinutes = Number(req.query.bucket || 60)
    try {
      const data = getErrorRateSeries({ endpoint, hours, bucketMinutes })
      res.json({ endpoint, hours, bucketMinutes, data })
    } catch (e) {
      res.status(500).json({ error: 'failed to query error-rate series' })
    }
  })

  app.get('/api/series/requests', (req, res) => {
    const endpoint = req.query.endpoint
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' })
    const hours = Number(req.query.range || 24)
    const bucketMinutes = Number(req.query.bucket || 60)
    try {
      const data = getRequestSeries({ endpoint, hours, bucketMinutes })
      res.json({ endpoint, hours, bucketMinutes, data })
    } catch (e) {
      res.status(500).json({ error: 'failed to query request series' })
    }
  })

  // SLO summary across a window for a single endpoint
  // /api/slo/summary?endpoint=/api/users&hours=24&availabilityTarget=99.9&latencyP95TargetMs=400
  app.get('/api/slo/summary', (req, res) => {
    const endpoint = req.query.endpoint
    if (!endpoint) return res.status(400).json({ error: 'endpoint is required' })
    const hours = Number(req.query.hours || 24)
    const availabilityTarget = Number(req.query.availabilityTarget || 99.9)
    const latencyP95TargetMs = Number(req.query.latencyP95TargetMs || 400)

    try {
      if (PERSIST_DISABLED || !db) return res.json({ endpoint, windowHours: hours, totals: { total: 0, errors: 0 }, availability: 100, availabilityTarget, errorBudgetRemaining: availabilityTarget, errorBudgetUsedPct: 0, latency: { p95: 0, p99: 0, targetP95: latencyP95TargetMs, compliant: true } })
      const toTs = Date.now()
      const fromTs = toTs - hours * 60 * 60 * 1000
      const rows = db.prepare(`SELECT status, duration_ms FROM requests WHERE endpoint = ? AND ts BETWEEN ? AND ?`).all(endpoint, fromTs, toTs)
      const total = rows.length
      const errors = rows.filter(r => r.status >= 400).length
      const availability = total ? (1 - errors / total) * 100 : 100
      const durations = rows.map(r => r.duration_ms).sort((a,b)=>a-b)
      const p95 = percentile(durations, 95)
      const p99 = percentile(durations, 99)
      const latencyOk = p95 <= latencyP95TargetMs

      // Error budget (simple): budget = target - (100 - availability)
      const consumed = Math.max(0, 100 - availability)
      const budget = Math.max(0, availabilityTarget - consumed)
      const budgetUsedPct = availabilityTarget > 0 ? Math.min(100, (consumed / availabilityTarget) * 100) : 0

      res.json({
        endpoint,
        windowHours: hours,
        totals: { total, errors },
        availability: Number(availability.toFixed(3)),
        availabilityTarget,
        errorBudgetRemaining: Number(budget.toFixed(3)),
        errorBudgetUsedPct: Number(budgetUsedPct.toFixed(2)),
        latency: { p95, p99, targetP95: latencyP95TargetMs, compliant: latencyOk }
      })
    } catch (e) {
      res.status(500).json({ error: 'failed to compute SLO summary' })
    }
  })

  // Incidents timeline (alerts + service checks summarized)
  // /api/incidents?hours=24&limit=200
  app.get('/api/incidents', (req, res) => {
    const hours = Number(req.query.hours || 24)
    const limit = Number(req.query.limit || 200)
    try {
      const toTs = Date.now()
      const fromTs = toTs - hours * 60 * 60 * 1000
      const alertRows = db.prepare(`SELECT id, type, service, message, details, status, ts FROM alerts WHERE ts BETWEEN ? AND ? ORDER BY ts DESC LIMIT ?`).all(fromTs, toTs, limit)
      const checkRows = db.prepare(`SELECT service, status, response_ms, ts FROM service_checks WHERE ts BETWEEN ? AND ? ORDER BY ts DESC LIMIT ?`).all(fromTs, toTs, limit)
      const items = []
      for (const a of alertRows) {
        items.push({ kind: 'alert', id: a.id, service: a.service, severity: a.type, message: a.message, details: a.details, status: a.status, ts: a.ts })
      }
      for (const c of checkRows) {
        items.push({ kind: 'service_check', id: `${c.service}-${c.ts}`, service: c.service, status: c.status, response_ms: c.response_ms, ts: c.ts })
      }
      items.sort((x,y)=>y.ts-x.ts)
      res.json({ hours, count: items.length, items: items.slice(0, limit) })
    } catch (e) {
      res.status(500).json({ error: 'failed to query incidents' })
    }
  })

  // Error snapshots API
  app.get('/api/errors/snapshots', (req, res) => {
    try {
      if (PERSIST_DISABLED || !db) {
        const hours = Number(req.query.hours || 24)
        const toTs = Date.now()
        const fromTs = toTs - hours * 60 * 60 * 1000
        const items = memSnapshots.filter(s => s.ts >= fromTs && s.ts <= toTs).map(s => ({ id: s.id, source: s.source, endpoint: s.endpoint, method: s.method, status: s.status, traceId: s.traceId, ts: s.ts }))
        return res.json({ items, count: items.length })
      }
      const hours = Number(req.query.hours || 24)
      const limit = Number(req.query.limit || 100)
      const toTs = Date.now()
      const fromTs = toTs - hours * 60 * 60 * 1000
      const rows = db.prepare(`SELECT id, source, endpoint, method, status, trace_id as traceId, ts FROM error_snapshots WHERE ts BETWEEN ? AND ? ORDER BY ts DESC LIMIT ?`).all(fromTs, toTs, limit)
      res.json({ items: rows, count: rows.length })
    } catch (e) {
      res.status(500).json({ error: 'failed to query error snapshots' })
    }
  })

  app.get('/api/errors/snapshots/:id', (req, res) => {
    try {
      if (PERSIST_DISABLED || !db) {
        const row = memSnapshots.find(s => String(s.id) === String(req.params.id))
        if (!row) return res.status(404).json({ error: 'not found' })
        return res.json({
          id: row.id,
          source: row.source,
          endpoint: row.endpoint,
          method: row.method,
          status: row.status,
          request_headers: row.request_headers,
          request_body: row.request_body,
          response_snippet: row.response_snippet,
          traceId: row.traceId,
          ts: row.ts,
        })
      }
      const row = db.prepare(`SELECT id, source, endpoint, method, status, request_headers, request_body, response_snippet, trace_id as traceId, ts FROM error_snapshots WHERE id = ?`).get(req.params.id)
      if (!row) return res.status(404).json({ error: 'not found' })
      // parse JSON fields
      try { row.request_headers = JSON.parse(row.request_headers || '{}') } catch {}
      try { row.request_body = JSON.parse(row.request_body || 'null') } catch {}
      res.json(row)
    } catch (e) {
      res.status(500).json({ error: 'failed to fetch snapshot' })
    }
  })

  app.get('/api/errors/snapshots/:id/curl', (req, res) => {
    try {
      if (PERSIST_DISABLED || !db) {
        const row = memSnapshots.find(s => String(s.id) === String(req.params.id))
        if (!row) return res.status(404).json({ error: 'not found' })
        const headers = row.request_headers || {}
        const headerFlags = Object.entries(headers).map(([k,v]) => `-H ${JSON.stringify(`${k}: ${v}`)}`).join(' ')
        let bodyFlag = ''
        if (row.request_body && row.request_body !== 'null') {
          bodyFlag = `--data ${JSON.stringify(row.request_body)}`
        }
        const cmd = `curl -i -X ${row.method || 'GET'} ${headerFlags} ${bodyFlag} ${JSON.stringify(row.endpoint)}`.trim()
        return res.type('text/plain').send(cmd)
      }
      const row = db.prepare(`SELECT endpoint, method, request_headers, request_body FROM error_snapshots WHERE id = ?`).get(req.params.id)
      if (!row) return res.status(404).json({ error: 'not found' })
      let headers = {}
      try { headers = JSON.parse(row.request_headers || '{}') } catch {}
      const headerFlags = Object.entries(headers).map(([k,v]) => `-H ${JSON.stringify(`${k}: ${v}`)}`).join(' ')
      let bodyFlag = ''
      if (row.request_body && row.request_body !== 'null') {
        bodyFlag = `--data ${JSON.stringify(row.request_body)}`
      }
      const cmd = `curl -i -X ${row.method || 'GET'} ${headerFlags} ${bodyFlag} ${JSON.stringify(row.endpoint)}`.trim()
      res.type('text/plain').send(cmd)
    } catch (e) {
      res.status(500).json({ error: 'failed to generate curl' })
    }
  })
}

module.exports = { initPersistenceApi, getLatencySeries, getErrorRateSeries, getRequestSeries }
