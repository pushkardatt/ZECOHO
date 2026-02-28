import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { OwnerLayout } from "@/components/OwnerLayout";
import { PreApprovalDashboard } from "@/components/PreApprovalDashboard";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarCheck,
  IndianRupee,
  Building2,
  Star,
  TrendingUp,
  Eye,
  Edit,
  MessageSquare,
  CheckCircle2,
  FileEdit,
  ArrowRight,
  Pause,
  Power,
  Play,
  BedDouble,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  LogIn,
  LogOut,
  AlertTriangle,
  MapPin,
  Package,
  ClipboardList,
  XCircle,
  Phone,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { usePropertyUpdates } from "@/hooks/usePropertyUpdates";
import { useBookingUpdates } from "@/hooks/useBookingUpdates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface OwnerStats {
  bookingsToday: number;
  bookingsThisMonth: number;
  revenueToday: number;
  revenueThisMonth: number;
  propertyStatus: string;
  avgRating: number;
  reviewCount: number;
  properties: { id: string; title: string; status: string; pricePerNight: string }[];
  hasDraftProperty?: boolean;
  draftPropertyId?: string;
  // Action-focused stats
  pendingRequests: number;
  ongoingStays: number;
  todaysCheckIns: number;
  todaysCheckOuts: number;
  monthlySummary: {
    confirmed: number;
    completed: number;
    cancelled: number;
    rejected: number;
    noShow: number;
    pending: number;
    totalRevenue: number;
  };
  alerts: { type: string; message: string; link: string }[];
}

interface MonthlySummary {
  year: number;
  month: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  rejected: number;
  noShow: number;
  pending: number;
  totalRevenue: number;
}

interface RoomUtilization {
  propertyId: string;
  propertyTitle: string;
  dateRange: { startDate: string; endDate: string };
  roomTypes: {
    roomTypeId: string;
    roomTypeName: string;
    totalRooms: number;
    confirmedRooms: number;
    pendingRooms: number;
    availableRooms: number;
  }[];
}

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

interface DateUtilization {
  propertyId: string;
  roomTypeId: string;
  dateRange: { startDate: string; endDate: string };
  dates: {
    date: string;
    confirmedRooms: number;
    pendingRooms: number;
    availableRooms: number;
    totalRooms: number;
  }[];
}

function RoomTypeUtilizationRow({ 
  propertyId, 
  rt 
}: { 
  propertyId: string; 
  rt: { roomTypeId: string; roomTypeName: string; totalRooms: number; confirmedRooms: number; pendingRooms: number; availableRooms: number }
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: dateUtilization, isLoading: dateLoading } = useQuery<DateUtilization>({
    queryKey: ["/api/owner/properties", propertyId, "rooms", rt.roomTypeId, "utilization"],
    queryFn: async () => {
      const response = await fetch(`/api/owner/properties/${propertyId}/rooms/${rt.roomTypeId}/utilization`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch date utilization");
      return response.json();
    },
    enabled: isOpen,
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className="p-3 rounded-md border space-y-2"
        data-testid={`room-utilization-${rt.roomTypeId}`}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between gap-2 cursor-pointer hover-elevate rounded p-1 -m-1">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              <span className="font-medium truncate" data-testid={`text-roomtype-${rt.roomTypeId}`}>
                {rt.roomTypeName}
              </span>
            </div>
            <Badge variant="secondary" data-testid={`badge-total-${rt.roomTypeId}`}>
              {rt.totalRooms} total
            </Badge>
          </div>
        </CollapsibleTrigger>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div
            className="flex items-center gap-1 px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            data-testid={`badge-confirmed-${rt.roomTypeId}`}
          >
            <Check className="h-3 w-3" />
            <span>{rt.confirmedRooms} Booked</span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
            data-testid={`badge-pending-${rt.roomTypeId}`}
          >
            <Clock className="h-3 w-3" />
            <span>{rt.pendingRooms} Pending</span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            data-testid={`badge-available-${rt.roomTypeId}`}
          >
            <BedDouble className="h-3 w-3" />
            <span>{rt.availableRooms} Available</span>
          </div>
        </div>
        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Date-wise Availability</p>
            {dateLoading ? (
              <div className="space-y-1">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : dateUtilization?.dates && dateUtilization.dates.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-1">
                <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground pb-1 border-b sticky top-0 bg-background">
                  <span>Date</span>
                  <span className="text-center">Booked</span>
                  <span className="text-center">Pending</span>
                  <span className="text-center">Available</span>
                  <span className="text-center">Status</span>
                </div>
                {dateUtilization.dates.map((d) => {
                  const isFull = d.availableRooms === 0;
                  const hasBookings = d.confirmedRooms > 0 || d.pendingRooms > 0;
                  return (
                    <div 
                      key={d.date} 
                      className={`grid grid-cols-5 gap-2 text-xs py-1 ${isFull ? 'bg-red-50 dark:bg-red-900/20' : hasBookings ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                      data-testid={`date-row-${d.date}`}
                    >
                      <span className="font-medium">
                        {format(new Date(d.date), "EEE, MMM d")}
                      </span>
                      <span className={`text-center ${d.confirmedRooms > 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                        {d.confirmedRooms}
                      </span>
                      <span className={`text-center ${d.pendingRooms > 0 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground'}`}>
                        {d.pendingRooms}
                      </span>
                      <span className={`text-center ${d.availableRooms > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}`}>
                        {d.availableRooms}
                      </span>
                      <span className="text-center">
                        {isFull ? (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">Full</Badge>
                        ) : d.availableRooms < d.totalRooms ? (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">Partial</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">Open</Badge>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No data available</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function RoomUtilizationCard({ propertyId }: { propertyId: string }) {
  const { data: utilization, isLoading } = useQuery<RoomUtilization>({
    queryKey: ["/api/owner/properties", propertyId, "utilization"],
    queryFn: async () => {
      const response = await fetch(`/api/owner/properties/${propertyId}/utilization`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch utilization");
      return response.json();
    },
    enabled: !!propertyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!utilization?.roomTypes || utilization.roomTypes.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground" data-testid="no-room-types">
        <BedDouble className="mx-auto h-8 w-8 mb-2" />
        <p className="text-sm">No room types configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="room-utilization-list">
      {utilization.roomTypes.map((rt) => (
        <RoomTypeUtilizationRow key={rt.roomTypeId} propertyId={propertyId} rt={rt} />
      ))}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Cache invalidation via WebSocket (urgent alert is handled globally in App.tsx)
  useBookingUpdates({ userId: user?.id });

  // Listen for service worker messages (push action buttons)
  useEffect(() => {
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BOOKING_ACTION') {
        const { action, bookingId } = event.data;
        if (action === 'accept') {
          apiRequest("POST", `/api/bookings/${bookingId}/confirm`, {})
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
              queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
              queryClient.invalidateQueries({ queryKey: ["/api/bookings", bookingId] });
            })
            .catch(console.error);
        } else if (action === 'reject') {
          apiRequest("POST", `/api/bookings/${bookingId}/reject`, { responseMessage: "Unable to accommodate." })
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
              queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
              queryClient.invalidateQueries({ queryKey: ["/api/bookings", bookingId] });
            })
            .catch(console.error);
        }
        // Log the push action
        apiRequest("POST", "/api/push/log-action", { bookingId, action, channel: 'web_push' }).catch(console.error);
        setUrgentAlert(null);
        setShowBanner(null);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  }, []);

  // Month selection state for monthly summary (defaults to current month)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-indexed
  
  const { data: stats, isLoading } = useQuery<OwnerStats>({
    queryKey: ["/api/owner/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  // Separate query for monthly summary with month selection
  const { data: monthlySummary, isLoading: isLoadingMonthlySummary } = useQuery<MonthlySummary>({
    queryKey: ["/api/owner/monthly-summary", selectedYear, selectedMonth],
    queryFn: async () => {
      const response = await fetch(`/api/owner/monthly-summary?year=${selectedYear}&month=${selectedMonth}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch monthly summary");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Communication analytics query
  const { data: commAnalytics, isLoading: isLoadingCommAnalytics } = useQuery<CommunicationAnalytics>({
    queryKey: ["/api/communication/owner"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Real-time property status updates via WebSocket
  usePropertyUpdates({ userId: user?.id });

  const pauseMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("PATCH", `/api/properties/${propertyId}/pause`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      toast({ title: "Property paused", description: "Your property is now hidden from search results." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to pause property", variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("PATCH", `/api/properties/${propertyId}/resume`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      toast({ title: "Property resumed", description: "Your property is now visible in search results." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to resume property", variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return apiRequest("PATCH", `/api/properties/${propertyId}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      toast({ title: "Property deactivated", description: "Your property has been deactivated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to deactivate property", variant: "destructive" });
    },
  });

  const isPreApproval = user && user.kycStatus !== "verified";

  if (isPreApproval) {
    return (
      <OwnerLayout>
        <PreApprovalDashboard user={user} />
      </OwnerLayout>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      published: { variant: "default", label: "Published" },
      draft: { variant: "secondary", label: "Draft" },
      pending: { variant: "outline", label: "Pending Review" },
      rejected: { variant: "destructive", label: "Rejected" },
      paused: { variant: "outline", label: "Paused" },
      deactivated: { variant: "destructive", label: "Deactivated" },
      none: { variant: "secondary", label: "No Property" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const hasPublishedProperty = stats?.properties?.some(p => p.status === "published");
  const hasDraftProperty = stats?.properties?.some(p => p.status === "draft");
  const hasPausedProperty = stats?.properties?.some(p => p.status === "paused");
  const draftProperty = stats?.properties?.find(p => p.status === "draft");

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-dashboard">
        {hasPublishedProperty && (
          <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" data-testid="banner-property-live">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">Your property is live!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Guests can now discover and book your property. Make sure your calendar and pricing are up to date.
            </AlertDescription>
          </Alert>
        )}

        {hasPausedProperty && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" data-testid="banner-property-paused">
            <Pause className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Property paused</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Your property is currently hidden from search results. Resume listing to start receiving bookings again.
            </AlertDescription>
          </Alert>
        )}

        {hasDraftProperty && draftProperty && (
          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" data-testid="banner-resume-draft">
            <FileEdit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">Complete your property listing</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300 flex flex-col sm:flex-row sm:items-center gap-2">
              <span>You have an incomplete property draft: "{draftProperty.title}"</span>
              <Link href="/list-property">
                <Button size="sm" variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover-elevate" data-testid="btn-resume-draft">
                  Resume <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Dynamic Alerts from API */}
        {stats?.alerts && stats.alerts.length > 0 && (
          <div className="space-y-2">
            {stats.alerts.map((alert, index) => (
              <Alert 
                key={`${alert.type}-${index}`}
                variant={alert.type === "kyc" ? "destructive" : "default"}
                className={
                  alert.type === "location" 
                    ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
                    : alert.type === "inventory"
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                    : ""
                }
                data-testid={`alert-${alert.type}-${index}`}
              >
                {alert.type === "location" && <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400" />}
                {alert.type === "inventory" && <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                {alert.type === "kyc" && <AlertTriangle className="h-4 w-4" />}
                <AlertDescription className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={
                    alert.type === "location" ? "text-orange-700 dark:text-orange-300" 
                    : alert.type === "inventory" ? "text-amber-700 dark:text-amber-300" 
                    : ""
                  }>
                    {alert.message}
                  </span>
                  {alert.link && (
                    <Link href={alert.link}>
                      <Button size="sm" variant="outline" className="hover-elevate" data-testid={`btn-fix-${alert.type}-${index}`}>
                        Fix Now <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Action-focused Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/owner/bookings?tab=pending">
            <Card className="hover-elevate cursor-pointer transition-all" data-testid="card-pending-requests">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="count-pending-requests">
                      {stats?.pendingRequests || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting your response
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/owner/bookings?tab=ongoing">
            <Card className="hover-elevate cursor-pointer transition-all" data-testid="card-ongoing-stays">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ongoing Stays</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="count-ongoing-stays">
                      {stats?.ongoingStays || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Currently checked in
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/owner/bookings?tab=upcoming&filter=today-checkin">
            <Card className="hover-elevate cursor-pointer transition-all" data-testid="card-todays-checkins">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
                <LogIn className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="count-todays-checkins">
                      {stats?.todaysCheckIns || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Guests arriving today
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/owner/bookings?tab=ongoing&filter=today-checkout">
            <Card className="hover-elevate cursor-pointer transition-all" data-testid="card-todays-checkouts">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Check-outs</CardTitle>
                <LogOut className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold" data-testid="count-todays-checkouts">
                      {stats?.todaysCheckOuts || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Guests departing today
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Monthly Booking Summary */}
        <Card data-testid="card-monthly-summary">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Monthly Booking Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={`${selectedYear}-${selectedMonth}`}
                onValueChange={(value) => {
                  const [year, month] = value.split('-').map(Number);
                  setSelectedYear(year);
                  setSelectedMonth(month);
                }}
              >
                <SelectTrigger className="w-[160px]" data-testid="select-month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const months = [];
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth() + 1;
                    // Show current month and 11 previous months
                    for (let i = 0; i < 12; i++) {
                      let m = currentMonth - i;
                      let y = currentYear;
                      if (m <= 0) {
                        m += 12;
                        y -= 1;
                      }
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      months.push(
                        <SelectItem key={`${y}-${m}`} value={`${y}-${m}`}>
                          {monthNames[m - 1]} {y}
                        </SelectItem>
                      );
                    }
                    return months;
                  })()}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingMonthlySummary ? (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="text-lg font-bold text-green-700 dark:text-green-300" data-testid="monthly-confirmed">
                    {monthlySummary?.confirmed || 0}
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400">Confirmed</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-300" data-testid="monthly-completed">
                    {monthlySummary?.completed || 0}
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Completed</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-300" data-testid="monthly-pending">
                    {monthlySummary?.pending || 0}
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Pending</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700">
                  <div className="text-lg font-bold text-gray-700 dark:text-gray-300" data-testid="monthly-cancelled">
                    {monthlySummary?.cancelled || 0}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Cancelled</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="text-lg font-bold text-red-700 dark:text-red-300" data-testid="monthly-noshow">
                    {(monthlySummary?.noShow || 0) + (monthlySummary?.rejected || 0)}
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400">No-show/Rejected</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-lg font-bold text-primary" data-testid="monthly-revenue">
                    {formatCurrency(monthlySummary?.totalRevenue || 0)}
                  </div>
                  <p className="text-xs text-primary/70">Total Revenue</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Communication Analytics */}
        <Card data-testid="card-communication-analytics">
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Communication Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCommAnalytics ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Chat Sessions</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300" data-testid="comm-total-chats">
                    {commAnalytics?.summary?.totalChats || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Total Messages</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300" data-testid="comm-total-messages">
                    {commAnalytics?.summary?.totalMessages || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Total Calls</span>
                  </div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="comm-total-calls">
                    {commAnalytics?.summary?.totalCalls || 0}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Call Duration</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300" data-testid="comm-call-duration">
                    {Math.round((commAnalytics?.summary?.totalCallDuration || 0) / 60)} min
                  </div>
                </div>
              </div>
            )}
            {(!commAnalytics?.summary?.totalChats && !commAnalytics?.summary?.totalCalls && !isLoadingCommAnalytics) && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                No communication data yet. Stats will appear as guests interact with you.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card data-testid="quick-actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/owner/bookings">
                <Button className="w-full justify-start" variant="outline" data-testid="action-view-bookings">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  View Bookings
                </Button>
              </Link>
              <Link href="/owner/messages">
                <Button className="w-full justify-start" variant="outline" data-testid="action-messages">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Check Messages
                </Button>
              </Link>
              <Link href="/owner/property">
                <Button className="w-full justify-start" variant="outline" data-testid="action-edit-property">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Property
                </Button>
              </Link>
              <Link href="/owner/reviews">
                <Button className="w-full justify-start" variant="outline" data-testid="action-view-reviews">
                  <Star className="mr-2 h-4 w-4" />
                  View Reviews
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card data-testid="properties-list">
            <CardHeader>
              <CardTitle>Your Properties</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : stats?.properties && stats.properties.length > 0 ? (
                <div className="space-y-3">
                  {stats.properties.map((property) => (
                    <div
                      key={property.id}
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`property-item-${property.id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{property.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(parseFloat(property.pricePerNight))} / night
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {getStatusBadge(property.status)}
                        <Link href={`/properties/${property.id}`}>
                          <Button size="icon" variant="ghost" data-testid={`view-property-${property.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`property-menu-${property.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <Link href={`/owner/property`}>
                              <DropdownMenuItem data-testid={`edit-property-${property.id}`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Property
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            {property.status === "published" && (
                              <DropdownMenuItem
                                onClick={() => pauseMutation.mutate(property.id)}
                                disabled={pauseMutation.isPending}
                                data-testid={`pause-property-${property.id}`}
                              >
                                <Pause className="h-4 w-4 mr-2" />
                                Pause Listing
                              </DropdownMenuItem>
                            )}
                            {property.status === "paused" && (
                              <DropdownMenuItem
                                onClick={() => resumeMutation.mutate(property.id)}
                                disabled={resumeMutation.isPending}
                                data-testid={`resume-property-${property.id}`}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Resume Listing
                              </DropdownMenuItem>
                            )}
                            {property.status !== "deactivated" && (
                              <DropdownMenuItem
                                onClick={() => deactivateMutation.mutate(property.id)}
                                disabled={deactivateMutation.isPending}
                                className="text-destructive focus:text-destructive"
                                data-testid={`deactivate-property-${property.id}`}
                              >
                                <Power className="h-4 w-4 mr-2" />
                                Deactivate Listing
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No properties yet</p>
                  <Link href="/list-property">
                    <Button className="mt-4" data-testid="add-property">
                      List Your Property
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {stats?.properties && stats.properties.length > 0 && (
          <Card data-testid="card-room-utilization">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <BedDouble className="h-5 w-5" />
                Room Utilization
              </CardTitle>
              <p className="text-sm text-muted-foreground">Next 30 days</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {stats.properties.map((property) => (
                  <div key={property.id} data-testid={`utilization-property-${property.id}`}>
                    {stats.properties.length > 1 && (
                      <h4 className="font-medium text-sm mb-2 text-muted-foreground">
                        {property.title}
                      </h4>
                    )}
                    <RoomUtilizationCard propertyId={property.id} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OwnerLayout>
  );
}
