import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  CalendarCheck,
  UserCog,
  Package,
  HeadphonesIcon,
  FileCheck,
  MapPin,
  FileText,
  Handshake,
  Info,
  Phone,
  ChevronRight,
  MessageSquare,
  MessageCircle,
  Clock,
  Palette,
  ImageIcon,
  Radio,
  CreditCard,
} from "lucide-react";

interface CommunicationAnalytics {
  chats: any[];
  calls: any[];
  summary: {
    totalChats: number;
    totalCalls: number;
    totalMessages: number;
    totalCallDuration: number;
  };
}

const adminSections = [
  {
    title: "Properties",
    description: "Review and manage property listings",
    icon: Building2,
    href: "/admin/properties",
    testId: "admin-nav-properties",
  },
  {
    title: "Bookings",
    description: "Manage all bookings",
    icon: CalendarCheck,
    href: "/admin/bookings",
    testId: "admin-nav-bookings",
  },
  {
    title: "Coming Soon Mode",
    description: "Control site access, whitelist testers, view signups",
    icon: Radio,
    href: "/admin/coming-soon",
    testId: "admin-nav-coming-soon",
  },
  {
    title: "Logo Settings",
    description: "Upload and update the website logo",
    icon: ImageIcon,
    href: "/admin/logo",
    testId: "admin-nav-logo",
  },
  {
    title: "Brand Assets",
    description: "Download logo files",
    icon: Palette,
    href: "/logo-gallery",
    testId: "admin-nav-brand-assets",
  },
  {
    title: "Users",
    description: "Manage user accounts",
    icon: Users,
    href: "/admin/users",
    testId: "admin-nav-users",
  },
  {
    title: "Owners",
    description: "Owner compliance & management",
    icon: UserCog,
    href: "/admin/owners",
    testId: "admin-nav-owners",
  },
  {
    title: "Subscriptions",
    description: "Manage owner subscription plans",
    icon: CreditCard,
    href: "/admin/subscriptions",
    testId: "admin-nav-subscriptions",
  },
  {
    title: "Inventory",
    description: "Monitor room availability",
    icon: Package,
    href: "/admin/inventory",
    testId: "admin-nav-inventory",
  },
  {
    title: "Support",
    description: "Customer support inbox",
    icon: HeadphonesIcon,
    href: "/admin/support",
    testId: "admin-nav-support",
  },
  {
    title: "KYC Verification",
    description: "Review KYC documents",
    icon: FileCheck,
    href: "/admin/kyc",
    testId: "admin-nav-kyc",
  },
  {
    title: "Destinations",
    description: "Manage destinations",
    icon: MapPin,
    href: "/admin/destinations",
    testId: "admin-nav-destinations",
  },
  {
    title: "Policies",
    description: "Terms & privacy policies",
    icon: FileText,
    href: "/admin/policies",
    testId: "admin-nav-policies",
  },
  {
    title: "Owner Agreements",
    description: "Manage owner agreements",
    icon: Handshake,
    href: "/admin/owner-agreements",
    testId: "admin-nav-agreements",
  },
  {
    title: "About Us",
    description: "Edit about us page",
    icon: Info,
    href: "/admin/about-us",
    testId: "admin-nav-about",
  },
  {
    title: "Contact Settings",
    description: "Manage contact information",
    icon: Phone,
    href: "/admin/contact-settings",
    testId: "admin-nav-contact",
  },
];

export default function AdminHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Communication analytics query for admin
  const { data: commAnalytics, isLoading: isLoadingCommAnalytics } =
    useQuery<CommunicationAnalytics>({
      queryKey: ["/api/communication/admin"],
      refetchInterval: 60000,
      enabled: user?.userRole === "admin",
    });

  // Check if user is admin
  if (user?.userRole !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            You need admin privileges to access this panel.
          </p>
          <Button
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-1">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Manage your platform
        </p>

        <div className="space-y-3 mb-6">
          {adminSections.map((section) => (
            <Card
              key={section.href}
              className="hover-elevate cursor-pointer"
              onClick={() => setLocation(section.href)}
              data-testid={section.testId}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm">{section.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Communication Analytics */}
        <Card data-testid="card-admin-communication-analytics">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              Platform Communication Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCommAnalytics ? (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Chat Sessions
                    </span>
                  </div>
                  <div
                    className="text-2xl font-bold text-blue-700 dark:text-blue-300"
                    data-testid="admin-comm-total-chats"
                  >
                    {commAnalytics?.summary?.totalChats || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                      Total Messages
                    </span>
                  </div>
                  <div
                    className="text-2xl font-bold text-purple-700 dark:text-purple-300"
                    data-testid="admin-comm-total-messages"
                  >
                    {commAnalytics?.summary?.totalMessages || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      Total Calls
                    </span>
                  </div>
                  <div
                    className="text-2xl font-bold text-green-700 dark:text-green-300"
                    data-testid="admin-comm-total-calls"
                  >
                    {commAnalytics?.summary?.totalCalls || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs text-amber-600 dark:text-blue-400 font-medium">
                      Call Duration
                    </span>
                  </div>
                  <div
                    className="text-2xl font-bold text-amber-700 dark:text-amber-300"
                    data-testid="admin-comm-call-duration"
                  >
                    {Math.round(
                      (commAnalytics?.summary?.totalCallDuration || 0) / 60,
                    )}{" "}
                    min
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
