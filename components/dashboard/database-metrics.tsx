"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSocketEvent } from "@/lib/socket";

interface DatabaseMetrics {
  queries: {
    total: number;
    slow: number;
    average: number;
  };
  connections: {
    active: number;
    idle: number;
    max: number;
    usedPercentage: number;
  };
  slowQueries: {
    query: string;
    duration: number;
    timestamp: string;
  }[];
}

export function DatabaseMetricsPanel() {
  const dbMetrics = useSocketEvent<DatabaseMetrics | null>(
    "databaseMetrics",
    null
  );
  const loading = !dbMetrics;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Database Performance</CardTitle>
          <CardDescription>
            Query performance and connection pool metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Performance</CardTitle>
        <CardDescription>
          Query performance and connection pool metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Connection Pool */}
          <div>
            <h3 className="text-sm font-medium mb-2">Connection Pool</h3>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-medium">
                  {dbMetrics.connections.active}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Idle</p>
                <p className="text-lg font-medium">
                  {dbMetrics.connections.idle}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Max</p>
                <p className="text-lg font-medium">
                  {dbMetrics.connections.max}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Connection Usage</span>
                <span className="text-sm font-medium">
                  {dbMetrics.connections.usedPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={dbMetrics.connections.usedPercentage}
                className="h-2"
              />
            </div>
          </div>

          {/* Query Stats */}
          <div>
            <h3 className="text-sm font-medium mb-2">Query Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Queries</p>
                <p className="text-lg font-medium">
                  {dbMetrics.queries.total.toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Slow Queries</p>
                <p className="text-lg font-medium">{dbMetrics.queries.slow}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Avg. Duration</p>
                <p className="text-lg font-medium">
                  {dbMetrics.queries.average.toFixed(1)}ms
                </p>
              </div>
            </div>
          </div>

          {/* Slow Queries */}
          {dbMetrics.slowQueries.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Recent Slow Queries</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dbMetrics.slowQueries.map((query, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {query.query.length > 50
                            ? `${query.query.substring(0, 50)}...`
                            : query.query}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              query.duration > 500 ? "destructive" : "outline"
                            }
                          >
                            {query.duration.toFixed(1)}ms
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(query.timestamp).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
