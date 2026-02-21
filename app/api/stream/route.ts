export const dynamic = "force-dynamic"

function normalizeBase(value: string) {
  return value.replace(/\/+$/g, "")
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
    const target = `${normalizeBase(backend)}/api/stream`
    const res = await fetch(target, { cache: "no-store" })
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
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
