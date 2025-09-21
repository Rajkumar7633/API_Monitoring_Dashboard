"use client"
import { useMemo } from "react"
import { useSocket as useCtxSocket } from "@/lib/socket-provider"

// Real implementations that read from SocketProvider context
export const useSocket = () => {
  const { isConnected, refreshData } = useCtxSocket()
  return { socket: null, isConnected, refreshData }
}

export const useSocketEvent = <T,>(event: string, initialData: T) => {
  const { data } = useCtxSocket()
  return useMemo(() => {
    if (!data) return initialData
    switch (event) {
      case "apiStats":
        return (data.stats as unknown as T) ?? initialData
      case "endpoints":
        return (data.endpoints as unknown as T) ?? initialData
      case "logs":
        return (data.logs as unknown as T) ?? initialData
      case "alerts":
        return (data.alerts as unknown as T) ?? initialData
      case "resourceMetrics":
        return (data.resourceMetrics as unknown as T) ?? initialData
      case "databaseMetrics":
        return (data.databaseMetrics as unknown as T) ?? initialData
      case "serviceHealth":
        return (data.serviceHealth as unknown as T) ?? initialData
      default:
        return initialData
    }
  }, [data, event, initialData])
}

