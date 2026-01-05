import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import SlatesPage from "@/pages/slates";
import SlateDetailPage from "@/pages/slate-detail";
import GameWorkspacePage from "@/pages/game-workspace";
import FrameworksPage from "@/pages/frameworks";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";
import UpcomingGamesPage from "@/pages/upcoming-games";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SlatesPage} />
      <Route path="/upcoming" component={UpcomingGamesPage} />
      <Route path="/slates/:id" component={SlateDetailPage} />
      <Route path="/slates/:slateId/games/:gameId" component={GameWorkspacePage} />
      <Route path="/frameworks" component={FrameworksPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="slate-handicapper-theme">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background sticky top-0 z-50">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
