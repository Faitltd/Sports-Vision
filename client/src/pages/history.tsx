import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">History</h1>
        <p className="text-muted-foreground text-sm">
          View past slates and analysis history
        </p>
      </div>

      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium mb-1">Coming Soon</h3>
            <p className="text-sm text-muted-foreground">
              History tracking will be available in a future update.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
