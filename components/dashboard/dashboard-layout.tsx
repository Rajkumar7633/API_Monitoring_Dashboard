"use client"

import type React from "react"

import { useState } from "react"
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  Clock,
  Database,
  Home,
  Layers,
  Menu,
  Search,
  Settings,
  X,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pathname = usePathname()

  // Mock alerts data
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
            <Button variant={pathname === "/" ? "default" : "ghost"} className="w-full justify-start gap-2" asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button
              variant={pathname === "/services" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              asChild
            >
              <Link href="/services">
                <Layers className="h-4 w-4" />
                Services
              </Link>
            </Button>
            <Button
              variant={pathname === "/databases" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              asChild
            >
              <Link href="/databases">
                <Database className="h-4 w-4" />
                Databases
              </Link>
            </Button>
            <Button
              variant={pathname === "/alerts" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              asChild
            >
              <Link href="/alerts">
                <AlertTriangle className="h-4 w-4" />
                Alerts
              </Link>
            </Button>
            <Button
              variant={pathname === "/settings" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              asChild
            >
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
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
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                      {alerts.length}
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
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 border-b p-4">
                      <div
                        className={`mt-0.5 rounded-full p-1 ${alert.type === "error" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}
                      >
                        <AlertTriangle className="h-4 w-4" />
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
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

