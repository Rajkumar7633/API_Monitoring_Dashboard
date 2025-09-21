import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApiLog } from "@/types/api-types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

interface ErrorLogsProps {
  logs: ApiLog[]
  loading: boolean
}

export function ErrorLogs({ logs, loading }: ErrorLogsProps) {
  const uniqueLogs = useMemo(() => {
    const seen = new Set<string>()
    const out: ApiLog[] = []
    for (const l of logs || []) {
      const key = String((l as any).id)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(l)
      if (out.length >= 100) break // cap rows for performance
    }
    return out
  }, [logs])

  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ApiLog | null>(null)
  const [snap, setSnap] = useState<any | null>(null)
  const [snapLoading, setSnapLoading] = useState(false)
  const [snapError, setSnapError] = useState<string | null>(null)
  const [curl, setCurl] = useState<string>("")
  const { toast } = useToast()
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

  const handleDetails = (log: ApiLog) => {
    setSelected(log)
    setOpen(true)
  }

  const curlCmd = useMemo(() => {
    if (snap) return curl
    if (!selected) return ""
    const url = selected.endpoint || ''
    const method = 'GET'
    return `curl -i -X ${method} ${JSON.stringify(url)}`
  }, [selected, snap, curl])

  const viewSnapshot = async (endpoint: string) => {
    setOpen(true)
    setSnap(null)
    setSnapError(null)
    setSnapLoading(true)
    try {
      const list = await fetch(`${base}/api/errors/snapshots?hours=24`).then((r) => r.json())
      const item = (list?.items || []).find((it: any) => String(it.endpoint) === endpoint)
      if (!item) throw new Error("No snapshot found for this endpoint in last 24h")
      const full = await fetch(`${base}/api/errors/snapshots/${encodeURIComponent(item.id)}`).then((r) => r.json())
      const curlTxt = await fetch(`${base}/api/errors/snapshots/${encodeURIComponent(item.id)}/curl`).then((r) => r.text())
      setSnap(full)
      setCurl(curlTxt)
    } catch (e: any) {
      setSnapError(e?.message || 'No snapshot found')
    } finally {
      setSnapLoading(false)
    }
  }
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent API Failures</CardTitle>
          <CardDescription>Showing the most recent API errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-16" />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Recent API Failures</CardTitle>
        <CardDescription>Showing the most recent API errors</CardDescription>
      </CardHeader>
      <CardContent>
        {uniqueLogs.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No error logs found for the selected criteria.
          </div>
        ) : (
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
              {uniqueLogs.map((log) => (
                <TableRow key={String(log.id)}>
                  <TableCell className="font-medium">{log.endpoint}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{log.status}</Badge>
                  </TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDetails(log)}>
                      Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => viewSnapshot(log.endpoint)}>
                      View Snapshot
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>

    <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if(!v){ setSnap(null); setCurl("") } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{snap ? 'Error Snapshot' : 'Log Details'}</DialogTitle>
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
                <div className="font-mono break-all">{snap.traceId || '-'}</div>
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
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Reproduce (cURL)</div>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(curlCmd)}>Copy</Button>
              </div>
              <Input readOnly value={curlCmd} />
            </div>
          </div>
        ) : selected && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">Endpoint</div>
              <div className="font-mono break-all">{selected.endpoint}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="font-mono">{selected.status}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Time</div>
                <div>{new Date(selected.timestamp).toLocaleString()}</div>
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Message</div>
              <div className="font-mono break-words">{selected.message}</div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground">Quick cURL</div>
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(curlCmd)}>Copy</Button>
              </div>
              <Input readOnly value={curlCmd} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}

