import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export function getDataSourceMode(): "live" | "mock" {
  // 1. Check global settings first
  if ((global as any)._settings?.dataSource) {
    return (global as any)._settings.dataSource
  }
  // 2. Read server/settings.json
  try {
    const settingsPath = path.join(process.cwd(), "server", "settings.json")
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, "utf-8")
      const json = JSON.parse(raw)
      if (json.dataSource) {
        return json.dataSource
      }
    }
  } catch (e) {
    // ignore
  }
  return "live"
}

let cachedBackendToken: string | null = null
let cachedBackendTokenAtMs = 0
let lastBackendAuthError: any = null

async function getBackendToken(base: string) {
  const explicit = process.env.BACKEND_TOKEN
  if (explicit && explicit.trim().length > 0) {
    lastBackendAuthError = null
    return explicit.trim()
  }

  const username = process.env.BACKEND_USERNAME || "admin"
  const password = process.env.BACKEND_PASSWORD || "admin123"
  
  const now = Date.now()
  if (cachedBackendToken && now - cachedBackendTokenAtMs < 20 * 60 * 1000) {
    return cachedBackendToken
  }

  let res: Response
  try {
    res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    })
  } catch (e: any) {
    lastBackendAuthError = {
      reason: "login_request_failed",
      message: String(e?.message || e),
    }
    return null
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    lastBackendAuthError = {
      reason: "login_failed",
      status: res.status,
      bodySnippet: text.slice(0, 500),
    }
    return null
  }

  const json = await res.json().catch(() => null)
  const token = json?.token
  if (typeof token !== "string" || token.length === 0) {
    lastBackendAuthError = {
      reason: "login_missing_token",
      status: res.status,
      bodySnippet: JSON.stringify(json)?.slice(0, 500),
    }
    return null
  }

  cachedBackendToken = token
  cachedBackendTokenAtMs = now
  lastBackendAuthError = null
  return token
}

export async function proxyRequest(request: Request, pathAndQuery: string) {
  const mode = getDataSourceMode()
  if (mode === "mock") return null

  const backend = process.env.BACKEND_URL
  if (!backend || backend.trim().length === 0) return null

  const base = backend.replace(/\/+$/g, "")
  const target = `${base}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`

  const token = await getBackendToken(base)
  const headers: Record<string, string> = {}
  
  // Pass authorization token if acquired
  if (token) {
    headers.authorization = `Bearer ${token}`
  }

  // Copy relevant headers from client request
  const requestContentType = request.headers.get("content-type")
  if (requestContentType) {
    headers["content-type"] = requestContentType
  }

  const method = request.method
  let body: any = undefined
  
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    try {
      body = await request.text()
    } catch (_) {}
  }

  try {
    const res = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
    })

    const bodyBuffer = await res.arrayBuffer()
    return new Response(bodyBuffer, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
        "content-disposition": res.headers.get("content-disposition") || "",
        "cache-control": "no-store",
      },
    })
  } catch (error: any) {
    console.error(`Proxy failure on ${target}:`, error)
    return new Response(
      JSON.stringify({
        error: "Proxy endpoint error",
        message: error.message || String(error),
        backendUrl: target,
      }),
      {
        status: 502,
        headers: { "content-type": "application/json" },
      }
    )
  }
}
