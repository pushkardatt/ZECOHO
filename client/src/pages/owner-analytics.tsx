import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { Link } from "wouter";
import {
  Eye,
  CalendarCheck,
  IndianRupee,
  Star,
  MessageSquare,
  TrendingUp,
  BarChart2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

function StatCard({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            {loading ? (
              <>
                <Skeleton className="h-7 w-20 mb-1" />
                <Skeleton className="h-4 w-28" />
              </>
            ) : (
              <>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
              </>
            )}
          </div>
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OwnerAnalytics() {
  const [viewDays, setViewDays] = useState("30");
  const { features, isLoading: featuresLoading } = usePlanFeatures();

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/owner/stats"],
    queryFn: () => apiRequest("GET", "/api/owner/stats").then((r) => r.json()),
    staleTime: 0,
  });

  const { data: commData, isLoading: commLoading } = useQuery<any>({
    queryKey: ["/api/communication/owner", "monthly"],
    queryFn: () =>
      apiRequest("GET", "/api/communication/owner?range=monthly").then((r) => r.json()),
    staleTime: 0,
  });

  const { data: viewData, isLoading: viewsLoading } = useQuery<any>({
    queryKey: ["/api/owner/analytics/views", viewDays],
    queryFn: () =>
      apiRequest("GET", `/api/owner/analytics/views?days=${viewDays}`).then((r) => r.json()),
    staleTime: 0,
  });

  if (!featuresLoading && !features.analyticsEnabled) {
    return (
      <OwnerLayout>
        <Alert className="mb-6">
          <BarChart2 className="h-4 w-4" />
          <AlertTitle>Analytics Not Included</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>
              Your current plan does not include the Analytics dashboard. Upgrade
              to Standard or Premium to access detailed insights.
            </span>
            <Link href="/owner/subscription">
              <Button size="sm">Upgrade Plan</Button>
            </Link>
          </AlertDescription>
        </Alert>
      </OwnerLayout>
    );
  }

  const isLoading = statsLoading || commLoading || viewsLoading;

  const monthlySummary = stats?.monthlySummary ?? {};
  const totalMonthlyBookings =
    (monthlySummary.confirmed ?? 0) +
    (monthlySummary.completed ?? 0) +
    (monthlySummary.cancelled ?? 0) +
    (monthlySummary.rejected ?? 0) +
    (monthlySummary.noShow ?? 0) +
    (monthlySummary.pending ?? 0);

  const statusBreakdown = [
    {
      label: "Confirmed",
      value: monthlySummary.confirmed ?? 0,
      color: "bg-green-500",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
    },
    {
      label: "Completed",
      value: monthlySummary.completed ?? 0,
      color: "bg-blue-500",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />,
    },
    {
      label: "Pending",
      value: monthlySummary.pending ?? 0,
      color: "bg-yellow-500",
      icon: <Clock className="h-3.5 w-3.5 text-yellow-600" />,
    },
    {
      label: "Cancelled",
      value: monthlySummary.cancelled ?? 0,
      color: "bg-red-400",
      icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
    },
    {
      label: "No Show",
      value: monthlySummary.noShow ?? 0,
      color: "bg-orange-400",
      icon: <AlertCircle className="h-3.5 w-3.5 text-orange-500" />,
    },
    {
      label: "Rejected",
      value: monthlySummary.rejected ?? 0,
      color: "bg-gray-400",
      icon: <XCircle className="h-3.5 w-3.5 text-gray-500" />,
    },
  ];

  const properties: any[] = viewData?.properties ?? [];
  const maxViews = Math.max(...properties.map((p) => p.views), 1);

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Performance overview for your properties
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Eye className="h-4 w-4 text-muted-foreground" />}
            label={`Views (last ${viewDays}d)`}
            value={viewData?.totalViews ?? 0}
            loading={viewsLoading}
          />
          <StatCard
            icon={<CalendarCheck className="h-4 w-4 text-muted-foreground" />}
            label="Bookings this month"
            value={stats?.bookingsThisMonth ?? 0}
            loading={statsLoading}
          />
          <StatCard
            icon={<IndianRupee className="h-4 w-4 text-muted-foreground" />}
            label="Revenue this month"
            value={stats ? `₹${(stats.revenueThisMonth ?? 0).toLocaleString("en-IN")}` : "—"}
            loading={statsLoading}
          />
          <StatCard
            icon={<Star className="h-4 w-4 text-muted-foreground" />}
            label="Avg rating"
            value={stats?.avgRating ? `${stats.avgRating} ★` : "—"}
            sub={stats?.reviewCount ? `${stats.reviewCount} reviews` : undefined}
            loading={statsLoading}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Booking status breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Booking breakdown — this month
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : totalMonthlyBookings === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No bookings this month yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {statusBreakdown
                    .filter((s) => s.value > 0)
                    .map((s) => (
                      <div key={s.label} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            {s.icon} {s.label}
                          </span>
                          <span className="font-medium">
                            {s.value}
                            <span className="text-muted-foreground font-normal ml-1">
                              ({Math.round((s.value / totalMonthlyBookings) * 100)}%)
                            </span>
                          </span>
                        </div>
                        <Progress
                          value={(s.value / totalMonthlyBookings) * 100}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  <div className="pt-2 border-t text-sm flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium">{totalMonthlyBookings}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communication stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Communication — this month
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Active conversations</span>
                    <span className="font-semibold">{commData?.totalChats ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Messages exchanged</span>
                    <span className="font-semibold">{commData?.totalMessages ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Calls made</span>
                    <span className="font-semibold">{commData?.totalCalls ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Avg response time</span>
                    <span className="font-semibold">
                      {commData?.avgResponseTimeHours != null
                        ? `${commData.avgResponseTimeHours}h`
                        : "—"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Property views */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Property views
              </CardTitle>
              <Select value={viewDays} onValueChange={setViewDays}>
                <SelectTrigger className="w-28 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {viewsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No properties found.
              </p>
            ) : (
              <div className="space-y-3">
                {properties
                  .sort((a, b) => b.views - a.views)
                  .map((p) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 truncate max-w-[70%]">
                          <span className="truncate font-medium">{p.title}</span>
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0"
                          >
                            {p.status}
                          </Badge>
                        </span>
                        <span className="font-medium shrink-0">{p.views} views</span>
                      </div>
                      <Progress value={(p.views / maxViews) * 100} className="h-1.5" />
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
