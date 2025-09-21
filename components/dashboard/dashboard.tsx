"use client"

import { useState, useEffect, useMemo } from "react"
import { AlertTriangle, Bell, Calendar, Clock, Menu, Search, X } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent } from "@/components/ui/card"

import { FilterBar } from "@/components/dashboard/filter-bar"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ResponseTimeChart } from "@/components/dashboard/response-time-chart"
import { RequestsChart } from "@/components/dashboard/requests-chart"
import { SystemResources } from "@/components/dashboard/system-resources"
import { LatencyHeatmap } from "@/components/dashboard/latency-heatmap"
import { SloSummary } from "@/components/dashboard/slo-summary"
import { ErrorLogs } from "@/components/dashboard/error-logs"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { useSocket } from "@/lib/socket-provider"

export default function Dashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("all")
  const [timeRange, setTimeRange] = useState<string>("24h")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { data, isConnected, refreshData } = useSocket()

  const alertSummary = useMemo(() => {
    const list = data?.alerts || []
    const all = list.length
    const active = list.filter((a:any) => a.status === 'active').length
    const acknowledged = list.filter((a:any) => a.status === 'acknowledged').length
    const resolved = list.filter((a:any) => a.status === 'resolved').length
    const solvedRate = all ? Math.round((resolved / all) * 100) : 0
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const parseTs = (s?:string|null) => (s ? new Date(s).getTime() : NaN)
    const ackSamples = list.filter((a:any)=> a.acknowledgedAt && a.createdAt)
      .map((a:any)=> parseTs(a.acknowledgedAt) - parseTs(a.createdAt))
      .filter((d:number)=> isFinite(d) && d>=0)
    const mttaMs = ackSamples.length ? Math.round(ackSamples.reduce((x:number,y:number)=>x+y,0) / ackSamples.length) : 0
    const resSamples = list.filter((a:any)=> a.resolvedAt && a.createdAt)
      .map((a:any)=> parseTs(a.resolvedAt) - parseTs(a.createdAt))
      .filter((d:number)=> isFinite(d) && d>=0)
    const mttrMs = resSamples.length ? Math.round(resSamples.reduce((x:number,y:number)=>x+y,0) / resSamples.length) : 0
    const activeDelta1h = list.filter((a:any)=> parseTs(a.createdAt) >= oneHourAgo).length
    const resolvedDelta1h = list.filter((a:any)=> parseTs(a.resolvedAt) >= oneHourAgo).length
    return { all, active, acknowledged, resolved, solvedRate, mttaMs, mttrMs, activeDelta1h, resolvedDelta1h }
  }, [data?.alerts])

  const fmtDuration = (ms:number) => {
    if (!ms || !isFinite(ms)) return '—'
    if (ms < 1000) return `${ms} ms`
    const s = Math.round(ms/1000)
    if (s < 60) return `${s}s`
    const m = Math.floor(s/60); const rs = s%60
    if (m < 60) return `${m}m ${rs}s`
    const h = Math.floor(m/60); const rm = m%60
    return `${h}h ${rm}m`
  }

  // Set loading state based on data availability
  useEffect(() => {
    if (data) {
      setLoading(false)
    } else {
      // Add a timeout to stop loading after 2 seconds to prevent infinite loading
      const timer = setTimeout(() => {
        setLoading(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [data])

  const handleRefresh = () => {
    setLoading(true)
    refreshData()
  }

  // Filter logs based on selected endpoint
  const filteredLogs =
    selectedEndpoint === "all"
      ? data?.logs || []
      : (data?.logs || []).filter((log) => log.endpoint === selectedEndpoint)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <DashboardSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="w-full bg-background pl-8 md:w-[240px] lg:w-[280px]"
                />
              </div>
            </form>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {date ? format(date, "MMM dd, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {data?.alerts && data.alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                      {data.alerts.length > 99 ? "99+" : data.alerts.length}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[380px]">
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <h4 className="font-medium">Notifications</h4>
                  <Button variant="ghost" size="sm">
                    Mark all as read
                  </Button>
                </div>
                <div className="max-h-[300px] overflow-auto">
                  {data?.alerts?.slice(0, 10).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 border-b p-4">
                      <div
                        className={`mt-0.5 rounded-full p-1 ${
                          alert.type === "error"
                            ? "bg-destructive/20 text-destructive"
                            : alert.type === "warning"
                              ? "bg-warning/20 text-warning"
                              : "bg-primary/20 text-primary"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        {alert.details && <p className="text-xs text-muted-foreground">{alert.details}</p>}
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {alert.time}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">API Performance Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor your API performance, errors, and system resources in real-time.
                {isConnected && <span className="ml-2 text-green-500">(Connected)</span>}
              </p>
            </div>

            {/* Filters */}
            <FilterBar
              selectedEndpoint={selectedEndpoint}
              setSelectedEndpoint={setSelectedEndpoint}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              onRefresh={handleRefresh}
              loading={loading}
            />

            {/* Stats Cards */}
            <StatsCards stats={data?.stats} loading={loading} />

            {/* Alerts Summary */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Alerts</div>
                    <div className="text-xl font-semibold">{alertSummary.all}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Active</div>
                    <div className="text-xl font-semibold">{alertSummary.active} {alertSummary.activeDelta1h ? <span className="text-xs text-muted-foreground">(+{alertSummary.activeDelta1h} 1h)</span> : null}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Acknowledged</div>
                    <div className="text-xl font-semibold">{alertSummary.acknowledged}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Resolved (Rate)</div>
                    <div className="text-xl font-semibold">{alertSummary.resolved} <span className="text-sm text-muted-foreground">({alertSummary.solvedRate}% solved)</span> {alertSummary.resolvedDelta1h ? <span className="text-xs text-muted-foreground">(+{alertSummary.resolvedDelta1h} 1h)</span> : null}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">MTTA (avg acknowledge time)</div>
                    <div className="text-xl font-semibold">{fmtDuration(alertSummary.mttaMs)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">MTTR (avg resolve time)</div>
                    <div className="text-xl font-semibold">{fmtDuration(alertSummary.mttrMs)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Response Time Chart */}
              <ResponseTimeChart
                endpoints={data?.endpoints || []}
                selectedEndpoint={selectedEndpoint}
                loading={loading}
              />

              {/* API Requests Chart */}
              <RequestsChart endpoints={data?.endpoints || []} loading={loading} />
            </div>

            {/* Latency Heatmap */}
            <LatencyHeatmap endpoint={selectedEndpoint} />

            {/* SLO Summary */}
            <SloSummary endpoint={selectedEndpoint} />

            {/* System Resources */}
            <SystemResources metrics={data?.resourceMetrics} loading={loading} />

            {/* Error Logs */}
            <ErrorLogs logs={filteredLogs} loading={loading} />
          </div>
        </main>
      </div>
    </div>
  )
}

