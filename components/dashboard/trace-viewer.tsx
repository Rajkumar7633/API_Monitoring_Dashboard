"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface TraceSpan {
  id: string
  parentId?: string
  name: string
  service: string
  startTime: number
  duration: number
  tags: Record<string, string>
}

interface Trace {
  id: string
  name: string
  startTime: number
  duration: number
  spans: TraceSpan[]
}

interface TraceViewerProps {
  trace?: Trace
  onClose: () => void
}

export function TraceViewer({ trace, onClose }: TraceViewerProps) {
  const [activeTab, setActiveTab] = useState("timeline")

  if (!trace) {
    return null
  }

  // Calculate relative positions for timeline visualization
  const traceStart = trace.startTime
  const traceEnd = traceStart + trace.duration
  const traceDuration = trace.duration

  // Sort spans by start time
  const sortedSpans = [...trace.spans].sort((a, b) => a.startTime - b.startTime)

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Distributed Trace</CardTitle>
          <CardDescription>
            Trace ID: {trace.id} | Duration: {trace.duration}ms
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="spans">Spans</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-2">
              {sortedSpans.map((span) => {
                const startOffset = ((span.startTime - traceStart) / traceDuration) * 100
                const widthPercent = (span.duration / traceDuration) * 100

                return (
                  <div key={span.id} className="relative h-8">
                    <div className="absolute top-0 h-full bg-muted w-full rounded-sm"></div>
                    <div
                      className="absolute top-0 h-full bg-primary rounded-sm flex items-center px-2 text-xs text-primary-foreground"
                      style={{
                        left: `${startOffset}%`,
                        width: `${Math.max(widthPercent, 2)}%`,
                      }}
                    >
                      {widthPercent > 10 ? `${span.name} (${span.duration}ms)` : ""}
                    </div>
                    {widthPercent <= 10 && (
                      <div
                        className="absolute top-0 left-0 h-full flex items-center px-2 text-xs"
                        style={{ marginLeft: `${startOffset + widthPercent + 1}%` }}
                      >
                        {span.name} ({span.duration}ms)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="text-xs text-muted-foreground">
              Total trace duration: {trace.duration}ms from {new Date(trace.startTime).toISOString()}
            </div>
          </TabsContent>

          <TabsContent value="spans">
            <div className="space-y-3">
              {sortedSpans.map((span) => (
                <div key={span.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{span.name}</div>
                    <Badge variant="outline">{span.service}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Duration:</div>
                    <div>{span.duration}ms</div>
                    <div className="text-muted-foreground">Start Time:</div>
                    <div>{new Date(span.startTime).toISOString()}</div>
                    <div className="text-muted-foreground">Span ID:</div>
                    <div className="font-mono text-xs">{span.id}</div>
                    {span.parentId && (
                      <>
                        <div className="text-muted-foreground">Parent ID:</div>
                        <div className="font-mono text-xs">{span.parentId}</div>
                      </>
                    )}
                  </div>
                  {Object.keys(span.tags).length > 0 && (
                    <div className="mt-2">
                      <div className="text-sm font-medium mb-1">Tags:</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(span.tags).map(([key, value]) => (
                          <div key={key} className="col-span-2 grid grid-cols-2">
                            <div className="text-muted-foreground">{key}:</div>
                            <div>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="raw">
            <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">{JSON.stringify(trace, null, 2)}</pre>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

