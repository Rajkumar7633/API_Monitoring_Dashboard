"use client"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Bell, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useSocketEvent } from "@/lib/socket"
import { IncidentTimeline } from "@/components/dashboard/incident-timeline"
import { useToast } from "@/components/ui/use-toast"
import { useMemo, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AlertsPage() {
  const alerts = useSocketEvent<any[]>("alerts", [])
  const { toast } = useToast()
  const [pending, setPending] = useState<Record<string, boolean>>({})

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  // Summary stats
  const summary = useMemo(() => {
    const all = alerts.length
    const active = alerts.filter((a:any) => a.status === 'active').length
    const acknowledged = alerts.filter((a:any) => a.status === 'acknowledged').length
    const resolved = alerts.filter((a:any) => a.status === 'resolved').length
    const solvedRate = all ? Math.round((resolved / all) * 100) : 0
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const parseTs = (s?:string|null) => (s ? new Date(s).getTime() : NaN)
    // MTTA: average (ack - created) for acknowledged alerts
    const ackSamples = alerts.filter((a:any)=> a.acknowledgedAt && a.createdAt)
      .map((a:any)=> parseTs(a.acknowledgedAt) - parseTs(a.createdAt))
      .filter((d:number)=> isFinite(d) && d>=0)
    const mttaMs = ackSamples.length ? Math.round(ackSamples.reduce((x:number,y:number)=>x+y,0) / ackSamples.length) : 0
    // MTTR: average (resolved - created) for resolved alerts
    const resSamples = alerts.filter((a:any)=> a.resolvedAt && a.createdAt)
      .map((a:any)=> parseTs(a.resolvedAt) - parseTs(a.createdAt))
      .filter((d:number)=> isFinite(d) && d>=0)
    const mttrMs = resSamples.length ? Math.round(resSamples.reduce((x:number,y:number)=>x+y,0) / resSamples.length) : 0
    // Fallback: show average active age if no acknowledges yet
    const activeAges = alerts.filter((a:any)=> a.status==='active' && a.createdAt)
      .map((a:any)=> now - parseTs(a.createdAt))
      .filter((d:number)=> isFinite(d) && d>=0)
    const activeAgeAvgMs = activeAges.length ? Math.round(activeAges.reduce((x:number,y:number)=>x+y,0)/activeAges.length) : 0
    // Deltas last 1h
    const activeDelta1h = alerts.filter((a:any)=> parseTs(a.createdAt) >= oneHourAgo).length
    const resolvedDelta1h = alerts.filter((a:any)=> parseTs(a.resolvedAt) >= oneHourAgo).length
    return { all, active, acknowledged, resolved, solvedRate, mttaMs, mttrMs, activeDelta1h, resolvedDelta1h, mttaCount: ackSamples.length, mttrCount: resSamples.length, activeAgeAvgMs }
  }, [alerts])

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

  // Build sparkline series for MTTA/MTTR (last 60 minutes in 12 buckets)
  const { mttaPath, mttrPath, mttaMax, mttrMax } = useMemo(() => {
    const now = Date.now()
    const windowMs = 60 * 60 * 1000
    const buckets = 12
    const bucketMs = windowMs / buckets
    const parseTs = (s?:string|null) => (s ? new Date(s).getTime() : NaN)
    const mttaVals: number[] = Array(buckets).fill(0)
    const mttaCounts: number[] = Array(buckets).fill(0)
    const mttrVals: number[] = Array(buckets).fill(0)
    const mttrCounts: number[] = Array(buckets).fill(0)

    for (const a of alerts as any[]) {
      const c = parseTs(a.createdAt)
      if (!isFinite(c) || c < now - windowMs) continue
      if (a.acknowledgedAt) {
        const ack = parseTs(a.acknowledgedAt)
        if (isFinite(ack)) {
          const idx = Math.min(buckets - 1, Math.max(0, Math.floor((ack - (now - windowMs)) / bucketMs)))
          const d = ack - c
          if (isFinite(d) && d >= 0) { mttaVals[idx] += d; mttaCounts[idx]++ }
        }
      }
      if (a.resolvedAt) {
        const res = parseTs(a.resolvedAt)
        if (isFinite(res)) {
          const idx = Math.min(buckets - 1, Math.max(0, Math.floor((res - (now - windowMs)) / bucketMs)))
          const d = res - c
          if (isFinite(d) && d >= 0) { mttrVals[idx] += d; mttrCounts[idx]++ }
        }
      }
    }

    const mttaAvg = mttaVals.map((v, i) => (mttaCounts[i] ? v / mttaCounts[i] : 0))
    const mttrAvg = mttrVals.map((v, i) => (mttrCounts[i] ? v / mttrCounts[i] : 0))
    const mttaMax = Math.max(0, ...mttaAvg)
    const mttrMax = Math.max(0, ...mttrAvg)

    const toPath = (vals: number[], vmax: number) => {
      const w = 120, h = 30
      if (!vmax || vmax <= 0) return { path: `M0 ${h} L${w} ${h}` }
      const stepX = w / (buckets - 1)
      const points = vals.map((v, i) => {
        const x = Math.round(i * stepX)
        const y = Math.round(h - (v / vmax) * (h - 2))
        return `${x},${y}`
      })
      return { path: `M${points[0]} ` + points.slice(1).map(p => `L${p}`).join(' ') }
    }

    const { path: mttaPath } = toPath(mttaAvg, mttaMax)
    const { path: mttrPath } = toPath(mttrAvg, mttrMax)
    return { mttaPath, mttrPath, mttaMax, mttrMax }
  }, [alerts])

  // Snapshot modal state
  const [snapOpen, setSnapOpen] = useState(false)
  const [snap, setSnap] = useState<any | null>(null)
  const [curl, setCurl] = useState<string>("")
  const [snapLoading, setSnapLoading] = useState(false)
  const [snapError, setSnapError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [hours, setHours] = useState<number>(24)
  const [filterEndpoint, setFilterEndpoint] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const loadSnapshots = async () => {
    try {
      const list = await fetch(`${base}/api/errors/snapshots?hours=${hours}`).then((r) => r.json())
      setSnapshots(list?.items || [])
    } catch {}
  }

  // refresh snapshots periodically
  useEffect(() => {
    loadSnapshots()
    const id = setInterval(loadSnapshots, 30000)
    return () => clearInterval(id)
  }, [hours])

  const normalizePath = (p: string) => {
    try {
      const pathOnly = p.split('?')[0].replace(/\/+$/,'')
      return pathOnly || p
    } catch { return p }
  }

  const parseEndpoint = (message: string | undefined) => {
    if (!message) return ""
    // messages look like: "Server error on /api/thresholds" or "Client error on /api/auth"
    const m = message.match(/\son\s(\/[^\s]+)/i)
    return m ? normalizePath(m[1]) : ""
  }

  const viewSnapshot = async (alert: any) => {
    try {
      setSnapOpen(true)
      setSnap(null)
      setSnapError(null)
      setSnapLoading(true)
      const endpoint = parseEndpoint(alert?.message)
      if (!endpoint) throw new Error("No endpoint to match")
      // fetch recent snapshots and pick a matching endpoint (normalize path, allow prefix match)
      const list = await fetch(`${base}/api/errors/snapshots?hours=${hours}`).then((r) => r.json())
      const items = (list?.items || [])
      // Prefer exact traceId match if alert has one
      const itemByTrace = alert?.traceId ? items.find((it:any) => String(it.traceId||"") === String(alert.traceId)) : null
      const item = itemByTrace || items.find((it: any) => {
        const ep = normalizePath(String(it.endpoint || ''))
        return ep === endpoint || ep.startsWith(endpoint) || endpoint.startsWith(ep)
      })
      if (!item) throw new Error("No snapshot found for this alert")
      const full = await fetch(`${base}/api/errors/snapshots/${encodeURIComponent(item.id)}`).then((r) => r.json())
      setSnap(full)
      const curlTxt = await fetch(`${base}/api/errors/snapshots/${encodeURIComponent(item.id)}/curl`).then((r) => r.text())
      setCurl(curlTxt)
    } catch (e: any) {
      setSnapError(e?.message || "No snapshot found")
      toast({ title: "Snapshot not available", description: e?.message || "No snapshot found", variant: "destructive" })
    } finally {
      setSnapLoading(false)
    }
  }

  const doAction = async (id: string | number, action: "ack" | "resolve") => {
    try {
      setPending((p) => ({ ...p, [String(id)]: true }))
      const res = await fetch(`${base}/api/alerts/${id}/${action}`, { method: "POST" })
      if (!res.ok) throw new Error(`Failed to ${action} alert`)
      toast({ title: `Alert ${action === "ack" ? "acknowledged" : "resolved"}`, description: `Alert #${id} updated.` })
    } catch (e: any) {
      toast({ title: "Action failed", description: e?.message || "Unknown error", variant: "destructive" })
    } finally {
      setPending((p) => ({ ...p, [String(id)]: false }))
    }
  }

  const activeAlerts = alerts.filter((alert) => alert.type === "error" || alert.type === "warning")
  const infoAlerts = alerts.filter((alert) => alert.type === "info")

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Monitor system alerts and notifications.</p>
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-xs text-muted-foreground">Total Alerts</div>
                  <div className="text-xl font-semibold">{summary.all}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Active</div>
                  <div className="text-xl font-semibold">{summary.active} {summary.activeDelta1h ? <span className="text-xs text-muted-foreground">(+{summary.activeDelta1h} 1h)</span> : null}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Acknowledged</div>
                  <div className="text-xl font-semibold">{summary.acknowledged}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Resolved (Rate)</div>
                  <div className="text-xl font-semibold">{summary.resolved} <span className="text-sm text-muted-foreground">({summary.solvedRate}% solved)</span> {summary.resolvedDelta1h ? <span className="text-xs text-muted-foreground">(+{summary.resolvedDelta1h} 1h)</span> : null}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">MTTA (avg acknowledge time)</div>
                  <div className="text-xl font-semibold">{fmtDuration(summary.mttaMs)} <span className="text-xs text-muted-foreground">({summary.mttaCount} samples)</span></div>
                  {summary.mttaCount === 0 && summary.activeAgeAvgMs > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">Avg active age: {fmtDuration(summary.activeAgeAvgMs)}</div>
                  )}
                  <svg width="120" height="30" className="mt-1"><path d={mttaPath} stroke="currentColor" fill="none" strokeWidth="2" opacity="0.8" /></svg>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">MTTR (avg resolve time)</div>
                  <div className="text-xl font-semibold">{fmtDuration(summary.mttrMs)} <span className="text-xs text-muted-foreground">({summary.mttrCount} samples)</span></div>
                  <svg width="120" height="30" className="mt-1"><path d={mttrPath} stroke="currentColor" fill="none" strokeWidth="2" opacity="0.8" /></svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Alerts</TabsTrigger>
            <TabsTrigger value="info">Informational</TabsTrigger>
            <TabsTrigger value="settings">Alert Settings</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="synthetics">Synthetics</TabsTrigger>
            <TabsTrigger value="snapshots">Snapshots</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Critical and warning alerts that require attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <div
                        className={`mt-0.5 rounded-full p-1 ${alert.type === "error" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alert.message}</p>
                          <Badge variant={alert.type === "error" ? "destructive" : "outline"}>
                            {alert.type === "error" ? "Critical" : "Warning"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.details}</p>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {alert.time}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!!pending[String(alert.id)]}
                              onClick={() => doAction(alert.id, "ack")}
                            >
                              {pending[String(alert.id)] ? "Working..." : "Acknowledge"}
                            </Button>
                            <Button
                              size="sm"
                              disabled={!!pending[String(alert.id)]}
                              onClick={() => doAction(alert.id, "resolve")}
                            >
                              {pending[String(alert.id)] ? "Working..." : "Resolve"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewSnapshot(alert)}
                            >
                              View Snapshot
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Informational Alerts</CardTitle>
                <CardDescription>System information and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {infoAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <div className="mt-0.5 rounded-full p-1 bg-primary/20 text-primary">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">{alert.details}</p>
                        <div className="flex items-center text-xs text-muted-foreground pt-2">
                          <Clock className="mr-1 h-3 w-3" />
                          {alert.time}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Dismiss
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Alert Settings</CardTitle>
                <CardDescription>Configure alert thresholds and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="error-threshold">Error Rate Threshold (%)</Label>
                      <Input id="error-threshold" type="number" defaultValue="5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="response-threshold">Response Time Threshold (ms)</Label>
                      <Input id="response-threshold" type="number" defaultValue="500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpu-threshold">CPU Usage Threshold (%)</Label>
                      <Input id="cpu-threshold" type="number" defaultValue="80" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memory-threshold">Memory Usage Threshold (%)</Label>
                      <Input id="memory-threshold" type="number" defaultValue="75" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notification Channels</Label>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="email" checked />
                        <label
                          htmlFor="email"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Email Notifications
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="slack" checked />
                        <label
                          htmlFor="slack"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Slack Notifications
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="sms" />
                        <label
                          htmlFor="sms"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          SMS Notifications
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button>Save Settings</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="timeline">
            <IncidentTimeline />
          </TabsContent>
          <TabsContent value="synthetics">
            <IncidentTimeline filter={(it:any) => (it.kind === 'alert' && (it.service === 'Synthetics' || (it.message||'').toLowerCase().includes('synthetic'))) || it.kind === 'service_check'} />
          </TabsContent>
          <TabsContent value="snapshots">
            <Card>
              <CardHeader>
                <CardTitle>Error Snapshots</CardTitle>
                <CardDescription>Recent captured errors with forensic context</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-3 items-end">
                  <div className="w-full md:w-1/3">
                    <Label>Endpoint contains</Label>
                    <Input placeholder="/api/orders" value={filterEndpoint} onChange={(e)=> setFilterEndpoint(e.target.value)} />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[160px]"><SelectValue placeholder="All" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="4xx">4xx</SelectItem>
                        <SelectItem value="5xx">5xx</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Time window</Label>
                    <Select value={String(hours)} onValueChange={(v)=> setHours(Number(v))}>
                      <SelectTrigger className="w-[160px]"><SelectValue placeholder="24" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Last 1h</SelectItem>
                        <SelectItem value="6">Last 6h</SelectItem>
                        <SelectItem value="12">Last 12h</SelectItem>
                        <SelectItem value="24">Last 24h</SelectItem>
                        <SelectItem value="72">Last 72h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button variant="outline" onClick={loadSnapshots}>Refresh</Button>
                  </div>
                </div>
                {snapshots.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No snapshots found in the last 24 hours.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="px-2 py-1">Endpoint</th>
                          <th className="px-2 py-1">Method</th>
                          <th className="px-2 py-1">Status</th>
                          <th className="px-2 py-1">Trace ID</th>
                          <th className="px-2 py-1">Time</th>
                          <th className="px-2 py-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshots.filter((s:any)=>{
                          const epMatch = filterEndpoint ? String(s.endpoint||"").toLowerCase().includes(filterEndpoint.toLowerCase()) : true
                          const st = Number(s.status||0)
                          const stMatch = filterStatus === 'all' ? true : (filterStatus === '4xx' ? st>=400 && st<500 : st>=500)
                          return epMatch && stMatch
                        }).map((s:any) => (
                          <tr key={s.id} className="border-t">
                            <td className="px-2 py-1 font-mono break-all">{s.endpoint}</td>
                            <td className="px-2 py-1">{s.method}</td>
                            <td className="px-2 py-1">{s.status}</td>
                            <td className="px-2 py-1 font-mono break-all">{s.traceId || '-'}</td>
                            <td className="px-2 py-1">{new Date(s.ts).toLocaleTimeString()}</td>
                            <td className="px-2 py-1 flex gap-2">
                              <Button variant="outline" size="sm" onClick={async()=>{
                                const curlTxt = await fetch(`${base}/api/errors/snapshots/${encodeURIComponent(s.id)}/curl`).then(r=>r.text())
                                await navigator.clipboard.writeText(curlTxt)
                                toast({ title:'Copied cURL', description:'Reproduction command copied to clipboard' })
                              }}>Copy cURL</Button>
                              <Button variant="ghost" size="sm" onClick={async()=>{
                                const full = await fetch(`${base}/api/errors/snapshots/${encodeURIComponent(s.id)}`).then(r=>r.json())
                                const curlTxt = await fetch(`${base}/api/errors/snapshots/${encodeURIComponent(s.id)}/curl`).then(r=>r.text())
                                setSnap(full); setCurl(curlTxt); setSnapOpen(true)
                              }}>Open</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <Dialog open={snapOpen} onOpenChange={(v)=>{ setSnapOpen(v); if(!v){ setSnap(null); setCurl(""); setSnapError(null); setSnapLoading(false) } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Error Snapshot</DialogTitle>
            </DialogHeader>
            {snapLoading ? (
              <div className="text-sm text-muted-foreground">Loading snapshot…</div>
            ) : snapError ? (
              <div className="text-sm text-destructive">{snapError}</div>
            ) : snap ? (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground">Endpoint</div>
                    <div className="font-mono break-all">{snap.endpoint}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-mono">{snap.status}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-muted-foreground">Method</div>
                    <div className="font-mono">{snap.method}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Trace ID</div>
                    <div className="font-mono break-all">{snap.traceId || "-"}</div>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Request Headers (redacted)</div>
                  <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(snap.request_headers || {}, null, 2)}</pre>
                </div>
                <div>
                  <div className="text-muted-foreground">Request Body</div>
                  <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">{typeof snap.request_body === 'string' ? snap.request_body : JSON.stringify(snap.request_body, null, 2)}</pre>
                </div>
                <div>
                  <div className="text-muted-foreground">Response Snippet</div>
                  <pre className="max-h-40 overflow-auto rounded bg-muted p-2 text-xs">{snap.response_snippet}</pre>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Reproduce (cURL)</div>
                  <Input readOnly value={curl} />
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No snapshot loaded.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

