// Optional OpenTelemetry tracing bootstrap (safe no-op if deps not installed)
// Exposes startTracing, runWithSpan, and traceHeaders helpers.

let otel = null
let sdk = null

function safeRequire(name) {
  try { return require(name) } catch { return null }
}

function startTracing(options = {}) {
  // Attempt to start OTEL SDK if available
  const {
    serviceName = 'api-monitor',
    otlpEndpoint,
  } = options

  const { readSettings } = (() => {
    try { return require('./index.js') } catch { return {} }
  })()

  // Resolve OTLP endpoint from options -> settings -> env -> default
  let endpoint = otlpEndpoint
  try {
    const settings = typeof readSettings === 'function' ? readSettings() : {}
    endpoint = endpoint || settings?.tracing?.otlpEndpoint
  } catch {}
  endpoint = endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'

  const { Resource } = safeRequire('@opentelemetry/resources') || {}
  const { SemanticResourceAttributes } = safeRequire('@opentelemetry/semantic-conventions') || {}
  const { NodeSDK } = safeRequire('@opentelemetry/sdk-node') || {}
  const { getNodeAutoInstrumentations } = safeRequire('@opentelemetry/auto-instrumentations-node') || {}
  const { OTLPTraceExporter } = safeRequire('@opentelemetry/exporter-trace-otlp-http') || {}

  if (!NodeSDK || !OTLPTraceExporter) {
    console.warn('[tracing] OpenTelemetry not installed; continuing with no-op tracing')
    return { started: false }
  }

  const exporter = new OTLPTraceExporter({
    // Accepts collector at /v1/traces
    url: endpoint.replace(/\/$/, '') + '/v1/traces',
    concurrencyLimit: 10,
  })

  const resource = Resource && SemanticResourceAttributes ?
    new Resource({ [SemanticResourceAttributes.SERVICE_NAME]: serviceName }) : undefined

  sdk = new NodeSDK({
    traceExporter: exporter,
    resource,
    instrumentations: typeof getNodeAutoInstrumentations === 'function' ? [getNodeAutoInstrumentations()] : [],
  })

  sdk.start().then(() => {
    console.log('[tracing] OpenTelemetry started (OTLP:', endpoint, ')')
  }).catch((e) => {
    console.warn('[tracing] failed to start OpenTelemetry:', e?.message || e)
  })

  return { started: true }
}

function getApi() {
  if (!otel) otel = safeRequire('@opentelemetry/api')
  return otel
}

function runWithSpan(name, fn, attributes = {}) {
  const api = getApi()
  const tracer = api?.trace?.getTracer ? api.trace.getTracer('api-monitor') : null
  if (!tracer) {
    // no-op execution
    return fn()
  }
  return api.context.with(api.context.active(), () => {
    return tracer.startActiveSpan(name, (span) => {
      try {
        if (attributes && typeof span.setAttributes === 'function') {
          span.setAttributes(attributes)
        }
        const ret = fn()
        if (ret && typeof ret.then === 'function') {
          return ret.then((val) => { span.end(); return val })
                   .catch((err) => { span.recordException(err); span.setStatus({ code: 2 }); span.end(); throw err })
        }
        span.end()
        return ret
      } catch (e) {
        try { span.recordException(e); span.setStatus({ code: 2 }) } catch {}
        span.end()
        throw e
      }
    })
  })
}

function traceHeaders() {
  const api = getApi()
  if (!api?.trace?.getSpan || !api?.context) return {}
  try {
    const span = api.trace.getSpan(api.context.active())
    if (!span) return {}
    const ctx = span.spanContext()
    if (!ctx) return {}
    // W3C traceparent header
    const version = '00'
    const traceparent = `${version}-${ctx.traceId}-${ctx.spanId}-${ctx.traceFlags.toString(16).padStart(2,'0')}`
    return { 'traceparent': traceparent }
  } catch {
    return {}
  }
}

function getActiveTraceId() {
  const api = getApi()
  try {
    const span = api?.trace?.getSpan ? api.trace.getSpan(api.context.active()) : null
    return span ? span.spanContext().traceId : null
  } catch { return null }
}

module.exports = { startTracing, runWithSpan, traceHeaders, getActiveTraceId }
