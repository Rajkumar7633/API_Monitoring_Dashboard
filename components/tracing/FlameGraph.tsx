'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ZoomIn, ZoomOut, Download, RefreshCw } from 'lucide-react'

interface Span {
  id: string
  traceId: string
  parentId?: string
  operationName: string
  serviceName: string
  startTime: number
  duration: number
  tags: Record<string, any>
  status: 'ok' | 'error' | 'timeout'
  children?: Span[]
}

interface FlameGraphProps {
  traces: Span[]
  width?: number
  height?: number
  onSpanClick?: (span: Span) => void
}

export function FlameGraph({ traces, width = 800, height = 400, onSpanClick }: FlameGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null)
  const [hoveredSpan, setHoveredSpan] = useState<Span | null>(null)
  const [processedTraces, setProcessedTraces] = useState<Span[]>([])

  // Process traces into hierarchical structure
  useEffect(() => {
    const spanMap = new Map<string, Span>()
    const rootSpans: Span[] = []

    // Create span map
    traces.forEach(span => {
      spanMap.set(span.id, { ...span, children: [] })
    })

    // Build hierarchy
    traces.forEach(span => {
      const currentSpan = spanMap.get(span.id)!
      if (span.parentId && spanMap.has(span.parentId)) {
        const parent = spanMap.get(span.parentId)!
        if (!parent.children) parent.children = []
        parent.children.push(currentSpan)
      } else {
        rootSpans.push(currentSpan)
      }
    })

    setProcessedTraces(rootSpans)
  }, [traces])

  // Calculate colors based on duration and status
  const getSpanColor = (span: Span) => {
    const intensity = Math.min(span.duration / 1000, 1) // Normalize to 0-1
    if (span.status === 'error') return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`
    if (span.status === 'timeout') return `rgba(245, 158, 11, ${0.3 + intensity * 0.7})`
    
    // Gradient from blue to green based on performance
    const hue = 200 - intensity * 60 // Blue to green
    return `hsla(${hue}, 70%, 50%, ${0.6 + intensity * 0.4})`
  }

  // Render span rectangles
  const renderSpan = (span: Span, x: number, y: number, width: number, depth: number = 0): React.ReactNode => {
    const spanHeight = 25
    const isHovered = hoveredSpan?.id === span.id
    const isSelected = selectedSpan?.id === span.id

    return (
      <g key={span.id}>
        <rect
          x={x}
          y={y}
          width={width}
          height={spanHeight}
          fill={getSpanColor(span)}
          stroke={isSelected ? '#3b82f6' : isHovered ? '#64748b' : 'none'}
          strokeWidth={isSelected ? 2 : isHovered ? 1 : 0}
          rx={2}
          className="cursor-pointer transition-all"
          onClick={() => {
            setSelectedSpan(span)
            onSpanClick?.(span)
          }}
          onMouseEnter={() => setHoveredSpan(span)}
          onMouseLeave={() => setHoveredSpan(null)}
        />
        {width > 50 && (
          <text
            x={x + 5}
            y={y + spanHeight / 2 + 4}
            fontSize="11"
            fill="white"
            className="pointer-events-none select-none"
          >
            {span.operationName.length > Math.floor(width / 8) 
              ? span.operationName.substring(0, Math.floor(width / 8)) + '...'
              : span.operationName
            }
          </text>
        )}
        {span.children && span.children.map((child, index) => {
          const childX = x + (index * width / span.children!.length)
          const childWidth = width / span.children!.length
          return renderSpan(child, childX, y + spanHeight + 2, childWidth, depth + 1)
        })}
      </g>
    )
  }

  // Calculate total trace duration
  const totalDuration = Math.max(...traces.map(t => t.startTime + t.duration)) - 
                       Math.min(...traces.map(t => t.startTime))

  const exportSVG = () => {
    if (!svgRef.current) return
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const blob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trace-${Date.now()}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Distributed Tracing - Flame Graph</CardTitle>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={exportSVG}>
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export SVG</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Fast (&lt;100ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Medium (100-500ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Slow (&gt;500ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Error</span>
            </div>
          </div>

          {/* Flame Graph */}
          <div className="border rounded-lg overflow-auto bg-gray-50">
            <svg
              ref={svgRef}
              width={width * zoomLevel}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              className="w-full"
            >
              {/* Grid lines */}
              {Array.from({ length: 5 }, (_, i) => (
                <line
                  key={i}
                  x1={0}
                  y1={(height / 5) * i}
                  x2={width}
                  y2={(height / 5) * i}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}
              
              {/* Time axis */}
              <text x={5} y={height - 5} fontSize="10" fill="#6b7280">0ms</text>
              <text x={width / 2 - 15} y={height - 5} fontSize="10" fill="#6b7280">
                {Math.round(totalDuration / 2)}ms
              </text>
              <text x={width - 30} y={height - 5} fontSize="10" fill="#6b7280">
                {totalDuration}ms
              </text>

              {/* Render spans */}
              {processedTraces.map((trace, index) => {
                const traceWidth = width / processedTraces.length
                const traceX = index * traceWidth
                return renderSpan(trace, traceX, 20, traceWidth - 2)
              })}
            </svg>
          </div>

          {/* Selected Span Details */}
          {selectedSpan && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Span Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Operation:</span> {selectedSpan.operationName}
                  </div>
                  <div>
                    <span className="font-medium">Service:</span> {selectedSpan.serviceName}
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {selectedSpan.duration}ms
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge variant={selectedSpan.status === 'ok' ? 'default' : 'destructive'}>
                      {selectedSpan.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Trace ID:</span> 
                    <code className="ml-1 text-xs bg-gray-100 px-1 rounded">{selectedSpan.traceId}</code>
                  </div>
                  <div>
                    <span className="font-medium">Span ID:</span>
                    <code className="ml-1 text-xs bg-gray-100 px-1 rounded">{selectedSpan.id}</code>
                  </div>
                </div>
                
                {selectedSpan.tags && Object.keys(selectedSpan.tags).length > 0 && (
                  <div>
                    <span className="font-medium text-sm">Tags:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(selectedSpan.tags).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {String(value)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trace Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{traces.length}</div>
                <p className="text-sm text-gray-600">Total Spans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{totalDuration}ms</div>
                <p className="text-sm text-gray-600">Total Duration</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {traces.filter(t => t.status === 'error').length}
                </div>
                <p className="text-sm text-gray-600">Error Spans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {Math.round(traces.reduce((sum, t) => sum + t.duration, 0) / traces.length)}ms
                </div>
                <p className="text-sm text-gray-600">Avg Duration</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
