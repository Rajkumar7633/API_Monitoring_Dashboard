"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, AlertTriangle, Database, Home, Layers, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div
      className={`fixed inset-y-0 z-50 flex w-64 flex-col bg-card border-r border-border transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0`}
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
          <Button variant={pathname === "/alerts" ? "default" : "ghost"} className="w-full justify-start gap-2" asChild>
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
  )
}

