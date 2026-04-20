import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import type { Property } from "@shared/schema";
import { OwnerWelcomeModal } from "@/components/OwnerWelcomeModal";
import { KycPromptModal, useKycPromptModal } from "@/components/KycPromptModal";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
  FileText,
  HelpCircle,
  XCircle,
  AlertTriangle,
  Menu,
  CreditCard,
  Gift,
} from "lucide-react";

interface OwnerLayoutProps {
  children: React.ReactNode;
}

const fullMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/owner/dashboard" },
  { title: "Bookings", icon: CalendarCheck, path: "/owner/bookings" },
  { title: "Messages", icon: MessageSquare, path: "/owner/messages" },
  { title: "Property", icon: Building2, path: "/owner/property" },
  { title: "Earnings", icon: IndianRupee, path: "/owner/earnings" },
  { title: "Reviews", icon: Star, path: "/owner/reviews" },
  { title: "Subscription", icon: CreditCard, path: "/owner/subscription" },
  { title: "Refer & Earn", icon: Gift, path: "/owner/refer" },
  { title: "Settings", icon: Settings, path: "/owner/settings" },
];

const limitedMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/owner/dashboard" },
  { title: "My Property", icon: Building2, path: "/owner/property" },
  { title: "Documents", icon: FileText, path: "/list-property" },
  { title: "Support", icon: HelpCircle, path: "/owner/settings" },
];

const rejectedMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/owner/dashboard" },
  { title: "KYC Review", icon: AlertTriangle, path: "/owner/kyc" },
  { title: "My Property", icon: Building2, path: "/owner/property" },
  { title: "Support", icon: HelpCircle, path: "/owner/settings" },
];

export function OwnerLayout({ children }: OwnerLayoutProps) {
  const { user, isLoading, isOwner } = useAuth();
  const [location, setLocation] = useLocation();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Check if owner is suspended
  const isSuspended = user?.suspensionStatus === "suspended";

  // STRICT ROLE CHECK: Only allow access if user has 'owner' role
  // KYC status is used for menu/UI customization, NOT for granting access
  const canAccessOwnerPortal = isOwner;

  const { showModal: showKycPrompt, setShowModal: setShowKycPrompt } =
    useKycPromptModal(canAccessOwnerPortal, user?.kycStatus);

  const { data: ownerProperties = [] } = useQuery<Property[]>({
    queryKey: ["/api/owner/properties"],
    enabled: !!user && canAccessOwnerPortal,
  });

  const ownerPropertyId =
    ownerProperties.length > 0 ? ownerProperties[0].id : null;

  const isRejected = user?.kycStatus === "rejected";

  useEffect(() => {
    if (user && isOwner && !(user as any).hasSeenOwnerModal && !isRejected) {
      setShowWelcomeModal(true);
    }
  }, [user, isOwner, isRejected]);

  // NOTE: KYC redirects are now handled by centralized KycRouteGuard in App.tsx
  // No inline redirects here - navigation guards run AFTER route change

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        data-testid="owner-layout-loading"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Not authenticated - redirect to login
    window.location.href = "/login?returnTo=" + encodeURIComponent(location);
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        data-testid="owner-layout-redirecting"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canAccessOwnerPortal) {
    // Not an owner and hasn't engaged with KYC - redirect to home
    window.location.href = "/";
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        data-testid="owner-layout-redirecting"
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Block suspended owners from accessing the portal
  if (isSuspended) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-background px-4"
        data-testid="owner-suspended"
      >
        <div className="max-w-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Account Suspended
          </h1>
          <p className="text-muted-foreground">
            Your owner account has been suspended by the platform administrator.
            You are currently unable to access the owner portal or manage your
            properties.
          </p>
          {user?.suspensionReason && (
            <div className="bg-muted p-4 rounded-lg text-left">
              <p className="text-sm font-medium text-foreground mb-1">
                Reason for suspension:
              </p>
              <p className="text-sm text-muted-foreground">
                {user.suspensionReason}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            If you believe this is an error or would like to appeal this
            decision, please contact our support team at{" "}
            <a
              href="mailto:support@zecoho.com"
              className="text-primary hover:underline"
            >
              support@zecoho.com
            </a>
            .
          </p>
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </a>
          </Link>
        </div>
      </div>
    );
  }

  const listingMode = (user as any).listingMode;
  // NOTE: Listing mode redirect handled by centralized guard

  const userInitials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
    "O";

  const isVerified = user.kycStatus === "verified";
  const isQuickListing = listingMode === "quick";
  const isPreApproval = !isVerified;

  const menuItems = isRejected
    ? rejectedMenuItems
    : isPreApproval
      ? limitedMenuItems
      : fullMenuItems;

  // NOTE: KYC rejection redirect handled by centralized KycRouteGuard

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getBadgeContent = () => {
    if (isVerified) return "Verified Owner";
    if (isRejected) return "KYC Rejected";
    return "Pending Approval";
  };

  const getBadgeVariant = ():
    | "default"
    | "secondary"
    | "destructive"
    | "outline" => {
    if (isRejected) return "destructive";
    return "secondary";
  };

  // NOTE: All KYC redirects handled by centralized KycRouteGuard
  // No inline setLocation calls for KYC - just simple Links

  return (
    <>
      {!isRejected && (
        <>
          <OwnerWelcomeModal
            open={showWelcomeModal}
            onClose={() => setShowWelcomeModal(false)}
          />
          <KycPromptModal
            open={showKycPrompt && !showWelcomeModal}
            onClose={() => setShowKycPrompt(false)}
          />
        </>
      )}
      <SidebarProvider style={sidebarStyle}>
        <div className="flex min-h-[calc(100vh-4rem)] md:h-screen w-full">
          <Sidebar className="hidden md:flex">
            <SidebarHeader className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={user.profileImageUrl || undefined}
                    alt={user.firstName || "Owner"}
                  />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span
                    className="font-semibold text-sm truncate"
                    data-testid="owner-name"
                  >
                    {user.firstName} {user.lastName}
                  </span>
                  <Badge
                    variant={getBadgeVariant()}
                    className="w-fit text-xs pointer-events-none"
                    data-testid={
                      isRejected ? "owner-badge-rejected" : "owner-badge"
                    }
                  >
                    {isRejected && <XCircle className="h-3 w-3 mr-1" />}
                    {getBadgeContent()}
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
                          <Link
                            href={item.path}
                            data-testid={`nav-${item.title.toLowerCase()}`}
                          >
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

          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 pb-2">
                <SheetTitle className="text-left">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user.profileImageUrl || undefined}
                        alt={user.firstName || "Owner"}
                      />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm truncate">
                        {user.firstName} {user.lastName}
                      </span>
                      <Badge
                        variant={getBadgeVariant()}
                        className="w-fit text-xs pointer-events-none"
                      >
                        {isRejected && <XCircle className="h-3 w-3 mr-1" />}
                        {getBadgeContent()}
                      </Badge>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <Separator />
              <nav className="flex flex-col py-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      location === item.path
                        ? "text-primary bg-primary/5"
                        : "text-foreground hover-elevate"
                    }`}
                    data-testid={`drawer-nav-${item.title.toLowerCase()}`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                ))}
              </nav>
              <Separator className="my-1" />
              <nav className="flex flex-col py-2">
                <Link
                  href="/"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover-elevate"
                  data-testid="drawer-nav-back-home"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Home</span>
                </Link>
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover-elevate w-full text-left"
                  data-testid="drawer-nav-logout"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </nav>
            </SheetContent>
          </Sheet>

          <SidebarInset className="flex flex-col flex-1">
            <header className="flex h-14 items-center gap-4 border-b px-4 lg:px-6 sticky top-0 bg-background z-40">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setDrawerOpen(true)}
                data-testid="button-mobile-drawer"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <SidebarTrigger
                data-testid="sidebar-toggle"
                className="hidden md:flex"
              />
              <div className="flex-1">
                <h1 className="text-lg font-semibold" data-testid="page-title">
                  {menuItems.find((item) => item.path === location)?.title ||
                    "Owner Portal"}
                </h1>
              </div>
            </header>

            {isRejected && (
              <Link href="/owner/kyc">
                <div
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 flex items-center justify-center gap-2 font-semibold transition-colors cursor-pointer relative z-[10000]"
                  style={{ pointerEvents: "auto" }}
                  data-testid="kyc-rejection-banner"
                >
                  <XCircle className="h-5 w-5" />
                  KYC Rejected — Click here to fix verification
                </div>
              </Link>
            )}

            <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 md:pb-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </>
  );
}
