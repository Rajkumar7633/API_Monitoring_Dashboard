"use client"; 

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocketEvent } from "@/lib/socket";

interface ServiceHealth {
  id: number;
  name: string;
  status: "Healthy" | "Degraded" | "Unhealthy";
  uptime: string;
  responseTime: number;
  lastChecked: string;
}

export function ServiceHealthPanel() {
  const services = useSocketEvent<ServiceHealth[]>("serviceHealth", []);
  const loading = services.length === 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Service Health</CardTitle>
          <CardDescription>
            Status of dependent services and APIs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Count services by status
  const healthyCounts = {
    healthy: services.filter((s) => s.status === "Healthy").length,
    degraded: services.filter((s) => s.status === "Degraded").length,
    unhealthy: services.filter((s) => s.status === "Unhealthy").length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Health</CardTitle>
        <CardDescription>Status of dependent services and APIs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md border p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Healthy
              </div>
              <div className="text-2xl font-bold text-green-500">
                {healthyCounts.healthy}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Degraded
              </div>
              <div className="text-2xl font-bold text-amber-500">
                {healthyCounts.degraded}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Unhealthy
              </div>
              <div className="text-2xl font-bold text-red-500">
                {healthyCounts.unhealthy}
              </div>
            </div>
          </div>

          {/* Service Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Last Checked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      {service.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          service.status === "Healthy"
                            ? "default"
                            : service.status === "Degraded"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {service.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          service.responseTime > 200
                            ? "text-destructive"
                            : service.responseTime > 100
                            ? "text-warning"
                            : ""
                        }
                      >
                        {service.responseTime}ms
                      </span>
                    </TableCell>
                    <TableCell>{service.uptime}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(service.lastChecked).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
