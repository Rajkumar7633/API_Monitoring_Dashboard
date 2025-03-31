"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type {
  ApiStats,
  ApiEndpoint,
  ApiLog,
  Alert,
  ResourceMetrics,
  DatabaseMetrics,
  ServiceHealth,
} from "@/types/api-types"
import { mockData } from "./mock-data"

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
        // If server is not available, use mock data
        setIsConnected(false)
        setData(mockData)
      }
    } catch (error) {
      console.log("Using mock data due to server connection error:", error)
      setIsConnected(false)
      setData(mockData)
    }
  }

  // Function to fetch data from the server
  const fetchServerData = async () => {
    try {
      // In a real implementation, this would use WebSockets or fetch from multiple endpoints
      // For simplicity, we'll fetch from a single endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/dashboard-data`)

      if (response.ok) {
        const serverData = await response.json()
        setData(serverData)
      } else {
        throw new Error("Failed to fetch data from server")
      }
    } catch (error) {
      console.error("Error fetching data from server:", error)
      // Fallback to mock data if server fetch fails
      setData(mockData)
    }
  }

  // Function to refresh data
  const refreshData = () => {
    if (isConnected) {
      fetchServerData()
    } else {
      // If not connected, just update the mock data slightly to simulate refresh
      setData({
        ...mockData,
        stats: {
          ...mockData.stats,
          totalRequests: mockData.stats.totalRequests + Math.floor(Math.random() * 100),
          avgResponseTime: mockData.stats.avgResponseTime + Math.floor(Math.random() * 10 - 5),
        },
      })
    }
  }

  // Initial connection attempt
  useEffect(() => {
    connectToServer()

    // Set up periodic refresh
    const intervalId = setInterval(() => {
      refreshData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(intervalId)
  }, [])

  return <SocketContext.Provider value={{ isConnected, data, refreshData }}>{children}</SocketContext.Provider>
}

export const useSocket = () => useContext(SocketContext)

