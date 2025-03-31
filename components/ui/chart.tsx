"use client"

import type * as React from "react"
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ChartProps {
  data: any[]
  valueKey: string
  categoryKey: string
  color?: string
  strokeWidth?: number
}

export const ChartContainer = ({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) => {
  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      {children}
    </ResponsiveContainer>
  )
}

export const ChartGrid = () => {
  return <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
}

export const ChartLine = ({ data, valueKey, categoryKey, color = "#0ea5e9", strokeWidth = 2 }: ChartProps) => {
  if (!data || data.length === 0) {
    return null
  }

  return (
    <Line
      type="monotone"
      dataKey={valueKey}
      stroke={color}
      strokeWidth={strokeWidth}
      dot={{ r: 3 }}
      activeDot={{ r: 5 }}
    />
  )
}

export const ChartBar = ({ data, valueKey, categoryKey, color = "#0ea5e9" }: ChartProps) => {
  if (!data || data.length === 0) {
    return null
  }

  return <Bar dataKey={valueKey} fill={color} radius={[4, 4, 0, 0]} />
}

export const ChartXAxis = () => {
  return <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
}

export const ChartYAxis = () => {
  return (
    <YAxis
      stroke="hsl(var(--muted-foreground))"
      fontSize={12}
      tickLine={false}
      axisLine={false}
      tickFormatter={(value) => `${value}`}
    />
  )
}

export const ChartTooltip = () => {
  return (
    <RechartsTooltip
      content={({ active, payload, label }) => {
        if (active && payload && payload.length) {
          return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  {payload.map((item, index) => (
                    <span key={index} className="font-bold text-xs" style={{ color: item.color }}>
                      {item.name}: {item.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        }
        return null
      }}
    />
  )
}

export const Chart = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return <>{children}</>
}

export const ChartLineChart = ({
  data,
  className,
}: {
  data: any[]
  className?: string
}) => {
  return (
    <RechartsLineChart data={data} className={className}>
      {/* Children will be ChartLine, ChartXAxis, etc. */}
    </RechartsLineChart>
  )
}

export const ChartBarChart = ({
  data,
  className,
}: {
  data: any[]
  className?: string
}) => {
  return (
    <RechartsBarChart data={data} className={className}>
      {/* Children will be ChartBar, ChartXAxis, etc. */}
    </RechartsBarChart>
  )
}

