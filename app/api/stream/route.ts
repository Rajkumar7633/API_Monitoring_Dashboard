export const dynamic = "force-dynamic"

function normalizeBase(value: string) {
  return value.replace(/\/+$/g, "")
}

let cachedBackendToken: string | null = null
let cachedBackendTokenAtMs = 0

async function getBackendToken(base: string) {
  const explicit = process.env.BACKEND_TOKEN
  if (explicit && explicit.trim().length > 0) return explicit.trim()

  const username = process.env.BACKEND_USERNAME
  const password = process.env.BACKEND_PASSWORD
  if (!username || !password) return null

  const now = Date.now()
  if (cachedBackendToken && now - cachedBackendTokenAtMs < 20 * 60 * 1000) {
    return cachedBackendToken
  }

  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  })

  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  const token = json?.token
  if (typeof token !== "string" || token.length === 0) return null

  cachedBackendToken = token
  cachedBackendTokenAtMs = now
  return token
}

function sseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

async function getDashboardSnapshot(origin: string) {
  const url = new URL("/api/dashboard-data", origin)
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`dashboard-data fetch failed: ${res.status}`)
  return res.json()
}

export async function GET(request: Request) {
  const backend = process.env.BACKEND_URL
  if (backend && backend.trim().length > 0) {
    const base = normalizeBase(backend)
    const token = await getBackendToken(base)
    if (!token) {
      // fall back to local SSE
    } else {
      const headers: Record<string, string> = {}
      if (token) headers.authorization = `Bearer ${token}`

      const target = `${base}/api/stream`
      let res = await fetch(target, { cache: "no-store", headers })
      if (res.status === 401 && token && !process.env.BACKEND_TOKEN) {
        cachedBackendToken = null
        cachedBackendTokenAtMs = 0
        const refreshed = await getBackendToken(base)
        const retryHeaders: Record<string, string> = {}
        if (refreshed) retryHeaders.authorization = `Bearer ${refreshed}`
        res = await fetch(target, { cache: "no-store", headers: retryHeaders })
      }

      if (res.status !== 401 && res.status !== 403) {
        return new Response(res.body, {
          status: res.status,
          headers: {
            "Content-Type": res.headers.get("content-type") || "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        })
      }
    }
  }

  const origin = new URL(request.url).origin

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const send = (chunk: string) => controller.enqueue(encoder.encode(chunk))

      send(sseEvent("connected", { ok: true, timestamp: new Date().toISOString() }))

      const tick = async () => {
        try {
          const snap = await getDashboardSnapshot(origin)
          send(sseEvent("metrics:stats", { stats: snap.stats }))
          send(sseEvent("metrics:resources", { resourceMetrics: snap.resourceMetrics }))
          send(sseEvent("metrics:db", { databaseMetrics: snap.databaseMetrics }))

          for (const a of snap.alerts || []) {
            send(sseEvent("metrics:alert", a))
          }
          for (const l of snap.logs || []) {
            send(sseEvent("metrics:log", l))
          }
          for (const s of snap.serviceHealth || []) {
            send(sseEvent("metrics:service", { service: s }))
          }
          for (const ep of snap.endpoints || []) {
            send(sseEvent("metrics:endpoint", { endpoint: ep }))
          }
        } catch {
          // ignore per-tick errors
        }
      }

      await tick()
      const interval = setInterval(tick, 5000)

      // @ts-expect-error Node typings
      controller._interval = interval
    },
    cancel() {
      // @ts-expect-error Node typings
      if (this._interval) clearInterval(this._interval)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
