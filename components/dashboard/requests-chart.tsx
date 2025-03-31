import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { ApiEndpoint } from "@/types/api-types"
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts"

interface RequestsChartProps {
  endpoints: ApiEndpoint[]
  loading: boolean
}

export function RequestsChart({ endpoints, loading }: RequestsChartProps) {
  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>API Requests & Errors</CardTitle>
          <CardDescription>Requests and errors by endpoint</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Format data for the chart
  const chartData = endpoints.map((endpoint) => ({
    name: endpoint.name,
    requests: endpoint.requests,
    errors: endpoint.errors,
  }))

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>API Requests & Errors</CardTitle>
        <CardDescription>Requests and errors by endpoint</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">{label}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-2 w-2 rounded-full bg-[#0ea5e9]" />
                          <span className="text-xs">Requests: {payload[0]?.value}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-[#ef4444]" />
                          <span className="text-xs">Errors: {payload[1]?.value}</span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
            <Bar dataKey="requests" fill="#0ea5e9" name="Requests" radius={[4, 4, 0, 0]} />
            <Bar dataKey="errors" fill="#ef4444" name="Errors" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

