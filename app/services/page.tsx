import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DashboardLayout from "@/components/dashboard/dashboard-layout"
import { ServiceHealthPanel } from "@/components/dashboard/service-health"

export default function ServicesPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">Monitor and manage your microservices.</p>
        </div>

        {/* Service Health Panel */}
        <ServiceHealthPanel />

        {/* Dependency Map */}
        <Card>
          <CardHeader>
            <CardTitle>Service Dependencies</CardTitle>
            <CardDescription>Visualize service dependencies and communication patterns</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] flex items-center justify-center">
            <div className="text-muted-foreground">Service dependency visualization would be displayed here</div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

