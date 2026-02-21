'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity, 
  AlertTriangle, 
  Clock, 
  Users, 
  Server,
  Plus,
  Settings,
  Save,
  Trash2,
  Move,
  Maximize2
} from 'lucide-react'

interface Widget {
  id: string
  type: 'metric' | 'chart' | 'alert' | 'table' | 'custom'
  title: string
  x: number
  y: number
  width: number
  height: number
  config: Record<string, any>
  data?: any
}

interface Dashboard {
  id: string
  name: string
  description: string
  widgets: Widget[]
  layout: 'grid' | 'free'
  createdAt: Date
  updatedAt: Date
}

const WIDGET_TYPES = [
  { type: 'metric', name: 'Metric Card', icon: Activity, description: 'Display key metrics' },
  { type: 'chart', name: 'Chart', icon: LineChart, description: 'Line, bar, or pie charts' },
  { type: 'alert', name: 'Alert Panel', icon: AlertTriangle, description: 'Recent alerts' },
  { type: 'table', name: 'Data Table', icon: Server, description: 'Tabular data display' },
  { type: 'custom', name: 'Custom Widget', icon: Settings, description: 'Custom content' }
]

const METRICS = [
  { key: 'requests', name: 'Total Requests', unit: 'count' },
  { key: 'errorRate', name: 'Error Rate', unit: '%' },
  { key: 'responseTime', name: 'Response Time', unit: 'ms' },
  { key: 'cpu', name: 'CPU Usage', unit: '%' },
  { key: 'memory', name: 'Memory Usage', unit: '%' },
  { key: 'uptime', name: 'Uptime', unit: '%' }
]

export function DashboardBuilder() {
  const [dashboard, setDashboard] = useState<Dashboard>({
    id: 'default',
    name: 'My Dashboard',
    description: 'Custom monitoring dashboard',
    widgets: [],
    layout: 'grid',
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedWidget, setDraggedWidget] = useState<Widget | null>(null)
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)

  const addWidget = useCallback((type: string) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type: type as Widget['type'],
      title: `New ${type}`,
      x: 0,
      y: 0,
      width: 4,
      height: 3,
      config: {}
    }
    
    setDashboard(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
      updatedAt: new Date()
    }))
    
    setIsAddWidgetOpen(false)
  }, [])

  const updateWidget = useCallback((widgetId: string, updates: Partial<Widget>) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === widgetId ? { ...w, ...updates } : w),
      updatedAt: new Date()
    }))
  }, [])

  const deleteWidget = useCallback((widgetId: string) => {
    setDashboard(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
      updatedAt: new Date()
    }))
    setSelectedWidget(null)
  }, [])

  const handleDragStart = useCallback((widget: Widget, e: React.MouseEvent) => {
    setIsDragging(true)
    setDraggedWidget(widget)
    e.preventDefault()
  }, [])

  const handleDragEnd = useCallback((e: React.MouseEvent) => {
    if (!draggedWidget || !gridRef.current) return

    const rect = gridRef.current.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) / 80) // 80px per grid unit
    const y = Math.floor((e.clientY - rect.top) / 80)

    updateWidget(draggedWidget.id, { 
      x: Math.max(0, Math.min(x, 12 - draggedWidget.width)),
      y: Math.max(0, Math.min(y, 12 - draggedWidget.height))
    })

    setIsDragging(false)
    setDraggedWidget(null)
  }, [draggedWidget, updateWidget])

  const renderWidgetContent = (widget: Widget) => {
    switch (widget.type) {
      case 'metric':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">1,234</div>
              <div className="text-sm text-gray-600">Total Requests</div>
              <div className="text-xs text-green-600">↑ 12% from last hour</div>
            </div>
          </div>
        )
      
      case 'chart':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
              <LineChart className="h-8 w-8 text-gray-400" />
              <span className="ml-2 text-gray-500">Chart visualization</span>
            </div>
          </div>
        )
      
      case 'alert':
        return (
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm">High error rate on /api/users</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">Slow response on /api/orders</span>
            </div>
          </div>
        )
      
      case 'table':
        return (
          <div className="p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left">Endpoint</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td>/api/users</td>
                  <td><Badge variant="default">OK</Badge></td>
                  <td className="text-right">120ms</td>
                </tr>
                <tr className="border-b">
                  <td>/api/orders</td>
                  <td><Badge variant="destructive">Error</Badge></td>
                  <td className="text-right">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        )
      
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Settings className="h-8 w-8 mx-auto mb-2" />
              <div>Custom Widget</div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Builder</h1>
          <p className="text-gray-600">Create custom monitoring dashboards</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Widget</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                {WIDGET_TYPES.map(({ type, name, icon: Icon, description }) => (
                  <Card 
                    key={type}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => addWidget(type)}
                  >
                    <CardContent className="p-4 text-center">
                      <Icon className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <div className="font-medium">{name}</div>
                      <div className="text-sm text-gray-600">{description}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Dashboard
          </Button>
        </div>
      </div>

      {/* Dashboard Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Dashboard Name</label>
              <Input 
                value={dashboard.name}
                onChange={(e) => setDashboard(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter dashboard name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input 
                value={dashboard.description}
                onChange={(e) => setDashboard(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Layout</label>
              <Select value={dashboard.layout} onValueChange={(value: 'grid' | 'free') => 
                setDashboard(prev => ({ ...prev, layout: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid Layout</SelectItem>
                  <SelectItem value="free">Free Layout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Canvas</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={gridRef}
                className="relative bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg"
                style={{ height: '600px' }}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {dashboard.widgets.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Plus className="h-12 w-12 mx-auto mb-4" />
                      <div className="text-lg font-medium">No widgets yet</div>
                      <div className="text-sm">Click "Add Widget" to get started</div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {dashboard.widgets.map(widget => (
                      <div
                        key={widget.id}
                        className={`absolute border-2 rounded-lg bg-white cursor-move transition-all ${
                          selectedWidget?.id === widget.id 
                            ? 'border-blue-500 shadow-lg' 
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                        style={{
                          left: `${widget.x * 80}px`,
                          top: `${widget.y * 80}px`,
                          width: `${widget.width * 80 - 8}px`,
                          height: `${widget.height * 80 - 8}px`,
                          zIndex: selectedWidget?.id === widget.id ? 10 : 1
                        }}
                        onMouseDown={(e) => handleDragStart(widget, e)}
                        onClick={() => setSelectedWidget(widget)}
                      >
                        <div className="p-4 h-full overflow-hidden">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm truncate">{widget.title}</h4>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <Move className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteWidget(widget.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="h-full">
                            {renderWidgetContent(widget)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Widget Properties */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Widget Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedWidget ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Widget Type</label>
                    <div className="mt-1">
                      <Badge variant="outline">
                        {selectedWidget.type}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input 
                      value={selectedWidget.title}
                      onChange={(e) => updateWidget(selectedWidget.id, { title: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">Width</label>
                      <Input 
                        type="number"
                        value={selectedWidget.width}
                        onChange={(e) => updateWidget(selectedWidget.id, { width: parseInt(e.target.value) || 1 })}
                        min="1"
                        max="12"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Height</label>
                      <Input 
                        type="number"
                        value={selectedWidget.height}
                        onChange={(e) => updateWidget(selectedWidget.id, { height: parseInt(e.target.value) || 1 })}
                        min="1"
                        max="12"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">X Position</label>
                      <Input 
                        type="number"
                        value={selectedWidget.x}
                        onChange={(e) => updateWidget(selectedWidget.id, { x: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="12"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Y Position</label>
                      <Input 
                        type="number"
                        value={selectedWidget.y}
                        onChange={(e) => updateWidget(selectedWidget.id, { y: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="12"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {selectedWidget.type === 'metric' && (
                    <div>
                      <label className="text-sm font-medium">Metric</label>
                      <Select 
                        value={selectedWidget.config.metric || ''}
                        onValueChange={(value) => updateWidget(selectedWidget.id, { 
                          config: { ...selectedWidget.config, metric: value } 
                        })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select metric" />
                        </SelectTrigger>
                        <SelectContent>
                          {METRICS.map(metric => (
                            <SelectItem key={metric.key} value={metric.key}>
                              {metric.name} ({metric.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Settings className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-sm">Select a widget to edit properties</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
