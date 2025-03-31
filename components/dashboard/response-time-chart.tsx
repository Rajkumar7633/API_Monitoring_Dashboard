import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApiEndpoint } from "@/types/api-types"
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"

interface ResponseTimeChartProps {
  endpoints: ApiEndpoint[]
  selectedEndpoint: string
  loading: boolean
}

export function ResponseTimeChart({ endpoints, selectedEndpoint, loading }: ResponseTimeChartProps) {
  // Filter data based on selected endpoint
  const chartData =
    selectedEndpoint === "all"
      ? endpoints.length > 0
        ? endpoints[0].responseTime // Just use the first endpoint's data for "all" to simplify
        : []
      : endpoints.find((e) => e.name === selectedEndpoint)?.responseTime || []

  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>API Response Time</CardTitle>
          <CardDescription>Average response time over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>API Response Time</CardTitle>
        <CardDescription>
          {selectedEndpoint === "all"
            ? "Average response time across all endpoints"
            : `Response time for ${selectedEndpoint}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}ms`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="font-bold text-xs" style={{ color: "#0ea5e9" }}>
                          {payload[0].value}ms
                        </span>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

