import { CpuIcon, HardDrive } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { ResourceMetrics } from "@/types/api-types"

interface SystemResourcesProps {
  metrics: ResourceMetrics | undefined
  loading: boolean
}

export function SystemResources({ metrics, loading }: SystemResourcesProps) {
  if (loading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array(2)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>
                  <Skeleton className="h-5 w-24" />
                </CardTitle>
                <CardDescription>
                  <Skeleton className="h-4 w-32" />
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <div className="grid grid-cols-3 gap-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>CPU Usage</CardTitle>
          <CardDescription>Current: {metrics.cpu.current}%</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CpuIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">System CPU</span>
              </div>
              <span className="font-medium">{metrics.cpu.current}%</span>
            </div>
            <Progress value={metrics.cpu.current} className="h-2" />
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <div className="font-medium">Peak</div>
                <div>{metrics.cpu.peak}%</div>
              </div>
              <div>
                <div className="font-medium">Average</div>
                <div>{metrics.cpu.average}%</div>
              </div>
              <div>
                <div className="font-medium">Cores</div>
                <div>{metrics.cpu.cores}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Memory Usage</CardTitle>
          <CardDescription>Current: {metrics.memory.usedPercentage}%</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">System Memory</span>
              </div>
              <span className="font-medium">{metrics.memory.usedPercentage}%</span>
            </div>
            <Progress value={metrics.memory.usedPercentage} className="h-2" />
            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <div className="font-medium">Total</div>
                <div>{metrics.memory.total} GB</div>
              </div>
              <div>
                <div className="font-medium">Used</div>
                <div>{metrics.memory.used} GB</div>
              </div>
              <div>
                <div className="font-medium">Free</div>
                <div>{metrics.memory.free} GB</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

