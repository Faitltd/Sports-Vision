import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Key, Bell, Database } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your application preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize how the application looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Use dark theme for better visibility in low light
                </p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>API Keys</CardTitle>
            </div>
            <CardDescription>Manage your API integrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="perplexity">Perplexity API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="perplexity"
                  type="password"
                  value="••••••••••••••••"
                  readOnly
                  className="flex-1"
                  data-testid="input-perplexity-key"
                />
                <Button variant="outline">Update</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used for news research and evidence gathering
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Research Complete</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when game research is complete
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-notify-research" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Line Movement</Label>
                <p className="text-sm text-muted-foreground">
                  Notify when lines move significantly
                </p>
              </div>
              <Switch data-testid="switch-notify-lines" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Data Management</CardTitle>
            </div>
            <CardDescription>Manage your stored data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Clear Cache</Label>
                <p className="text-sm text-muted-foreground">
                  Clear cached research data
                </p>
              </div>
              <Button variant="outline" data-testid="button-clear-cache">
                Clear
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Export All Data</Label>
                <p className="text-sm text-muted-foreground">
                  Download all your slates and analysis
                </p>
              </div>
              <Button variant="outline" data-testid="button-export-all">
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
