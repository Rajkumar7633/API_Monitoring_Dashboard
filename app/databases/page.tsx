import { Database } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { DatabaseMetricsPanel } from "@/components/dashboard/database-metrics"

export default function DatabasesPage() {
  // Mock data for databases
  const databases = [
    {
      id: 1,
      name: "Users DB",
      type: "PostgreSQL",
      status: "Online",
      connections: 42,
      storage: { used: 65, total: 100 },
      queries: 1250,
    },
    {
      id: 2,
      name: "Products DB",
      type: "MongoDB",
      status: "Online",
      connections: 28,
      storage: { used: 32, total: 100 },
      queries: 980,
    },
    {
      id: 3,
      name: "Orders DB",
      type: "PostgreSQL",
      status: "Online",
      connections: 35,
      storage: { used: 48, total: 100 },
      queries: 1120,
    },
    {
      id: 4,
      name: "Analytics DB",
      type: "ClickHouse",
      status: "Maintenance",
      connections: 5,
      storage: { used: 78, total: 100 },
      queries: 320,
    },
    {
      id: 5,
      name: "Cache",
      type: "Redis",
      status: "Online",
      connections: 120,
      storage: { used: 22, total: 100 },
      queries: 4500,
    },
  ]

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Databases</h1>
          <p className="text-muted-foreground">Monitor and manage your database instances.</p>
        </div>

        {/* Database Performance Metrics */}
        <DatabaseMetricsPanel />

        {/* Database Instances */}
        <Card>
          <CardHeader>
            <CardTitle>Database Instances</CardTitle>
            <CardDescription>Overview of all database instances and their current status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Database Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connections</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Queries/min</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {databases.map((db) => (
                  <TableRow key={db.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        {db.name}
                      </div>
                    </TableCell>
                    <TableCell>{db.type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          db.status === "Online" ? "default" : db.status === "Maintenance" ? "outline" : "destructive"
                        }
                      >
                        {db.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{db.connections}</TableCell>
                    <TableCell>
                      <div className="w-32">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs">{db.storage.used}%</span>
                          <span className="text-xs text-muted-foreground">{db.storage.total} GB</span>
                        </div>
                        <Progress value={db.storage.used} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>{db.queries}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

