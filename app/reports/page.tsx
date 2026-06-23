"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { FileText, Download, Clock, Plus, Trash, CheckCircle } from "lucide-react"

export default function ReportsPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([
    { id: "sch-1", name: "Daily SLA Compliant Check", template: "Daily SLA & Compliance Report", cron: "0 8 * * *", active: true },
    { id: "sch-2", name: "Weekly Ops Digest", template: "Weekly Performance Trend", cron: "0 0 * * 0", active: true }
  ])
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const base = process.env.NEXT_PUBLIC_API_URL || ""

  const loadData = async () => {
    try {
      const [tRes, hRes] = await Promise.all([
        fetch(`${base}/api/reports/templates`),
        fetch(`${base}/api/reports/history`)
      ])

      if (tRes.ok) setTemplates(await tRes.ok ? await tRes.json() : [])
      if (hRes.ok) setHistory(await hRes.ok ? await hRes.json() : [])
    } catch {}
  }

  useEffect(() => {
    loadData()
  }, [base])

  const handleGenerate = async (templateId: string) => {
    setGeneratingId(templateId)
    try {
      const res = await fetch(`${base}/api/reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId })
      })
      const json = await res.json()
      if (res.ok) {
        toast({ title: "Report generated", description: `Successfully created report ${json.id}` })
        setHistory((prev) => [json, ...prev])
      } else {
        throw new Error(json.error || "Generation failed")
      }
    } catch (e: any) {
      toast({ title: "Failed to generate", description: e.message, variant: "destructive" })
    } finally {
      setGeneratingId(null)
    }
  }

  const handleDownload = async (id: string, format: string) => {
    toast({ title: "Download started", description: `Fetching report-${id}.${format}…` })
    try {
      const res = await fetch(`${base}/api/reports/${id}/download`)
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `report-${id}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast({ title: "Download complete", description: `report-${id}.${format} saved successfully.` })
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" })
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        {/* Title */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Reports & Scheduled Exports</h1>
          <p className="text-muted-foreground">
            Configure automated service compliance records, export log metrics for external audits, and schedule periodic health digests.
          </p>
        </div>

        {/* Templates */}
        <div>
          <h2 className="text-xl font-semibold mb-3">Report Templates</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {templates.length === 0 ? (
              <>
                <Card className="flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-base">Daily SLA & Compliance Report</CardTitle>
                    <CardDescription>P95 latency performance, DPDP borders localization check, and availability targets.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center mt-4">
                      <Badge>PDF</Badge>
                      <Button size="sm" onClick={() => handleGenerate("daily-sla")} disabled={generatingId !== null}>
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-base">Weekly Performance Trend</CardTitle>
                    <CardDescription>Aggregates query parameters, traffic peaks, and database resource statistics.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center mt-4">
                      <Badge variant="secondary">EXCEL</Badge>
                      <Button size="sm" onClick={() => handleGenerate("weekly-performance")} disabled={generatingId !== null}>
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Incident Log Summary</CardTitle>
                    <CardDescription>Historic timeline logs, triggered alarm audits, MTTA, and MTTR results.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center mt-4">
                      <Badge variant="outline">CSV</Badge>
                      <Button size="sm" onClick={() => handleGenerate("monthly-incidents")} disabled={generatingId !== null}>
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              templates.map((t) => (
                <Card key={t.id} className="flex flex-col justify-between">
                  <CardHeader>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <CardDescription>{t.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center mt-4">
                      <Badge variant={(t.format || t.formats?.[0] || "pdf") === "excel" ? "secondary" : (t.format || t.formats?.[0] || "pdf") === "csv" ? "outline" : "default"}>
                        {(t.format || t.formats?.[0] || "pdf").toUpperCase()}
                      </Badge>
                      <Button size="sm" onClick={() => handleGenerate(t.id)} disabled={generatingId !== null}>
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Scheduled Runs & Export History */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Scheduled Reports */}
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">Scheduled Pipelines</CardTitle>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {schedules.map((sch) => (
                <div key={sch.id} className="flex justify-between items-start border p-3 rounded-lg bg-card">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">{sch.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{sch.cron} ({sch.template})</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => {
                      setSchedules((prev) => prev.filter((s) => s.id !== sch.id))
                      toast({ title: "Schedule deleted", description: `${sch.name} has been removed.` })
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Generated History */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
              <CardDescription>Download compiled SLA reports and log extractions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="text-muted-foreground border-b pb-2">
                      <th className="pb-2">Report ID</th>
                      <th className="pb-2">Template</th>
                      <th className="pb-2">Format</th>
                      <th className="pb-2">Size</th>
                      <th className="pb-2">Generated</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted-foreground py-8">
                          No history available.
                        </td>
                      </tr>
                    ) : (
                      history.map((row) => (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-3 font-mono text-xs">{row.id}</td>
                          <td className="py-3 capitalize">{row.templateId.replace("-", " ")}</td>
                          <td className="py-3">
                            <Badge variant={row.format === "excel" ? "secondary" : row.format === "csv" ? "outline" : "default"}>
                              {row.format.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 font-mono text-xs">{row.size}</td>
                          <td className="py-3 text-xs text-muted-foreground">{new Date(row.generatedAt).toLocaleString()}</td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(row.id, row.format)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
