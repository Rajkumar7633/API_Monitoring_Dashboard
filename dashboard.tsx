"use client"

import { useState } from "react"
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  Clock,
  CpuIcon,
  Database,
  Filter,
  HardDrive,
  Home,
  Layers,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  ChartContainer,
  ChartGrid,
  ChartLine,
  ChartTooltip,
  ChartXAxis,
  ChartYAxis,
  ChartBar,
} from "@/components/ui/chart"

export default function Dashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Mock data for charts
  const responseTimeData = [
    { time: "00:00", value: 120 },
    { time: "02:00", value: 90 },
    { time: "04:00", value: 170 },
    { time: "06:00", value: 130 },
    { time: "08:00", value: 220 },
    { time: "10:00", value: 90 },
    { time: "12:00", value: 140 },
    { time: "14:00", value: 180 },
    { time: "16:00", value: 250 },
    { time: "18:00", value: 160 },
    { time: "20:00", value: 110 },
    { time: "22:00", value: 80 },
  ]

  const apiRequestsData = [
    { name: "/api/users", requests: 1200, errors: 23 },
    { name: "/api/products", requests: 890, errors: 12 },
    { name: "/api/orders", requests: 760, errors: 8 },
    { name: "/api/auth", requests: 1500, errors: 35 },
    { name: "/api/payments", requests: 450, errors: 5 },
  ]

  const failureLogs = [
    { id: 1, endpoint: "/api/users", status: 500, message: "Internal Server Error", timestamp: "2023-06-15T14:32:21" },
    { id: 2, endpoint: "/api/auth", status: 401, message: "Unauthorized Access", timestamp: "2023-06-15T14:28:10" },
    { id: 3, endpoint: "/api/products", status: 404, message: "Resource Not Found", timestamp: "2023-06-15T14:15:45" },
    { id: 4, endpoint: "/api/auth", status: 429, message: "Too Many Requests", timestamp: "2023-06-15T14:10:33" },
    { id: 5, endpoint: "/api/orders", status: 503, message: "Service Unavailable", timestamp: "2023-06-15T13:58:22" },
  ]

  const alerts = [
    { id: 1, type: "error", message: "High error rate on /api/auth endpoint", time: "2 minutes ago" },
    { id: 2, type: "warning", message: "CPU usage above 80% threshold", time: "15 minutes ago" },
    { id: 3, type: "error", message: "Database connection failures detected", time: "32 minutes ago" },
    { id: 4, type: "warning", message: "Memory usage approaching limit", time: "1 hour ago" },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 z-50 flex w-64 flex-col bg-card border-r border-border transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}
      >
        <div className="flex h-14 items-center border-b px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            <span>API Monitor</span>
          </div>
        </div>
        <nav className="flex-1 overflow-auto py-4 px-2">
          <div className="space-y-1">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              Services
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              Databases
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </nav>
      </div>

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
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                    4
                  </span>
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
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 border-b p-4">
                      <div
                        className={`mt-0.5 rounded-full p-1 ${alert.type === "error" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}
                      >
                        {alert.type === "error" ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{alert.message}</p>
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
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select endpoint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Endpoints</SelectItem>
                  <SelectItem value="/api/users">/api/users</SelectItem>
                  <SelectItem value="/api/products">/api/products</SelectItem>
                  <SelectItem value="/api/orders">/api/orders</SelectItem>
                  <SelectItem value="/api/auth">/api/auth</SelectItem>
                  <SelectItem value="/api/payments">/api/payments</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="24h">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last hour</SelectItem>
                  <SelectItem value="6h">Last 6 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1">
                <Filter className="h-3.5 w-3.5" />
                More Filters
              </Button>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Export
                </Button>
                <Button size="sm">Refresh</Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4,800</div>
                  <p className="text-xs text-muted-foreground">+12.5% from last 24h</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.7%</div>
                  <p className="text-xs text-muted-foreground">-0.3% from last 24h</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">145ms</div>
                  <p className="text-xs text-muted-foreground">+23ms from last 24h</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">99.98%</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Response Time Chart */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>API Response Time</CardTitle>
                  <CardDescription>Average response time over the last 24 hours</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ChartContainer className="h-[300px]">
                    <ChartYAxis />
                    <ChartXAxis />
                    <ChartGrid />
                    <ChartLine
                      data={responseTimeData}
                      valueKey="value"
                      categoryKey="time"
                      strokeWidth={2}
                      color="#0ea5e9"
                    />
                    <ChartTooltip />
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* API Requests Chart */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>API Requests & Errors</CardTitle>
                  <CardDescription>Requests and errors by endpoint</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ChartContainer className="h-[300px]">
                    <ChartYAxis />
                    <ChartXAxis />
                    <ChartGrid />
                    <ChartBar data={apiRequestsData} valueKey="requests" categoryKey="name" color="#0ea5e9" />
                    <ChartBar data={apiRequestsData} valueKey="errors" categoryKey="name" color="#ef4444" />
                    <ChartTooltip />
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* System Resources */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>CPU Usage</CardTitle>
                  <CardDescription>Current: 62%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CpuIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">System CPU</span>
                      </div>
                      <span className="font-medium">62%</span>
                    </div>
                    <Progress value={62} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <div className="font-medium">Peak</div>
                        <div>87%</div>
                      </div>
                      <div>
                        <div className="font-medium">Average</div>
                        <div>45%</div>
                      </div>
                      <div>
                        <div className="font-medium">Cores</div>
                        <div>8</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Memory Usage</CardTitle>
                  <CardDescription>Current: 78%</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">System Memory</span>
                      </div>
                      <span className="font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <div className="font-medium">Total</div>
                        <div>16 GB</div>
                      </div>
                      <div>
                        <div className="font-medium">Used</div>
                        <div>12.5 GB</div>
                      </div>
                      <div>
                        <div className="font-medium">Free</div>
                        <div>3.5 GB</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Recent API Failures</CardTitle>
                <CardDescription>Showing the most recent API errors</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error Message</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failureLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.endpoint}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{log.status}</Badge>
                        </TableCell>
                        <TableCell>{log.message}</TableCell>
                        <TableCell>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

