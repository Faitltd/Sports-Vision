import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Key, Bell, Database, Layers } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { FrameworksManager } from "@/components/frameworks-manager";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [frameworksOpen, setFrameworksOpen] = useState(false);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-page-title">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your application preferences
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["appearance"]} className="space-y-4">
        <AccordionItem value="appearance">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <span>Appearance</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="frameworks">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              <span>Frameworks</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Framework Management</CardTitle>
                <CardDescription>Weights, rules, and version history</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Open the framework manager to edit weights and rules.
                </div>
                <Button variant="outline" onClick={() => setFrameworksOpen(true)}>
                  Manage Frameworks
                </Button>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="api-keys">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <span>API Keys</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Integrations</CardTitle>
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <span>Notifications</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="data">
          <AccordionTrigger>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <span>Data Management</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Sheet open={frameworksOpen} onOpenChange={setFrameworksOpen}>
        <SheetContent className="w-full sm:max-w-5xl p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Framework Manager</SheetTitle>
          </SheetHeader>
          <FrameworksManager embedded />
        </SheetContent>
      </Sheet>
    </div>
  );
}
