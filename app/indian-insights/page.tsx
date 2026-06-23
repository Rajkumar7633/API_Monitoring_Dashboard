"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, ShieldAlert, Wifi, Globe, Landmark, HelpCircle } from "lucide-react"

export default function IndianInsightsPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [todayHoliday, setTodayHoliday] = useState<any | null>(null)
  const [businessHours, setBusinessHours] = useState<any | null>(null)
  const [compliance, setCompliance] = useState<any | null>(null)
  const [insights, setInsights] = useState<any | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>("South")

  const base = process.env.NEXT_PUBLIC_API_URL || ""

  const regionalBenchmarks: Record<string, any> = {
    North: { latency: 180, uptime: 99.5, quality: "Good", peak: "11:00-13:00, 16:00-18:00", techHub: "Delhi NCR" },
    South: { latency: 145, uptime: 99.75, quality: "Excellent", peak: "10:00-12:00, 14:00-17:00", techHub: "Bengaluru, Chennai, Hyd" },
    East: { latency: 205, uptime: 99.3, quality: "Good", peak: "10:00-13:00, 15:00-17:00", techHub: "Kolkata" },
    West: { latency: 155, uptime: 99.65, quality: "Excellent", peak: "09:00-12:00, 14:00-17:00", techHub: "Mumbai, Pune" },
    Central: { latency: 220, uptime: 99.2, quality: "Fair", peak: "10:00-13:00, 15:00-18:00", techHub: "Indore" }
  }

  const ispLatency = [
    { name: "JioFiber / Jio 5G", latency: 38, reliability: 99.8, share: "42%" },
    { name: "Airtel Xstream / 5G", latency: 40, reliability: 99.7, share: "34%" },
    { name: "ACT Fibernet", latency: 25, reliability: 99.9, share: "8%" },
    { name: "Vodafone Idea (Vi)", latency: 58, reliability: 97.4, share: "11%" },
    { name: "BSNL FTTH", latency: 65, reliability: 96.2, share: "5%" }
  ]

  useEffect(() => {
    async function fetchData() {
      try {
        const [hRes, bRes, cRes, iRes] = await Promise.all([
          fetch(`${base}/api/indian/holidays`),
          fetch(`${base}/api/indian/business-hours?region=${selectedRegion}`),
          fetch(`${base}/api/indian/compliance`),
          fetch(`${base}/api/indian/insights`)
        ])

        if (hRes.ok) {
          const hJson = await hRes.json()
          setHolidays(hJson.holidays || [])
          setTodayHoliday(hJson.todayHoliday)
        }
        if (bRes.ok) setBusinessHours(await bRes.json())
        if (cRes.ok) setCompliance(await cRes.json())
        if (iRes.ok) setInsights(await iRes.json())
      } catch (e) {
        console.error("Failed to load Indian insights", e)
      }
    }
    fetchData()
  }, [base, selectedRegion])

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Page Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-white to-green-500 bg-clip-text text-transparent">
            Indian Market Observability Insights
          </h1>
          <p className="text-muted-foreground">
            Monitor infrastructure performance, ISP response metrics, DPDP localization guidelines, and festival traffic spikes across India.
          </p>
        </div>

        {/* Top Highlights Banner */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-orange-950/20 to-card border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Holiday Load Predictor</CardTitle>
              <Calendar className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayHoliday ? todayHoliday.name : "Regular Traffic Day"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {todayHoliday
                  ? "Festival load active. High transaction rates expected."
                  : "No national festivals today. Standard baseline loads apply."}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-950/20 to-card border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">SLA Compliance Status</CardTitle>
              <Landmark className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.54%</div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-green-500">
                <span>Active DPDP Compliance: Verified</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-950/20 to-card border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Active Business Hours</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{businessHours ? `${businessHours.start} - ${businessHours.end}` : "09:00 - 18:00"}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Timezone: Asia/Kolkata (IST). High tech-hub load window.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Regional Benchmarks & ISP latency */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Benchmarks */}
          <Card>
            <CardHeader>
              <CardTitle>Regional Benchmarks</CardTitle>
              <CardDescription>
                Compare edge network performance across Indian business regions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {Object.keys(regionalBenchmarks).map((r) => (
                  <Badge
                    key={r}
                    variant={selectedRegion === r ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedRegion(r)}
                  >
                    {r}
                  </Badge>
                ))}
              </div>

              {selectedRegion && (
                <div className="space-y-4 rounded-lg bg-muted/40 p-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm font-medium">Primary Tech Hub</span>
                    <span className="text-sm font-semibold">{regionalBenchmarks[selectedRegion].techHub}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm font-medium">Average Latency</span>
                    <Badge variant="secondary" className="font-semibold font-mono text-xs">
                      {regionalBenchmarks[selectedRegion].latency} ms
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm font-medium">Target Availability SLA</span>
                    <span className="text-sm font-semibold text-green-500">
                      {regionalBenchmarks[selectedRegion].uptime}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-sm font-medium">Expected Peak Load Hours</span>
                    <span className="text-sm font-semibold font-mono text-xs">
                      {regionalBenchmarks[selectedRegion].peak}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Edge Connectivity Level</span>
                    <span className="text-sm font-semibold">
                      {regionalBenchmarks[selectedRegion].quality}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ISP Latency comparisons */}
          <Card>
            <CardHeader>
              <CardTitle>ISP Connection Profile</CardTitle>
              <CardDescription>
                Latency benchmarks and market share of top Indian network carriers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ispLatency.map((isp) => (
                <div key={isp.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{isp.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-mono text-xs text-muted-foreground">Share: {isp.share}</span>
                      <span className="font-semibold text-xs">{isp.latency} ms</span>
                    </div>
                  </div>
                  <Progress value={Math.max(10, 100 - (isp.latency - 20) * 1.5)} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* DPDP Compliance & Insights */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* DPDP Compliance checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <ShieldAlert className="h-5 w-5" />
                DPDP Data Compliance Checklist
              </CardTitle>
              <CardDescription>
                Ensure compliance with the Digital Personal Data Protection Act of India.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {compliance ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 rounded border p-3 bg-card">
                    <span className="rounded bg-green-500/10 p-1 text-xs text-green-500 font-semibold">OK</span>
                    <div>
                      <div className="text-sm font-semibold">Data Localization Audit</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{compliance.dataLocalization}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded border p-3 bg-card">
                    <span className="rounded bg-green-500/10 p-1 text-xs text-green-500 font-semibold">OK</span>
                    <div>
                      <div className="text-sm font-semibold">Payment Gateway Compliance</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{compliance.auditRequirements}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded border p-3 bg-card">
                    <span className="rounded bg-green-500/10 p-1 text-xs text-green-500 font-semibold">OK</span>
                    <div>
                      <div className="text-sm font-semibold">Statutory Privacy Frameworks</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{compliance.privacyLaws}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded border p-3 bg-card">
                    <span className="rounded bg-amber-500/10 p-1 text-xs text-amber-500 font-semibold">WARN</span>
                    <div>
                      <div className="text-sm font-semibold">CERT-In Mandatory Incident Logs</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{compliance.securityStandards}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Loading compliance info...</div>
              )}
            </CardContent>
          </Card>

          {/* Market Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-500">
                <Globe className="h-5 w-5" />
                Regional Market Insights
              </CardTitle>
              <CardDescription>
                AI-driven analysis based on user demographic traffic behaviors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights ? (
                <div className="grid gap-3">
                  <div className="p-3 border rounded bg-card">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mobile First Infrastructure</div>
                    <div className="text-sm mt-1">{insights.mobileFirst}</div>
                  </div>
                  <div className="p-3 border rounded bg-card">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usage Wave Cycles</div>
                    <div className="text-sm mt-1">{insights.peakUsage}</div>
                  </div>
                  <div className="p-3 border rounded bg-card">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Language Translation Uplift</div>
                    <div className="text-sm mt-1">{insights.regionalLanguages}</div>
                  </div>
                  <div className="p-3 border rounded bg-card">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">UPI & Digital Transact Growth</div>
                    <div className="text-sm mt-1">{insights.digitalGrowth}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Loading market insights...</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Holidays Calendar list */}
        <Card>
          <CardHeader>
            <CardTitle>Indian Festival Calendar & Holiday Schedule</CardTitle>
            <CardDescription>Scheduled periods of high load where autoscale rules are triggered.</CardDescription>
          </CardHeader>
          <CardContent>
            {holidays.length === 0 ? (
              <div className="text-sm text-muted-foreground">No holidays retrieved.</div>
            ) : (
              <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {holidays.map((h, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-card flex flex-col justify-between">
                    <div>
                      <div className="font-semibold text-sm">{h.name}</div>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {h.type} {h.region ? `(${h.region})` : ""}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-3 font-mono">{h.date}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
