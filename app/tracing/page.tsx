'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FlameGraph } from '@/components/tracing/FlameGraph'
import { Search, Filter, Download, Eye, Clock, AlertTriangle } from 'lucide-react'

interface Trace {
  id: string
  traceId: string
  operationName: string
  serviceName: string
  startTime: number
  duration: number
  status: 'ok' | 'error' | 'timeout'
  tags: Record<string, any>
  parentId?: string
}

interface TraceGroup {
  traceId: string
  spans: Trace[]
  totalDuration: number
  errorCount: number
  serviceCount: number
  startTime: number
}

export default function TracingPage() {
  const [traces, setTraces] = useState<Trace[]>([])
  const [traceGroups, setTraceGroups] = useState<TraceGroup[]>([])
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Mock data for demonstration
  useEffect(() => {
    const mockTraces: Trace[] = [
      {
        id: 'span-1',
        traceId: 'trace-001',
        operationName: 'HTTP GET /api/users',
        serviceName: 'api-gateway',
        startTime: Date.now() - 1000,
        duration: 245,
        status: 'ok',
        tags: { 'http.method': 'GET', 'http.status_code': 200 }
      },
      {
        id: 'span-2',
        traceId: 'trace-001',
        operationName: 'Database Query: SELECT users',
        serviceName: 'user-service',
        startTime: Date.now() - 900,
        duration: 120,
        status: 'ok',
        tags: { 'db.type': 'postgresql', 'db.statement': 'SELECT * FROM users' },
        parentId: 'span-1'
      },
      {
        id: 'span-3',
        traceId: 'trace-001',
        operationName: 'Cache Lookup: user:123',
        serviceName: 'cache-service',
        startTime: Date.now() - 850,
        duration: 15,
        status: 'ok',
        tags: { 'cache.hit': 'true' },
        parentId: 'span-2'
      },
      {
        id: 'span-4',
        traceId: 'trace-002',
        operationName: 'HTTP POST /api/orders',
        serviceName: 'api-gateway',
        startTime: Date.now() - 500,
        duration: 890,
        status: 'error',
        tags: { 'http.method': 'POST', 'http.status_code': 500 }
      },
      {
        id: 'span-5',
        traceId: 'trace-002',
        operationName: 'Process Payment',
        serviceName: 'payment-service',
        startTime: Date.now() - 450,
        duration: 750,
        status: 'error',
        tags: { 'payment.gateway': 'stripe', 'error.type': 'timeout' },
        parentId: 'span-4'
      },
      {
        id: 'span-6',
        traceId: 'trace-003',
        operationName: 'HTTP GET /api/products',
        serviceName: 'api-gateway',
        startTime: Date.now() - 200,
        duration: 180,
        status: 'ok',
        tags: { 'http.method': 'GET', 'http.status_code': 200 }
      },
      {
        id: 'span-7',
        traceId: 'trace-003',
        operationName: 'Elasticsearch Query',
        serviceName: 'search-service',
        startTime: Date.now() - 150,
        duration: 95,
        status: 'ok',
        tags: { 'es.index': 'products', 'es.query.size': 20 },
        parentId: 'span-6'
      }
    ]

    // Group traces by traceId
    const grouped = mockTraces.reduce((acc, trace) => {
      if (!acc[trace.traceId]) {
        acc[trace.traceId] = []
      }
      acc[trace.traceId].push(trace)
      return acc
    }, {} as Record<string, Trace[]>)

    const traceGroups: TraceGroup[] = Object.entries(grouped).map(([traceId, spans]) => ({
      traceId,
      spans,
      totalDuration: Math.max(...spans.map(s => s.startTime + s.duration)) - Math.min(...spans.map(s => s.startTime)),
      errorCount: spans.filter(s => s.status === 'error').length,
      serviceCount: new Set(spans.map(s => s.serviceName)).size,
      startTime: Math.min(...spans.map(s => s.startTime))
    }))

    setTraces(mockTraces)
    setTraceGroups(traceGroups)
    setIsLoading(false)
  }, [])

  // Get unique services for filter
  const services = Array.from(new Set(traces.map(t => t.serviceName)))

  // Filter trace groups
  const filteredTraceGroups = traceGroups.filter(group => {
    const matchesSearch = group.traceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.spans.some(span => span.operationName.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'error' && group.errorCount > 0) ||
                         (statusFilter === 'ok' && group.errorCount === 0)
    
    const matchesService = serviceFilter === 'all' ||
                         group.spans.some(span => span.serviceName === serviceFilter)

    return matchesSearch && matchesStatus && matchesService
  })

  const selectedTrace = traceGroups.find(g => g.traceId === selectedTraceId)

  const handleSpanClick = (span: Trace) => {
    console.log('Span clicked:', span)
    // Could open a modal with detailed span information
  }

  const exportTraces = () => {
    const data = JSON.stringify(traceGroups, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `traces-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Distributed Tracing</h1>
          <p className="text-gray-600">Visualize and analyze request flows across services</p>
        </div>
        <Button onClick={exportTraces} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Traces
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search traces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ok">Success</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map(service => (
                  <SelectItem key={service} value={service}>{service}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="h-4 w-4" />
              {filteredTraceGroups.length} of {traceGroups.length} traces
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="flamegraph" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flamegraph">Flame Graph</TabsTrigger>
          <TabsTrigger value="list">Trace List</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="flamegraph" className="space-y-4">
          {selectedTrace ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Trace {selectedTrace.traceId}</h3>
                  <p className="text-sm text-gray-600">
                    {selectedTrace.spans.length} spans • {selectedTrace.totalDuration}ms total
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSelectedTraceId(null)}>
                  Back to all traces
                </Button>
              </div>
              <FlameGraph 
                traces={selectedTrace.spans} 
                onSpanClick={handleSpanClick}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Trace</h3>
                <p className="text-gray-600">Choose a trace from the list below to view its flame graph</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="grid gap-4">
            {filteredTraceGroups.map(group => (
              <Card key={group.traceId} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedTraceId(group.traceId)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{group.traceId}</code>
                        {group.errorCount > 0 && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {group.errorCount} errors
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {group.totalDuration}ms
                        </span>
                        <span>{group.spans.length} spans</span>
                        <span>{group.serviceCount} services</span>
                        <span>{new Date(group.startTime).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(group.spans.map(s => s.serviceName))).map(service => (
                          <Badge key={service} variant="outline" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Timeline View</h3>
              <p className="text-gray-600">Interactive timeline visualization coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
