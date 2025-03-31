import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Bell, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import DashboardLayout from "@/components/dashboard/dashboard-layout"

export default function AlertsPage() {
  // Mock data for alerts
  const alerts = [
    {
      id: 1,
      type: "error",
      message: "High error rate on /api/auth endpoint",
      time: "2 minutes ago",
      service: "Authentication Service",
      details: "Error rate exceeded 5% threshold (currently at 7.2%)",
    },
    {
      id: 2,
      type: "warning",
      message: "CPU usage above 80% threshold",
      time: "15 minutes ago",
      service: "API Gateway",
      details: "CPU usage at 85% for more than 10 minutes",
    },
    {
      id: 3,
      type: "error",
      message: "Database connection failures detected",
      time: "32 minutes ago",
      service: "User Service",
      details: "5 consecutive connection failures to Users DB",
    },
    {
      id: 4,
      type: "warning",
      message: "Memory usage approaching limit",
      time: "1 hour ago",
      service: "Order Service",
      details: "Memory usage at 78% of allocated resources",
    },
    {
      id: 5,
      type: "error",
      message: "Payment processing failures",
      time: "2 hours ago",
      service: "Payment Service",
      details: "3 consecutive payment processing failures",
    },
    {
      id: 6,
      type: "warning",
      message: "Slow response time on product search",
      time: "3 hours ago",
      service: "Product Service",
      details: "Average response time increased to 850ms (threshold: 500ms)",
    },
    {
      id: 7,
      type: "info",
      message: "New deployment completed",
      time: "5 hours ago",
      service: "CI/CD Pipeline",
      details: "Version 2.3.1 deployed successfully to production",
    },
    {
      id: 8,
      type: "info",
      message: "Scheduled maintenance completed",
      time: "8 hours ago",
      service: "Analytics DB",
      details: "Index optimization completed successfully",
    },
  ]

  const activeAlerts = alerts.filter((alert) => alert.type === "error" || alert.type === "warning")
  const infoAlerts = alerts.filter((alert) => alert.type === "info")

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground">Monitor system alerts and notifications.</p>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Alerts</TabsTrigger>
            <TabsTrigger value="info">Informational</TabsTrigger>
            <TabsTrigger value="settings">Alert Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>Critical and warning alerts that require attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <div
                        className={`mt-0.5 rounded-full p-1 ${alert.type === "error" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alert.message}</p>
                          <Badge variant={alert.type === "error" ? "destructive" : "outline"}>
                            {alert.type === "error" ? "Critical" : "Warning"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.details}</p>
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="mr-1 h-3 w-3" />
                            {alert.time}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              Acknowledge
                            </Button>
                            <Button size="sm">Resolve</Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Informational Alerts</CardTitle>
                <CardDescription>System information and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {infoAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-4 rounded-lg border p-4">
                      <div className="mt-0.5 rounded-full p-1 bg-primary/20 text-primary">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">{alert.details}</p>
                        <div className="flex items-center text-xs text-muted-foreground pt-2">
                          <Clock className="mr-1 h-3 w-3" />
                          {alert.time}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Dismiss
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Alert Settings</CardTitle>
                <CardDescription>Configure alert thresholds and notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="error-threshold">Error Rate Threshold (%)</Label>
                      <Input id="error-threshold" type="number" defaultValue="5" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="response-threshold">Response Time Threshold (ms)</Label>
                      <Input id="response-threshold" type="number" defaultValue="500" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpu-threshold">CPU Usage Threshold (%)</Label>
                      <Input id="cpu-threshold" type="number" defaultValue="80" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="memory-threshold">Memory Usage Threshold (%)</Label>
                      <Input id="memory-threshold" type="number" defaultValue="75" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notification Channels</Label>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="email" checked />
                        <label
                          htmlFor="email"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Email Notifications
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="slack" checked />
                        <label
                          htmlFor="slack"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Slack Notifications
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="sms" />
                        <label
                          htmlFor="sms"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          SMS Notifications
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button>Save Settings</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

