"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { DatabaseMetricsPanel } from "@/components/dashboard/database-metrics"
import { useSocketEvent } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/lib/socket"

export default function DatabasesPage() {
  const dbMetrics = useSocketEvent<any>("databaseMetrics", null)
  const { isConnected, refreshData } = useSocket()

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Databases</h1>
          <p className="text-muted-foreground">Monitor and manage your database instances.</p>
          <div className="mt-2">
            <Button variant="outline" onClick={refreshData} disabled={!isConnected}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Database Performance Metrics (live) */}
        <DatabaseMetricsPanel />
        {/* Connection Summary (live) */}
        {dbMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Connection Summary</CardTitle>
              <CardDescription>Active, idle, and capacity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Active</div>
                  <div className="text-lg font-medium">{dbMetrics.connections?.active ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Idle</div>
                  <div className="text-lg font-medium">{dbMetrics.connections?.idle ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Max</div>
                  <div className="text-lg font-medium">{dbMetrics.connections?.max ?? 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}

