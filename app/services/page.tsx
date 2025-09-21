"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { ServiceHealthPanel } from "@/components/dashboard/service-health"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { useSocket } from "@/lib/socket"

export default function ServicesPage() {
  const { isConnected, refreshData } = useSocket()
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [catalog, setCatalog] = useState<any[] | null>(null)
  const [synStatus, setSynStatus] = useState<{ running: boolean; lastResult: any[] } | null>(null)
  const [telemetry, setTelemetry] = useState<{ otlpEndpoint: string; snapshots24h: number } | null>(null)

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  const runHealth = async () => {
    try {
      setRunning(true)
      const res = await fetch(`${base}/api/health/run`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to run health checks")
      toast({ title: "Health checks triggered", description: "Services are being checked now." })
      // slight delay to allow metrics to update
      setTimeout(() => refreshData(), 500)
    } catch (e: any) {
      toast({ title: "Health check failed", description: e?.message || "Unknown error", variant: "destructive" })
    } finally {
      setRunning(false)
    }
  }
  // Fetch service catalog
  useEffect(() => {
    let cancelled = false
    async function loadCatalog() {
      try {
        const res = await fetch(`${base}/api/catalog/services`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setCatalog(json)
      } catch (e: any) {
        if (!cancelled) toast({ title: "Catalog error", description: e?.message || "Failed to load catalog", variant: "destructive" })
      }
    }
    loadCatalog()
    async function loadTelemetry() {
      try {
        const [settingsRes, snapsRes] = await Promise.all([
          fetch(`${base}/api/settings`),
          fetch(`${base}/api/errors/snapshots?hours=24`),
        ])
        const settings = settingsRes.ok ? await settingsRes.json() : { tracing: { otlpEndpoint: '' } }
        const snaps = snapsRes.ok ? await snapsRes.json() : { count: 0 }
        if (!cancelled) setTelemetry({ otlpEndpoint: settings?.tracing?.otlpEndpoint || '', snapshots24h: snaps?.count || 0 })
      } catch {}
    }
    loadTelemetry()
    return () => { cancelled = true }
  }, [base])

  // --- Synthetic monitors controls ---
  const fetchSyntheticsStatus = async () => {
    try {
      const res = await fetch(`${base}/api/synthetics/status`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setSynStatus(json)
    } catch (e: any) {
      toast({ title: "Synthetics status error", description: e?.message || "Failed to fetch", variant: "destructive" })
    }
  }

  const startSynthetics = async () => {
    try {
      const res = await fetch(`${base}/api/synthetics/start`, { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast({ title: "Synthetics started" })
      fetchSyntheticsStatus()
    } catch (e: any) {
      toast({ title: "Start failed", description: e?.message || "Unknown error", variant: "destructive" })
    }
  }

  const stopSynthetics = async () => {
    try {
      const res = await fetch(`${base}/api/synthetics/stop`, { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast({ title: "Synthetics stopped" })
      fetchSyntheticsStatus()
    } catch (e: any) {
      toast({ title: "Stop failed", description: e?.message || "Unknown error", variant: "destructive" })
    }
  }

  const runSyntheticsOnce = async () => {
    try {
      const res = await fetch(`${base}/api/synthetics/run`, { method: "POST" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      toast({ title: "Synthetics run", description: `${json?.result?.length || 0} probes executed` })
      fetchSyntheticsStatus()
    } catch (e: any) {
      toast({ title: "Run failed", description: e?.message || "Unknown error", variant: "destructive" })
    }
  }

  useEffect(() => {
    fetchSyntheticsStatus()
  }, [])

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">Monitor and manage your microservices.</p>
          {telemetry && (
            <Card>
              <CardHeader>
                <CardTitle>Telemetry</CardTitle>
                <CardDescription>Tracing and error forensics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">OTLP Endpoint</div>
                    <div className="font-mono break-all">{telemetry.otlpEndpoint || 'Not configured'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Snapshots (24h)</div>
                    <div className="font-semibold">{telemetry.snapshots24h}</div>
                  </div>
                  <div className="flex items-end md:justify-end">
                    <Button asChild variant="outline" size="sm">
                      <a href="/alerts#snapshots">View Snapshots</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="flex gap-2 mt-2">
            <Button onClick={runHealth} disabled={!isConnected || running}>
              {running ? "Running..." : "Run Health Check Now"}
            </Button>
            <Button variant="outline" onClick={refreshData} disabled={!isConnected}>
              Refresh
            </Button>
            <Button variant="outline" onClick={fetchSyntheticsStatus}>
              Synthetics Status
            </Button>
            <Button variant="outline" onClick={runSyntheticsOnce}>
              Run Synthetic Now
            </Button>
            <Button onClick={startSynthetics} disabled={synStatus?.running === true}>
              Start Synthetics
            </Button>
            <Button variant="destructive" onClick={stopSynthetics} disabled={synStatus?.running === false}>
              Stop Synthetics
            </Button>
            <div className="flex items-center gap-2 ml-2">
              <Badge variant="default">OK {synStatus?.lastResult?.filter((r:any)=>r.ok).length || 0}</Badge>
              <Badge variant="destructive">Fail {synStatus?.lastResult?.filter((r:any)=>!r.ok).length || 0}</Badge>
            </div>
          </div>
        </div>

        {/* Service Health Panel */}
        <ServiceHealthPanel />

        {/* Service Ownership / Runbooks */}
        <Card>
          <CardHeader>
            <CardTitle>Service Ownership</CardTitle>
            <CardDescription>Teams, on-call contacts, and runbooks</CardDescription>
          </CardHeader>
          <CardContent>
            {!catalog ? (
              <div className="text-muted-foreground">Loading catalog...</div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {catalog.map((svc) => (
                  <div key={svc.name} className="rounded border p-3">
                    <div className="text-sm font-semibold">{svc.name}</div>
                    <div className="text-xs text-muted-foreground">Team: {svc.team}</div>
                    <div className="text-xs text-muted-foreground mb-2">On-call: {svc.onCall}</div>
                    <div className="flex flex-wrap gap-2">
                      {svc.docs && (
                        <Button asChild variant="outline" size="sm">
                          <a href={svc.docs} target="_blank" rel="noreferrer">Docs</a>
                        </Button>
                      )}
                      {svc.runbook && (
                        <Button asChild variant="outline" size="sm">
                          <a href={svc.runbook} target="_blank" rel="noreferrer">Runbook</a>
                        </Button>
                      )}
                      {svc.repo && (
                        <Button asChild variant="outline" size="sm">
                          <a href={svc.repo} target="_blank" rel="noreferrer">Repo</a>
                        </Button>
                      )}
                    </div>
                    {svc.dependencies && svc.dependencies.length > 0 && (
                      <div className="mt-2 text-xs"><span className="text-muted-foreground">Depends on: </span>{svc.dependencies.join(", ")}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Synthetic Monitors - Last Results */}
        <Card>
          <CardHeader>
            <CardTitle>Synthetics</CardTitle>
            <CardDescription>Last probe results and runner status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm mb-2">Status: {synStatus?.running ? "Running" : "Stopped"}</div>
            {!synStatus?.lastResult?.length ? (
              <div className="text-muted-foreground">No synthetic results yet. Run once or start the runner.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2 py-1">Name</th>
                      <th className="px-2 py-1">URL</th>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1">Resp (ms)</th>
                      <th className="px-2 py-1">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {synStatus.lastResult.map((r: any) => (
                      <tr key={`${r.name}-${r.ts}`} className="border-t">
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1 text-xs text-muted-foreground">{r.url}</td>
                        <td className="px-2 py-1" style={{ color: r.ok ? '#16a34a' : '#dc2626' }}>{r.ok ? 'OK' : `Fail (${r.status})`}</td>
                        <td className="px-2 py-1">{r.responseMs}</td>
                        <td className="px-2 py-1 text-xs text-muted-foreground">{new Date(r.ts).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dependency Map */}
        <Card>
          <CardHeader>
            <CardTitle>Service Dependencies</CardTitle>
            <CardDescription>Visualize service dependencies and communication patterns</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center">
            <div className="text-muted-foreground">Service dependency visualization would be displayed here</div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

