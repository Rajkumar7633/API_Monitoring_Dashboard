const fs = require('fs')
const path = require('path')
const { runWithSpan, traceHeaders, getActiveTraceId } = require('./tracing')
const { eventBus } = require('./event-bus')

function readJsonSafe(p, fallback) {
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    return JSON.parse(raw)
  } catch (_) {
    return fallback
  }
}

function readSettings() {
  const settingsPath = path.join(__dirname, 'settings.json')
  const s = readJsonSafe(settingsPath, { apiKeys: { production: '', development: '' }, monitors: [] })
  if (!Array.isArray(s.monitors)) s.monitors = []
  if (!s.apiKeys) s.apiKeys = { production: '', development: '' }
  if (!s.alerts) s.alerts = { slackWebhookUrl: '', webhookUrl: '' }
  return s
}

function readMonitorsFallback() {
  const p = path.join(__dirname, 'monitors.json')
  const json = readJsonSafe(p, [])
  return Array.isArray(json) ? json : []
}

function createSynthetics(metricsCollector) {
  let timers = []
  let running = false
  let lastResult = []

  async function dispatchAlert(severity, title, message) {
    try {
      const settings = readSettings()
      const slack = settings?.alerts?.slackWebhookUrl
      const hook = settings?.alerts?.webhookUrl
      const payload = { text: `[*${severity.toUpperCase()}*] ${title} — ${message}` }
      if (slack) {
        try { await fetch(slack, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) } catch {}
      }
      if (hook) {
        try { await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'alert', severity, title, message, ts: Date.now() }) }) } catch {}
      }
    } catch {}
  }

  const runProbe = async (m, apiKeys) => {
    return runWithSpan('synthetics.probe', async () => {
    const start = Date.now()
    let ok = false
    let status = 0
    let error = null
    let bodySnippet = ''
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), Math.max(1000, m.maxLatencyMs || 5000))
      const headers = { ...(m.headers || {}) }
      // attach trace headers if tracer is active
      Object.assign(headers, traceHeaders())
      // If header not provided, default x-api-key to production or development key
      if (!headers['x-api-key']) {
        const selected = m.useDevKey ? apiKeys?.development : apiKeys?.production
        if (selected) headers['x-api-key'] = selected
      }
      // If Authorization not provided and monitor has bearerToken, set Authorization: Bearer <token>
      if (!headers['authorization'] && m.bearerToken) {
        headers['authorization'] = `Bearer ${m.bearerToken}`
      }
      const method = (m.method || 'GET').toUpperCase()
      const fetchOpts = { method, headers, signal: controller.signal }
      if (method !== 'GET' && method !== 'HEAD' && m.body !== undefined) {
        let payload = m.body
        if (typeof payload !== 'string') {
          try { payload = JSON.stringify(payload) } catch {}
        }
        if (!headers['content-type']) headers['content-type'] = 'application/json'
        // @ts-ignore - add body field
        fetchOpts.body = payload
      }
      const res = await fetch(m.url, fetchOpts)
      clearTimeout(timeout)
      status = res.status
      ok = res.status === (m.expectedStatus || 200)
      if (ok && m.expectedBodyContains) {
        const reader = res.body?.getReader ? await res.body.getReader() : null
        if (reader) {
          const chunks = []
          let received = 0
          const limit = 64 * 1024
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (value) {
              chunks.push(value)
              received += value.length
              if (received >= limit) break
            }
          }
          const buf = Buffer.concat(chunks.map((u)=> Buffer.from(u)))
          bodySnippet = buf.toString('utf8')
        } else {
          // Fallback: try text() with catch
          try { bodySnippet = await res.text() } catch {}
        }
        if (!bodySnippet.includes(m.expectedBodyContains)) {
          ok = false
          error = `Body missing expected text: ${m.expectedBodyContains}`
        }
      }
    } catch (e) {
      error = String(e?.message || e)
    }
    const rt = Date.now() - start

    // Record as service health
    const svcName = m.name || m.url
    let classified = 'Healthy'
    if (!ok || rt > (m.maxLatencyMs || 5000)) classified = rt > (m.maxLatencyMs || 5000) ? 'Degraded' : 'Unhealthy'
    metricsCollector.recordServiceHealth(svcName, classified, rt)

    if (!ok) {
      const details = `Expected ${m.expectedStatus || 200}, got ${status}. ${error || ''}`
      metricsCollector.addAlert('error', `Synthetic failed: ${svcName}`, 'Synthetics', details)
      dispatchAlert('error', `Synthetic failed: ${svcName}`, details)
      // emit error snapshot for forensics
      try {
        eventBus.emit('errors:snapshot', {
          source: 'synthetics',
          endpoint: m.url,
          method: (m.method || 'GET').toUpperCase(),
          status,
          requestHeaders: fetchOpts.headers,
          requestBody: fetchOpts.body,
          responseSnippet: bodySnippet?.slice(0, 2048),
          traceId: getActiveTraceId(),
          ts: Date.now(),
        })
      } catch {}
    } else if (rt > (m.maxLatencyMs || 5000)) {
      const details = `Response ${rt}ms > ${m.maxLatencyMs}ms`
      metricsCollector.addAlert('warning', `Synthetic slow: ${svcName}`, 'Synthetics', details)
      dispatchAlert('warning', `Synthetic slow: ${svcName}`, details)
      // optional snapshot for slow responses
      try {
        eventBus.emit('errors:snapshot', {
          source: 'synthetics',
          endpoint: m.url,
          method: (m.method || 'GET').toUpperCase(),
          status,
          requestHeaders: fetchOpts.headers,
          requestBody: fetchOpts.body,
          responseSnippet: bodySnippet?.slice(0, 2048),
          traceId: getActiveTraceId(),
          ts: Date.now(),
        })
      } catch {}
    }

    return { name: svcName, url: m.url, ok, status, responseMs: rt, ts: Date.now(), error, bodyPreview: bodySnippet?.slice(0,256) }
    }, {
      'probe.name': m.name || m.url,
      'probe.url': m.url,
      'probe.method': (m.method || 'GET').toUpperCase(),
      'probe.expectedStatus': m.expectedStatus || 200,
    })
  }

  const runOnce = async () => {
    const settings = readSettings()
    let monitors = settings.monitors && settings.monitors.length ? settings.monitors : readMonitorsFallback()
    const results = []
    for (const m of monitors) {
      const r = await runProbe(m, settings.apiKeys)
      results.push(r)
    }
    lastResult = results
    return results
  }

  const start = () => {
    if (running) return { running }
    running = true
    const settings = readSettings()
    let monitors = settings.monitors && settings.monitors.length ? settings.monitors : readMonitorsFallback()
    const jitterPct = Math.min(0.9, Math.max(0, Number(settings?.synthetics?.jitterPct ?? 0.2)))
    const spreadStartMs = Math.max(0, Number(settings?.synthetics?.spreadStartMs ?? 2000))

    for (const m of monitors) {
      const baseInterval = Math.max(15000, m.intervalMs || 60000)
      const state = { failures: 0 }
      const effJitter = (typeof m.jitterPct === 'number' && !Number.isNaN(m.jitterPct)) ? Math.min(0.9, Math.max(0, m.jitterPct)) : jitterPct
      const backoffEnabled = !!m.backoff

      const scheduleNext = () => {
        if (!running) return
        const jitter = 1 + (Math.random() * 2 - 1) * effJitter
        const backoffFactor = backoffEnabled ? Math.min(5, Math.pow(2, state.failures)) : 1
        const delay = Math.max(1000, Math.round(baseInterval * jitter * backoffFactor))
        const t = setTimeout(async () => {
          try {
            const r = await runProbe(m, settings.apiKeys)
            if (r?.ok) state.failures = 0; else state.failures = Math.min(state.failures + 1, 5)
          } catch {
            state.failures = Math.min(state.failures + 1, 5)
          }
          scheduleNext()
        }, delay)
        timers.push(t)
      }

      const initialDelay = spreadStartMs ? Math.floor(Math.random() * spreadStartMs) : Math.floor(Math.random() * Math.min(baseInterval, 5000))
      const t0 = setTimeout(async () => {
        try {
          const r = await runProbe(m, settings.apiKeys)
          if (!r?.ok) state.failures = 1
        } catch { state.failures = 1 }
        scheduleNext()
      }, initialDelay)
      timers.push(t0)
    }
    return { running }
  }

  const stop = () => {
    for (const t of timers) clearTimeout(t)
    timers = []
    running = false
    return { running }
  }

  const status = () => ({ running, lastResult })

  // Run a single provided monitor definition once (used for Settings -> Test)
  const runSingle = async (monitor) => {
    const settings = readSettings()
    const result = await runProbe(monitor, settings.apiKeys)
    lastResult = [result, ...lastResult].slice(0, 20)
    return result
  }

  return { start, stop, status, runOnce, runSingle }
}

module.exports = { createSynthetics }
