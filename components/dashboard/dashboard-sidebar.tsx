"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, AlertTriangle, Database, Home, Layers, Settings, X, Flame, Map, Cpu, FileText, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DashboardSidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function DashboardSidebar({ open, setOpen }: DashboardSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/services", label: "Services", icon: Layers },
    { href: "/databases", label: "Databases", icon: Database },
    { href: "/tracing", label: "Tracing", icon: Flame },
    { href: "/indian-insights", label: "Indian Insights", icon: Map },
    { href: "/ml-analytics", label: "ML Analytics", icon: Cpu },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/builder", label: "Builder", icon: LayoutGrid },
    { href: "/alerts", label: "Alerts", icon: AlertTriangle },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <div
      className={`fixed inset-y-0 z-50 flex w-64 flex-col bg-card border-r border-border transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "-translate-x-full"
      } md:relative md:translate-x-0`}
    >
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center gap-2 font-semibold">
          <Activity className="h-5 w-5 text-primary" />
          <span>API Monitor</span>
        </div>
        <button
          className="ml-auto md:hidden inline-flex h-8 w-8 items-center justify-center rounded hover:bg-accent"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 overflow-auto py-4 px-2">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href
            return (
              <Button
                key={item.href}
                variant={active ? "default" : "ghost"}
                className="w-full justify-start gap-2"
                asChild
              >
                <Link
                  href={item.href}
                  onClick={() => {
                    if (typeof window !== "undefined" && window.innerWidth < 768) setOpen(false)
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

