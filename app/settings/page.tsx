"use client"
import { useEffect, useMemo, useState } from "react"
import { SelectItem } from "@/components/ui/select"
import { SelectContent } from "@/components/ui/select"
import { SelectValue } from "@/components/ui/select"
import { SelectTrigger } from "@/components/ui/select"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { useToast } from "@/components/ui/use-toast"
import { useTheme } from "next-themes"
import { useSocket } from "@/lib/socket"

function SimulatorControls({ base }: { base: string }) {
  const [rps, setRps] = useState(5)
  const [dbQps, setDbQps] = useState(2)
  const [running, setRunning] = useState<boolean | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${base}/api/sim/status`)
      const json = await res.json()
      setRunning(!!json.running)
    } catch {}
  }

  

  useEffect(() => {
    fetchStatus()
  }, [])

  const start = async () => {
    try {
      const res = await fetch(`${base}/api/sim/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rps, dbQps }),
      })
      const json = await res.json()
      setRunning(!!json.running)
    } catch {}
  }

  const stop = async () => {
    try {
      const res = await fetch(`${base}/api/sim/stop`, { method: "POST" })
      const json = await res.json()
      setRunning(!!json.running)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sim-rps">Requests per second</Label>
          <Input id="sim-rps" type="number" value={rps} onChange={(e) => setRps(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sim-dbqps">DB queries per second</Label>
          <Input id="sim-dbqps" type="number" value={dbQps} onChange={(e) => setDbQps(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={start} disabled={running === true}>Start</Button>
        <Button variant="outline" onClick={stop} disabled={running === false}>Stop</Button>
        <span className="text-sm text-muted-foreground">Status: {running === null ? "..." : running ? "Running" : "Stopped"}</span>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { isConnected } = useSocket()
  const { toast } = useToast()
  const { setTheme, theme } = useTheme()
  const [thresholds, setThresholds] = useState({
    errorRate: 5,
    responseTime: 500,
    cpuUsage: 80,
    memoryUsage: 75,
    databaseQueryTime: 500,
  })
  const [saving, setSaving] = useState(false)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [apiKeys, setApiKeys] = useState<{ production: string; development: string }>({ production: "", development: "" })
  const [monitors, setMonitors] = useState<any[]>([])
  const [alertsCfg, setAlertsCfg] = useState<{ slackWebhookUrl: string; webhookUrl: string }>({ slackWebhookUrl: "", webhookUrl: "" })
  const [syntheticsCfg, setSyntheticsCfg] = useState<{ jitterPct: number; spreadStartMs: number }>({ jitterPct: 0.2, spreadStartMs: 2000 })

  // Appearance local state
  const [appTheme, setAppTheme] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('ui.theme') || 'dark') : 'dark')
  const [density, setDensity] = useState<string>(typeof window !== 'undefined' ? (localStorage.getItem('ui.density') || 'compact') : 'compact')
  const [chartAnim, setChartAnim] = useState<boolean>(typeof window !== 'undefined' ? (localStorage.getItem('ui.chartAnim') !== 'false') : true)

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  useEffect(() => {
    // load alert thresholds
    const fetchThresholds = async () => {
      try {
        const res = await fetch(`${base}/api/thresholds`)
        if (res.ok) {
          const json = await res.json()
          setThresholds((prev) => ({ ...prev, ...json }))
        }
      } catch {}
    }
    fetchThresholds()
    // load settings (api keys + monitors)
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${base}/api/settings`)
        if (res.ok) {
          const json = await res.json()
          setApiKeys({ production: json?.apiKeys?.production || "", development: json?.apiKeys?.development || "" })
          setMonitors(Array.isArray(json?.monitors) ? json.monitors : [])
          setAlertsCfg({ slackWebhookUrl: json?.alerts?.slackWebhookUrl || "", webhookUrl: json?.alerts?.webhookUrl || "" })
          setSyntheticsCfg({ jitterPct: Number(json?.synthetics?.jitterPct ?? 0.2), spreadStartMs: Number(json?.synthetics?.spreadStartMs ?? 2000) })
        }
      } catch {}
    }
    fetchSettings()
  }, [base])

  const updateThresholds = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${base}/api/thresholds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(thresholds),
      })
      if (!res.ok) throw new Error("Failed to update thresholds")
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // Save API keys and monitors to backend settings
  const saveSettings = async () => {
    setSettingsSaving(true)
    try {
      const payload = { apiKeys, monitors, alerts: alertsCfg, synthetics: syntheticsCfg }
      const res = await fetch(`${base}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to save settings")
      toast({ title: "Settings saved", description: "Synthetics reloaded with new configuration." })
    } catch (e) {
      console.error(e)
      toast({ title: "Save failed", description: (e as any)?.message || "Unknown error", variant: "destructive" })
    } finally {
      setSettingsSaving(false)
    }
  }

  // Export settings.json (apiKeys + monitors)
  const exportSettings = async () => {
    try {
      const res = await fetch(`${base}/api/settings`)
      if (!res.ok) throw new Error("Failed to fetch settings")
      const json = await res.json()
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'settings.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    }
  }

  // Import settings.json and save to backend
  const importSettings = async (file: File) => {
    try {
      const text = await file.text()
      const incoming = JSON.parse(text)
      // Update local state for UI immediacy
      setApiKeys({
        production: incoming?.apiKeys?.production || '',
        development: incoming?.apiKeys?.development || ''
      })
      setMonitors(Array.isArray(incoming?.monitors) ? incoming.monitors : [])
      setAlertsCfg({ slackWebhookUrl: incoming?.alerts?.slackWebhookUrl || '', webhookUrl: incoming?.alerts?.webhookUrl || '' })
      setSyntheticsCfg({ jitterPct: Number(incoming?.synthetics?.jitterPct ?? 0.2), spreadStartMs: Number(incoming?.synthetics?.spreadStartMs ?? 2000) })
      // Persist to backend
      const res = await fetch(`${base}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeys: {
            production: incoming?.apiKeys?.production || '',
            development: incoming?.apiKeys?.development || ''
          },
          monitors: Array.isArray(incoming?.monitors) ? incoming.monitors : [],
          alerts: { slackWebhookUrl: incoming?.alerts?.slackWebhookUrl || '', webhookUrl: incoming?.alerts?.webhookUrl || '' },
          synthetics: { jitterPct: Number(incoming?.synthetics?.jitterPct ?? 0.2), spreadStartMs: Number(incoming?.synthetics?.spreadStartMs ?? 2000) }
        })
      })
      if (!res.ok) throw new Error('Failed to import settings')
      toast({ title: "Imported settings", description: "Applied and reloaded synthetics." })
    } catch (e) {
      console.error(e)
      toast({ title: "Import failed", description: (e as any)?.message || "Invalid file", variant: "destructive" })
    }
  }

  // Inline validation helpers
  const urlRegex = useMemo(() => /^(https?:)\/\//i, [])
  const validateMonitor = (m: any) => {
    const errors: Record<string, string> = {}
    if (!m.url || !urlRegex.test(String(m.url))) errors.url = 'Invalid URL'
    if (!m.method) errors.method = 'Method required'
    if (Number(m.expectedStatus ?? 200) <= 0) errors.expectedStatus = 'Must be > 0'
    if (Number(m.maxLatencyMs ?? 1) <= 0) errors.maxLatencyMs = 'Must be > 0'
    if (Number(m.intervalMs ?? 1000) < 1000) errors.intervalMs = 'Min 1000ms'
    return errors
  }
  const monitorErrors = useMemo(() => monitors.map(validateMonitor), [monitors])

  const testMonitor = async (m: any) => {
    try {
      const res = await fetch(`${base}/api/synthetics/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m)
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Test failed')
      const r = json.result
      toast({ title: r.ok ? 'Test OK' : 'Test Failed', description: `${r.status} in ${r.responseMs}ms`, variant: r.ok ? 'default' : 'destructive' })
    } catch (e:any) {
      toast({ title: 'Test error', description: e?.message || 'Unknown', variant: 'destructive' })
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your dashboard preferences and system settings.</p>
          {!isConnected && (
            <p className="text-xs text-amber-500">Backend not connected — thresholds may not load.</p>
          )}
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
            <TabsTrigger value="simulator">Traffic Simulator</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Manage your dashboard preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" defaultValue="admin" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="admin@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                        <SelectItem value="cst">Central Time (CST)</SelectItem>
                        <SelectItem value="mst">Mountain Time (MST)</SelectItem>
                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-refresh">Auto-refresh dashboard</Label>
                    <Switch id="auto-refresh" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="analytics">Enable usage analytics</Label>
                    <Switch id="analytics" defaultChecked />
                  </div>
                  <div className="flex justify-end">
                    <Button>Save Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of your dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select value={appTheme} onValueChange={setAppTheme}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="density">Display Density</Label>
                    <Select value={density} onValueChange={setDensity}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select density" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chart-animation">Chart Animations</Label>
                    <Switch id="chart-animation" checked={chartAnim} onCheckedChange={(v)=> setChartAnim(!!v)} />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={()=>{
                      try {
                        // Apply theme via next-themes
                        setTheme(appTheme as any)
                        // Persist preferences
                        localStorage.setItem('ui.theme', appTheme)
                        localStorage.setItem('ui.density', density)
                        localStorage.setItem('ui.chartAnim', String(chartAnim))
                        // Apply density as a data-attribute on body for CSS hooks
                        if (typeof document !== 'undefined') {
                          document.body.setAttribute('data-density', density)
                          document.body.setAttribute('data-chart-anim', chartAnim ? 'on' : 'off')
                        }
                        toast({ title: 'Appearance updated', description: 'Theme and display preferences applied.' })
                      } catch (e:any) {
                        toast({ title: 'Failed to apply appearance', description: e?.message || 'Unknown error', variant: 'destructive' })
                      }
                    }}>Apply Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Email Notifications</h3>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="email-critical" defaultChecked />
                        <label htmlFor="email-critical" className="text-sm">
                          Critical Alerts
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="email-warnings" defaultChecked />
                        <label htmlFor="email-warnings" className="text-sm">
                          Warnings
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="email-info" />
                        <label htmlFor="email-info" className="text-sm">
                          Informational
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">In-App Notifications</h3>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="app-critical" defaultChecked />
                        <label htmlFor="app-critical" className="text-sm">
                          Critical Alerts
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="app-warnings" defaultChecked />
                        <label htmlFor="app-warnings" className="text-sm">
                          Warnings
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="app-info" defaultChecked />
                        <label htmlFor="app-info" className="text-sm">
                          Informational
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button>Save Preferences</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API keys for external integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-medium">Production API Key</h3>
                    <Input
                      placeholder="sk_prod_..."
                      value={apiKeys.production}
                      onChange={(e) => setApiKeys((k) => ({ ...k, production: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Development API Key</h3>
                    <Input
                      placeholder="sk_dev_..."
                      value={apiKeys.development}
                      onChange={(e) => setApiKeys((k) => ({ ...k, development: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 pt-4">
                    <h3 className="font-medium">Synthetic Monitors</h3>
                    <p className="text-sm text-muted-foreground">Add the APIs you want to probe automatically. These will run on the server and use your API key in the request headers.</p>
                    <div className="grid gap-3 md:grid-cols-3 mt-2">
                      <div className="space-y-1">
                        <Label htmlFor="slack-url">Slack Webhook URL</Label>
                        <Input id="slack-url" placeholder="https://hooks.slack.com/services/..." value={alertsCfg.slackWebhookUrl} onChange={(e)=> setAlertsCfg(a=>({ ...a, slackWebhookUrl: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="generic-hook">Generic Webhook URL</Label>
                        <Input id="generic-hook" placeholder="https://example.com/webhook" value={alertsCfg.webhookUrl} onChange={(e)=> setAlertsCfg(a=>({ ...a, webhookUrl: e.target.value }))} />
                      </div>
                      <div className="flex items-end">
                        <Button variant="outline" onClick={async()=>{
                          try {
                            const res = await fetch(`${base}/api/alerts/test`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title:'Settings Test', message:'This is a test alert from Settings page' }) })
                            const json = await res.json()
                            if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed')
                            toast({ title:'Test sent', description:`Slack: ${json?.results?.slack ?? 'n/a'}, Webhook: ${json?.results?.webhook ?? 'n/a'}` })
                          } catch(e:any) {
                            toast({ title:'Test failed', description:e?.message || 'Unknown error', variant:'destructive' })
                          }
                        }}>Send Test Notification</Button>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3 mt-2">
                      <div className="space-y-1">
                        <Label htmlFor="jitter">Jitter Percent (0–0.9)</Label>
                        <Input id="jitter" type="number" step="0.05" min={0} max={0.9} value={syntheticsCfg.jitterPct}
                          onChange={(e)=> setSyntheticsCfg(s=>({ ...s, jitterPct: Math.max(0, Math.min(0.9, Number(e.target.value))) }))} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="spread">Initial Spread (ms)</Label>
                        <Input id="spread" type="number" min={0} value={syntheticsCfg.spreadStartMs}
                          onChange={(e)=> setSyntheticsCfg(s=>({ ...s, spreadStartMs: Math.max(0, Number(e.target.value)) }))} />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="px-2 py-1">Name</th>
                            <th className="px-2 py-1">URL</th>
                            <th className="px-2 py-1">Method</th>
                            <th className="px-2 py-1">Expected</th>
                            <th className="px-2 py-1">Max ms</th>
                            <th className="px-2 py-1">Interval ms</th>
                            <th className="px-2 py-1">Jitter</th>
                            <th className="px-2 py-1">Backoff</th>
                            <th className="px-2 py-1">Use Dev Key</th>
                            <th className="px-2 py-1">Header x-api-key</th>
                            <th className="px-2 py-1">Bearer Token</th>
                            <th className="px-2 py-1">Body Contains</th>
                            <th className="px-2 py-1"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {monitors.map((m, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-2 py-1">
                                <Input value={m.name || ''} onChange={(e)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], name:e.target.value}; setMonitors(cp)
                                }} />
                              </td>
                              <td className="px-2 py-1">
                                <Input value={m.url || ''} onChange={(e)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], url:e.target.value}; setMonitors(cp)
                                }} className={monitorErrors[idx]?.url ? 'border-red-500' : ''} />
                              </td>
                              <td className="px-2 py-1">
                                <Input value={m.method || 'GET'} onChange={(e)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], method:e.target.value}; setMonitors(cp)
                                }} className={monitorErrors[idx]?.method ? 'border-red-500' : ''} />
                              </td>
                              <td className="px-2 py-1">
                                <Input type="number" value={m.expectedStatus ?? 200} onChange={(e)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], expectedStatus:Number(e.target.value)}; setMonitors(cp)
                                }} className={monitorErrors[idx]?.expectedStatus ? 'border-red-500' : ''} />
                              </td>
                              <td className="px-2 py-1">
                                <Input type="number" value={m.maxLatencyMs ?? 1000} onChange={(e)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], maxLatencyMs:Number(e.target.value)}; setMonitors(cp)
                                }} className={monitorErrors[idx]?.maxLatencyMs ? 'border-red-500' : ''} />
                              </td>
                              <td className="px-2 py-1">
                                <Input type="number" value={m.intervalMs ?? 60000} onChange={(e)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], intervalMs:Number(e.target.value)}; setMonitors(cp)
                                }} className={monitorErrors[idx]?.intervalMs ? 'border-red-500' : ''} />
                              </td>
                              <td className="px-2 py-1">
                                <Input type="number" step="0.05" min={0} max={0.9} placeholder="inherit" value={m.jitterPct ?? ''} onChange={(e)=>{
                                  const val = e.target.value === '' ? undefined : Math.max(0, Math.min(0.9, Number(e.target.value)))
                                  const cp=[...monitors]; cp[idx]={...cp[idx], jitterPct: val as any}; setMonitors(cp)
                                }} />
                              </td>
                              <td className="px-2 py-1">
                                <Checkbox checked={!!m.backoff} onCheckedChange={(v)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], backoff: !!v}; setMonitors(cp)
                                }} />
                              </td>
                              <td className="px-2 py-1">
                                <Checkbox checked={!!m.useDevKey} onCheckedChange={(v)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], useDevKey: !!v}; setMonitors(cp)
                                }} />
                              </td>
                              <td className="px-2 py-1">
                                <Input placeholder="leave blank to use Production key" value={m.headers?.['x-api-key'] || ''} onChange={(e)=>{
                                  const cp=[...monitors]; const h={...(cp[idx].headers||{})}; h['x-api-key']=e.target.value; cp[idx]={...cp[idx], headers:h}; setMonitors(cp)
                                }} />
                              </td>
                              <td className="px-2 py-1">
                                <Input placeholder="optional token" value={m.bearerToken || ''} onChange={(e)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], bearerToken:e.target.value}; setMonitors(cp)
                                }} />
                              </td>
                              <td className="px-2 py-1">
                                <Input placeholder="response must include..." value={m.expectedBodyContains || ''} onChange={(e)=>{
                                  const cp=[...monitors]; cp[idx]={...cp[idx], expectedBodyContains:e.target.value}; setMonitors(cp)
                                }} />
                              </td>
                              <td className="px-2 py-1">
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={()=> testMonitor(monitors[idx])}>Test</Button>
                                  <Button variant="secondary" size="sm" onClick={()=>{
                                    const cp=[...monitors]; cp.splice(idx+1,0,{...cp[idx], name:`${cp[idx].name || 'Monitor'} (copy)`}); setMonitors(cp)
                                  }}>Duplicate</Button>
                                  <Button variant="destructive" size="sm" onClick={()=>{
                                  const cp=[...monitors]; cp.splice(idx,1); setMonitors(cp)
                                  }}>Remove</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button variant="outline" onClick={()=> setMonitors(m=>[...m,{ name:"New Monitor", url:"https://api.example.com/health", method:"GET", expectedStatus:200, maxLatencyMs:1000, intervalMs:60000 }])}>Add Monitor</Button>
                      <Button onClick={saveSettings} disabled={settingsSaving}>{settingsSaving? 'Saving...' : 'Save Settings'}</Button>
                      <Button variant="outline" onClick={exportSettings}>Export Settings</Button>
                      <label className="inline-flex items-center gap-2 text-sm px-3 py-2 border rounded cursor-pointer">
                        <input type="file" accept="application/json" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importSettings(f) }} />
                        Import Settings
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="thresholds">
            <Card>
              <CardHeader>
                <CardTitle>Alert Thresholds</CardTitle>
                <CardDescription>Configure thresholds used by the alert engine</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="th-error">Error Rate Threshold (%)</Label>
                    <Input
                      id="th-error"
                      type="number"
                      value={thresholds.errorRate}
                      onChange={(e) => setThresholds((t) => ({ ...t, errorRate: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="th-rt">Average Response Time (ms)</Label>
                    <Input
                      id="th-rt"
                      type="number"
                      value={thresholds.responseTime}
                      onChange={(e) => setThresholds((t) => ({ ...t, responseTime: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="th-cpu">CPU Usage Threshold (%)</Label>
                    <Input
                      id="th-cpu"
                      type="number"
                      value={thresholds.cpuUsage}
                      onChange={(e) => setThresholds((t) => ({ ...t, cpuUsage: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="th-mem">Memory Usage Threshold (%)</Label>
                    <Input
                      id="th-mem"
                      type="number"
                      value={thresholds.memoryUsage}
                      onChange={(e) => setThresholds((t) => ({ ...t, memoryUsage: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="th-db">DB Query Time (ms)</Label>
                    <Input
                      id="th-db"
                      type="number"
                      value={thresholds.databaseQueryTime}
                      onChange={(e) => setThresholds((t) => ({ ...t, databaseQueryTime: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={updateThresholds} disabled={saving}>
                    {saving ? "Saving..." : "Save Thresholds"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="simulator">
            <Card>
              <CardHeader>
                <CardTitle>Traffic Simulator</CardTitle>
                <CardDescription>Generate realistic live traffic to demo the dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <SimulatorControls base={base} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

