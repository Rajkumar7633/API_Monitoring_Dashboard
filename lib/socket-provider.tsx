"use client"

import type React from "react"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import type {
  ApiStats,
  ApiEndpoint,
  ApiLog,
  Alert,
  ResourceMetrics,
  DatabaseMetrics,
  ServiceHealth,
} from "@/types/api-types"
// Real-time only: no mock data fallback

interface SocketContextType {
  isConnected: boolean
  data: {
    stats: ApiStats
    endpoints: ApiEndpoint[]
    logs: ApiLog[]
    alerts: Alert[]
    resourceMetrics: ResourceMetrics
    databaseMetrics: DatabaseMetrics
    serviceHealth: ServiceHealth[]
  } | null
  refreshData: () => void
}

const SocketContext = createContext<SocketContextType>({
  isConnected: false,
  data: null,
  refreshData: () => {},
})

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [data, setData] = useState<SocketContextType["data"]>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  const defaultData = (): SocketContextType["data"] => ({
    stats: { totalRequests: 0, requestsChange: 0, errorRate: 0, errorRateChange: 0, avgResponseTime: 0, responseTimeChange: 0, uptime: 0 },
    endpoints: [],
    logs: [],
    alerts: [],
    resourceMetrics: { cpu: { current: 0, peak: 0, average: 0, cores: 0 }, memory: { total: 0, used: 0, free: 0, usedPercentage: 0 } },
    databaseMetrics: { queries: { total: 0, slow: 0, average: 0 }, connections: { active: 0, idle: 0, max: 0, usedPercentage: 0 }, slowQueries: [] },
    serviceHealth: [],
  })

  // Function to attempt connection to the server
  const connectToServer = async () => {
    try {
      // Try to connect to the server
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Short timeout to prevent long waiting
        signal: AbortSignal.timeout(2000),
      })

      if (response.ok) {
        setIsConnected(true)
        fetchServerData()
      } else {
        setIsConnected(false)
        setData(null)
      }
    } catch (error) {
      console.log("Server connection error:", error)
      setIsConnected(false)
      setData(null)
    }
  }

  // Subscribe to SSE stream for realtime updates
  const subscribeToStream = () => {
    // Close previous if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    const es = new EventSource(`${base}/api/stream`)
    eventSourceRef.current = es

    es.addEventListener("connected", () => {
      // no-op, just confirms connection
    })

    es.addEventListener("metrics:stats", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data)
        setData((prev) => ({
          ...(prev || defaultData()),
          stats: payload.stats || prev?.stats || defaultData()!.stats,
        }))
      } catch {}
    })

    es.addEventListener("metrics:api", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data)
        // Could update endpoint-specific metrics by refetching periodically or maintaining client aggregation
        // For now, trigger a light refresh occasionally
      } catch {}
    })

    es.addEventListener("metrics:endpoint", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data)
        const ep = payload.endpoint
        if (!ep || !ep.name) return
        setData((prev) => {
          const base = prev || defaultData()
          const list = [...(base.endpoints || [])]
          const idx = list.findIndex((e: any) => e.name === ep.name)
          if (idx >= 0) list[idx] = { ...list[idx], ...ep }
          else list.push(ep)
          return { ...base, endpoints: list }
        })
      } catch {}
    })

    es.addEventListener("metrics:db", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data)
        setData((prev) => ({
          ...(prev || defaultData()),
          databaseMetrics: payload.databaseMetrics || prev?.databaseMetrics || defaultData()!.databaseMetrics,
        }))
      } catch {}
    })

    es.addEventListener("metrics:resources", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data)
        setData((prev) => ({
          ...(prev || defaultData()),
          resourceMetrics: payload.resourceMetrics || prev?.resourceMetrics || defaultData()!.resourceMetrics,
        }))
      } catch {}
    })

    es.addEventListener("metrics:alert", (evt) => {
      try {
        const incoming = JSON.parse((evt as MessageEvent).data)
        setData((prev) => {
          const base = prev || defaultData()
          const list = [...(base.alerts || [])]
          const idx = list.findIndex((a: any) => String(a.id) === String(incoming.id))
          if (idx >= 0) list[idx] = { ...list[idx], ...incoming }
          else list.unshift(incoming)
          return { ...base, alerts: list.slice(0, 100) }
        })
      } catch {}
    })

    es.addEventListener("metrics:log", (evt) => {
      try {
        const incoming = JSON.parse((evt as MessageEvent).data)
        setData((prev) => {
          const base = prev || defaultData()
          const list = [...(base.logs || [])]
          const idx = list.findIndex((l: any) => String(l.id) === String(incoming.id))
          if (idx >= 0) list[idx] = { ...list[idx], ...incoming }
          else list.unshift(incoming)
          return { ...base, logs: list.slice(0, 1000) }
        })
      } catch {}
    })

    es.addEventListener("metrics:service", (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data)
        const svc = payload.service
        setData((prev) => {
          const base = prev || defaultData()
          const list = [...(base.serviceHealth || [])]
          const idx = list.findIndex((s: any) => s.name === svc.name)
          if (idx >= 0) list[idx] = svc
          else list.push(svc)
          return { ...base, serviceHealth: list }
        })
      } catch {}
    })

    es.onerror = () => {
      // auto-reconnect: close and retry later
      es.close()
      eventSourceRef.current = null
      setTimeout(() => {
        if (isConnected) subscribeToStream()
      }, 5000)
    }
  }

  // Function to fetch data from the server
  const fetchServerData = async () => {
    try {
      // Bootstrap snapshot; realtime updates come via SSE
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/dashboard-data`)

      if (response.ok) {
        const serverData = await response.json()
        setData(serverData)
      } else {
        throw new Error("Failed to fetch data from server")
      }
    } catch (error) {
      console.error("Error fetching data from server:", error)
      // keep existing data; do not use static fallback
    }
  }

  // Function to refresh data
  const refreshData = () => {
    if (isConnected) {
      fetchServerData()
    }
  }

  // Initial connection attempt
  useEffect(() => {
    connectToServer()

    // Set up periodic refresh
    const intervalId = setInterval(() => {
      // light periodic sync in case some aggregates aren't pushed
      if (isConnected) fetchServerData()
    }, 30000)

    return () => {
      clearInterval(intervalId)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  // When connection is established, subscribe to SSE
  useEffect(() => {
    if (isConnected) {
      subscribeToStream()
    }
    // Cleanup handled in unmount
  }, [isConnected])

  return <SocketContext.Provider value={{ isConnected, data, refreshData }}>{children}</SocketContext.Provider>
}

export const useSocket = () => useContext(SocketContext)

