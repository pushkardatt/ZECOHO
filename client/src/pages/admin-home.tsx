import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
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
  Download,
  BarChart2,
  Trash2,
  Wrench,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface AdminCallLogEntry {
  id: string;
  date: string;
  actionType: "call" | "whatsapp";
  actorRole: string;
  callerName: string;
  callerPhone: string;
  propertyName: string;
  propertyId: string | null;
}

interface AdminCallLog {
  callLog: AdminCallLogEntry[];
  total: number;
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
    title: "Reports & Analytics",
    description: "Views, funnel, cancellations, searches, notifications, calls, audit trail",
    icon: BarChart2,
    href: "/admin/reports",
    testId: "admin-nav-reports",
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
  const { toast } = useToast();
  const [cleanupResult, setCleanupResult] = useState<{ deletedCount: number; skippedCount: number } | null>(null);
  const [timeFilter, setTimeFilter] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );

  const cleanupDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/cleanup-duplicate-properties");
      return res.json();
    },
    onSuccess: (data) => {
      setCleanupResult({ deletedCount: data.deletedCount, skippedCount: data.skippedCount });
      toast({ title: "Cleanup Complete", description: data.message });
    },
    onError: () => {
      toast({ title: "Cleanup Failed", description: "Something went wrong. Check the server logs.", variant: "destructive" });
    },
  });
  const [callLogFrom, setCallLogFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [callLogTo, setCallLogTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  // Detailed call log for admin
  const { data: adminCallLog, isLoading: isLoadingCallLog } =
    useQuery<AdminCallLog>({
      queryKey: ["/api/communication/admin/call-log", callLogFrom, callLogTo],
      queryFn: () =>
        fetch(
          `/api/communication/admin/call-log?from=${callLogFrom}&to=${callLogTo}`,
          { credentials: "include" },
        ).then((r) => r.json()),
      enabled: (user as any)?.userRole === "admin",
    });

  const handleCallLogDownload = () => {
    const url = `/api/communication/admin/call-log?from=${callLogFrom}&to=${callLogTo}&format=csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `zecoho-call-log-${callLogFrom}-to-${callLogTo}.csv`;
    a.click();
  };

  // Communication analytics query for admin
  const { data: commAnalytics, isLoading: isLoadingCommAnalytics } =
    useQuery<CommunicationAnalytics>({
      queryKey: ["/api/communication/admin", timeFilter],
      queryFn: () =>
        fetch(`/api/communication/admin?range=${timeFilter}`, {
          credentials: "include",
        }).then((r) => r.json()),
      refetchInterval: 300000,
      enabled: user?.userRole === "admin",
    });

  const handleDownload = () => {
    if (!commAnalytics?.summary) return;
    const rows = [
      ["Metric", "Value"],
      ["Period", timeFilter],
      ["Chat Sessions", String(commAnalytics.summary.totalChats ?? 0)],
      ["Total Messages", String(commAnalytics.summary.totalMessages ?? 0)],
      ["Total Calls", String(commAnalytics.summary.totalCalls ?? 0)],
      [
        "Call Duration (min)",
        String(Math.round((commAnalytics.summary.totalCallDuration ?? 0) / 60)),
      ],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-communication-analytics-${timeFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              Platform Communication Analytics
            </CardTitle>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Daily / Weekly / Monthly toggle */}
              <div className="flex rounded-lg border overflow-hidden text-sm">
                {(["daily", "weekly", "monthly"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTimeFilter(f)}
                    className={`px-3 py-1 capitalize transition-colors ${
                      timeFilter === f
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                    data-testid={`admin-comm-filter-${f}`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              {/* Download button */}
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1.5"
                data-testid="admin-comm-download-btn"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
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
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
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
            {!commAnalytics?.summary?.totalChats &&
              !commAnalytics?.summary?.totalCalls &&
              !isLoadingCommAnalytics && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  No communication data yet. Stats will appear as guests
                  interact with owners.
                </p>
              )}
          </CardContent>
        </Card>

        {/* Admin Call Log — full detail with date range + CSV download */}
        <Card data-testid="card-admin-call-log">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4" />
              Call & Contact Log
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                value={callLogFrom}
                onChange={(e) => setCallLogFrom(e.target.value)}
                className="border rounded px-2 py-1 text-xs bg-background"
                data-testid="admin-call-log-from"
              />
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                value={callLogTo}
                onChange={(e) => setCallLogTo(e.target.value)}
                className="border rounded px-2 py-1 text-xs bg-background"
                data-testid="admin-call-log-to"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleCallLogDownload}
                disabled={!adminCallLog?.callLog?.length}
                className="flex items-center gap-1.5"
                data-testid="admin-call-log-download"
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingCallLog ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !adminCallLog?.callLog?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No call or contact interactions in the selected period.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {adminCallLog.total} interaction{adminCallLog.total !== 1 ? "s" : ""} found
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left py-2 pr-4 font-medium">Date & Time</th>
                        <th className="text-left py-2 pr-4 font-medium">Type</th>
                        <th className="text-left py-2 pr-4 font-medium">Caller</th>
                        <th className="text-left py-2 pr-4 font-medium">Phone</th>
                        <th className="text-left py-2 pr-4 font-medium">Role</th>
                        <th className="text-left py-2 font-medium">Property</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminCallLog.callLog.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            {new Date(entry.date).toLocaleTimeString("en-IN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2 pr-4">
                            <span
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                                entry.actionType === "call"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              }`}
                            >
                              {entry.actionType === "call" ? (
                                <Phone className="h-3 w-3" />
                              ) : (
                                <MessageCircle className="h-3 w-3" />
                              )}
                              {entry.actionType === "call" ? "Call" : "WhatsApp"}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-xs">{entry.callerName}</td>
                          <td className="py-2 pr-4 font-mono text-xs">{entry.callerPhone}</td>
                          <td className="py-2 pr-4 text-xs capitalize text-muted-foreground">
                            {entry.actorRole}
                          </td>
                          <td className="py-2 text-xs max-w-[160px] truncate">
                            {entry.propertyName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {/* Data Maintenance */}
        <Card data-testid="card-admin-maintenance">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" />
              Data Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-4 p-3 rounded-lg border">
              <div>
                <p className="text-sm font-medium">Remove Duplicate Properties</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deletes extra property entries created by the wizard auto-save bug (same owner, same title). Keeps the newest copy. Skips any that have bookings.
                </p>
                {cleanupResult && (
                  <p className="text-xs mt-1.5 text-green-600 dark:text-green-400 font-medium">
                    Last run: removed {cleanupResult.deletedCount} duplicate{cleanupResult.deletedCount !== 1 ? "s" : ""}
                    {cleanupResult.skippedCount > 0 ? `, skipped ${cleanupResult.skippedCount} with bookings` : ""}.
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="flex-shrink-0 flex items-center gap-1.5"
                disabled={cleanupDuplicatesMutation.isPending}
                onClick={() => cleanupDuplicatesMutation.mutate()}
                data-testid="btn-cleanup-duplicate-properties"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {cleanupDuplicatesMutation.isPending ? "Running…" : "Run Cleanup"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
