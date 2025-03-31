import { SelectItem } from "@/components/ui/select"
import { SelectContent } from "@/components/ui/select"
import { SelectValue } from "@/components/ui/select"
import { SelectTrigger } from "@/components/ui/select"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import DashboardLayout from "@/components/dashboard/dashboard-layout"

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 md:gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your dashboard preferences and system settings.</p>
        </div>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Manage your dashboard preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" defaultValue="admin" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="admin@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="utc">
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC</SelectItem>
                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                        <SelectItem value="cst">Central Time (CST)</SelectItem>
                        <SelectItem value="mst">Mountain Time (MST)</SelectItem>
                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-refresh">Auto-refresh dashboard</Label>
                    <Switch id="auto-refresh" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="analytics">Enable usage analytics</Label>
                    <Switch id="analytics" defaultChecked />
                  </div>
                  <div className="flex justify-end">
                    <Button>Save Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of your dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Theme</Label>
                    <Select defaultValue="dark">
                      <SelectTrigger>
                        <SelectValue placeholder="Select theme" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="density">Display Density</Label>
                    <Select defaultValue="compact">
                      <SelectTrigger>
                        <SelectValue placeholder="Select density" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chart-animation">Chart Animations</Label>
                    <Switch id="chart-animation" defaultChecked />
                  </div>
                  <div className="flex justify-end">
                    <Button>Apply Changes</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Email Notifications</h3>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="email-critical" defaultChecked />
                        <label htmlFor="email-critical" className="text-sm">
                          Critical Alerts
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="email-warnings" defaultChecked />
                        <label htmlFor="email-warnings" className="text-sm">
                          Warnings
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="email-info" />
                        <label htmlFor="email-info" className="text-sm">
                          Informational
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">In-App Notifications</h3>
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="app-critical" defaultChecked />
                        <label htmlFor="app-critical" className="text-sm">
                          Critical Alerts
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="app-warnings" defaultChecked />
                        <label htmlFor="app-warnings" className="text-sm">
                          Warnings
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="app-info" defaultChecked />
                        <label htmlFor="app-info" className="text-sm">
                          Informational
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button>Save Preferences</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API keys for external integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Production API Key</h3>
                        <p className="text-sm text-muted-foreground">Last used 2 days ago</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Regenerate
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input value="sk_prod_2023_xxxxxxxxxxxxxxxxxxx" readOnly />
                      <Button variant="ghost" size="sm">
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Development API Key</h3>
                        <p className="text-sm text-muted-foreground">Last used 5 hours ago</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Regenerate
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input value="sk_dev_2023_xxxxxxxxxxxxxxxxxxx" readOnly />
                      <Button variant="ghost" size="sm">
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button>Create New API Key</Button>
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

