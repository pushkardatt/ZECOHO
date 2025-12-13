import { useLocation, Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  Building2,
  IndianRupee,
  Star,
  Settings,
  ArrowLeft,
  LogOut,
} from "lucide-react";

interface OwnerLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/owner/dashboard" },
  { title: "Bookings", icon: CalendarCheck, path: "/owner/bookings" },
  { title: "Messages", icon: MessageSquare, path: "/owner/messages" },
  { title: "Property", icon: Building2, path: "/owner/property" },
  { title: "Earnings", icon: IndianRupee, path: "/owner/earnings" },
  { title: "Reviews", icon: Star, path: "/owner/reviews" },
  { title: "Settings", icon: Settings, path: "/owner/settings" },
];

export function OwnerLayout({ children }: OwnerLayoutProps) {
  const { user, isLoading, isOwner } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="owner-layout-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isOwner) {
    return <Redirect to="/" />;
  }

  const userInitials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "O";

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "Owner"} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm truncate" data-testid="owner-name">
                  {user.firstName} {user.lastName}
                </span>
                <Badge variant="secondary" className="w-fit text-xs" data-testid="owner-badge">
                  {user.kycStatus === "verified" ? "Verified Owner" : "Owner"}
                </Badge>
              </div>
            </div>
          </SidebarHeader>
          
          <Separator className="mx-2" />
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.path}
                        tooltip={item.title}
                      >
                        <Link href={item.path} data-testid={`nav-${item.title.toLowerCase()}`}>
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

          <SidebarFooter className="p-2">
            <Separator className="mb-2" />
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Back to Home">
                  <Link href="/" data-testid="nav-back-home">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleLogout}
                  tooltip="Logout"
                  data-testid="nav-logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6">
            <SidebarTrigger data-testid="sidebar-toggle" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold" data-testid="page-title">
                {menuItems.find((item) => item.path === location)?.title || "Owner Portal"}
              </h1>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
