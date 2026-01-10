import { Link, useLocation } from "wouter";
import { 
  LayoutGrid, 
  Settings, 
  Layers,
  ChevronDown,
  CalendarSearch
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Framework } from "@shared/schema";

const navItems = [
  {
    title: "Slates",
    url: "/",
    icon: LayoutGrid,
  },
  {
    title: "Upcoming",
    url: "/upcoming",
    icon: CalendarSearch,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();
  
  const { data: frameworks = [] } = useQuery<Framework[]>({
    queryKey: ["/api/frameworks"],
  });

  const { data: activeFramework } = useQuery<Framework>({
    queryKey: ["/api/frameworks/active"],
  });

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-sm">
              SH
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm" data-testid="text-app-title">Slate Handicapper</span>
              <span className="text-xs text-muted-foreground">NCAAF Analysis</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="flex items-center justify-between w-full px-3 py-2 text-sm bg-sidebar-accent rounded-md hover-elevate"
                data-testid="dropdown-framework-selector"
              >
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span className="truncate">
                    {activeFramework?.name || "No Framework"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {activeFramework && (
                    <Badge variant="secondary" className="text-xs">
                      v{activeFramework.version}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {frameworks.map((framework) => (
                <DropdownMenuItem 
                  key={framework.id}
                  data-testid={`menu-item-framework-${framework.id}`}
                >
                  <span>{framework.name}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    v{framework.version}
                  </Badge>
                </DropdownMenuItem>
              ))}
              {frameworks.length === 0 && (
                <DropdownMenuItem disabled>
                  No frameworks available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="text-xs text-muted-foreground">
          Framework-Driven Analysis
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
