import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import {
  CalendarDays,
  Users,
  IndianRupee,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  MessageSquare,
  ChevronLeft,
  AlertTriangle,
  Link2,
  AlertCircle,
  BedDouble,
  Utensils,
  PartyPopper,
  Phone,
  Home,
  Star,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBookingUpdates } from "@/hooks/useBookingUpdates";

interface Booking {
  id: string;
  bookingCode?: string | null;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  status:
    | "pending"
    | "confirmed"
    | "customer_confirmed"
    | "rejected"
    | "cancelled"
    | "checked_in"
    | "checked_out"
    | "completed"
    | "no_show";
  ownerResponseMessage?: string;
  respondedAt?: string;
  checkInTime?: string;
  checkOutTime?: string;
  actualCheckOutDate?: string;
  earlyCheckout?: boolean;
  bookingType?: "standard" | "extension";
  parentBookingId?: string | null;
  bookingCreatedAt?: string;
  createdAt: string;
  hasReview?: boolean;
  property?: {
    id: string;
    title: string;
    images: string[];
    destination: string;
  };
  ownerContact?: {
    name: string;
    phone?: string;
  };
  roomType?: {
    id: string;
    name: string;
    basePrice: string;
  } | null;
  roomOption?: {
    id: string;
    name: string;
    priceAdjustment: string;
  } | null;
}

interface CancellationPreview {
  canCancel: boolean;
  policyType?: string;
  freeCancellationHours?: number;
  partialRefundPercent?: number;
  hoursUntilCheckIn?: number;
  totalPrice?: string;
  refundPercentage?: number;
  refundAmount?: string;
  message: string;
}

// Booking timeline step type
type TimelineStep =
  | "requested"
  | "accepted"
  | "confirmed"
  | "checked_in"
  | "checked_out";

// Helper to calculate cancellation deadline
const getCancellationDeadline = (
  checkInDate: Date,
  freeCancellationHours: number = 24,
): Date => {
  const deadline = new Date(checkInDate);
  deadline.setHours(deadline.getHours() - freeCancellationHours);
  return deadline;
};

// Helper to check if free cancellation is still available
const canFreeCancellation = (
  checkInDate: Date,
  freeCancellationHours: number = 24,
): boolean => {
  const deadline = getCancellationDeadline(checkInDate, freeCancellationHours);
  return new Date() < deadline;
};

// Statuses that allow contact visibility
const CONTACT_VISIBLE_STATUSES = [
  "confirmed",
  "customer_confirmed",
  "checked_in",
  "completed",
] as const;

// Helper to check if contact should be visible for a booking status
const isContactVisible = (status: Booking["status"]): boolean => {
  return (CONTACT_VISIBLE_STATUSES as readonly string[]).includes(status);
};
export default function MyBookings() {
  const [activeTab, setActiveTab] = useState("all");
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showNewBookingBanner, setShowNewBookingBanner] = useState(false);

  // Cancellation modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(
    null,
  );
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelPreview, setCancelPreview] =
    useState<CancellationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Subscribe to real-time booking updates via WebSocket with polling fallback
  useBookingUpdates({ userId: user?.id });
  const [highlightedBookingCode, setHighlightedBookingCode] = useState<
    string | null
  >(null);
  const [bookingNotFound, setBookingNotFound] = useState<string | null>(null);

  // Read URL params once on mount, before any cleanup
  const [initialBookingRef] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("bookingRef");
  });
  const [initialNewParam] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("new");
  });

  // Redirect to login if not authenticated, preserving bookingRef for return
  // This must run BEFORE URL cleanup
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const returnUrl = initialBookingRef
        ? `/my-bookings?bookingRef=${initialBookingRef}`
        : "/my-bookings";
      setLocation(`/login?returnTo=${encodeURIComponent(returnUrl)}`);
    }
  }, [authLoading, isAuthenticated, setLocation, initialBookingRef]);

  // Handle URL params for authenticated users only
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    if (initialNewParam === "true") {
      setShowNewBookingBanner(true);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, "", "/my-bookings");
      // Auto-hide banner after 10 seconds
      const timer = setTimeout(() => setShowNewBookingBanner(false), 10000);
      return () => clearTimeout(timer);
    }

    if (initialBookingRef) {
      setHighlightedBookingCode(initialBookingRef);
      // Clean up URL without triggering navigation but preserve the booking highlight state
      window.history.replaceState({}, "", "/my-bookings");
    }
  }, [isAuthenticated, authLoading, initialNewParam, initialBookingRef]);

  const {
    data: bookings,
    isLoading,
    isError,
    error,
  } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated && !authLoading, // Only fetch when authenticated
  });

  // Sort bookings by createdAt (newest first) so newly created booking appears at top
  const sortedBookings = bookings
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  // Check if the highlighted booking exists in user's bookings
  useEffect(() => {
    if (highlightedBookingCode && bookings && !isLoading) {
      const foundBooking = bookings.find(
        (b) => b.bookingCode === highlightedBookingCode,
      );
      if (!foundBooking) {
        setBookingNotFound(highlightedBookingCode);
        setHighlightedBookingCode(null);
      } else {
        setBookingNotFound(null);
        // Auto-scroll to the booking after a short delay
        setTimeout(() => {
          const element = document.querySelector(
            `[data-booking-code="${highlightedBookingCode}"]`,
          );
          element?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }
  }, [highlightedBookingCode, bookings, isLoading]);

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const { toast } = useToast();

  // Customer booking confirmation mutation
  const confirmBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest(
        "POST",
        `/api/bookings/${bookingId}/customer-confirm`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      toast({
        title: "Booking Confirmed!",
        description: "The hotel has been notified. Your room is now secured.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Confirmation Failed",
        description:
          error.message || "Unable to confirm booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async ({
      bookingId,
      reason,
    }: {
      bookingId: string;
      reason?: string;
    }) => {
      return await apiRequest("POST", `/api/bookings/${bookingId}/cancel`, {
        reason,
      });
    },
    onSuccess: (data: any) => {
      setCancelModalOpen(false);
      setCancellingBooking(null);
      setCancellationReason("");
      setCancelPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });

      const refundMsg =
        data.refundPercentage === 100
          ? "Full refund will be processed."
          : data.refundPercentage > 0
            ? `${data.refundPercentage}% refund (${formatCurrency(data.refundAmount || "0")}) will be processed.`
            : "No refund applicable per cancellation policy.";

      toast({
        title: "Booking Cancelled",
        description: `Your booking has been cancelled. ${refundMsg}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description:
          error.message || "Unable to cancel booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Function to open cancel modal with refund preview
  const openCancelModal = async (booking: Booking) => {
    setCancellingBooking(booking);
    setCancellationReason("");
    setCancelPreview(null);
    setCancelModalOpen(true);
    setLoadingPreview(true);

    try {
      const response = await fetch(
        `/api/bookings/${booking.id}/cancel-preview`,
        { credentials: "include" },
      );
      const data = await response.json();
      setCancelPreview(data);
    } catch (error) {
      setCancelPreview({
        canCancel: false,
        message: "Unable to load cancellation details",
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmCancel = () => {
    if (cancellingBooking) {
      cancelBookingMutation.mutate({
        bookingId: cancellingBooking.id,
        reason: cancellationReason || "Cancelled by guest",
      });
    }
  };

  // Log contact interaction (call/whatsapp) for audit
  const logContactInteraction = async (
    bookingId: string,
    actionType: "call" | "whatsapp",
    targetPhone?: string,
    propertyId?: string,
    propertyName?: string,
  ) => {
    try {
      await apiRequest("POST", "/api/contact/log", {
        bookingId,
        actorRole: "guest",
        actionType,
        targetPhoneLast4: targetPhone?.slice(-4) || null,
        metadata: {
          page: "my-bookings",
          propertyId,
          propertyName,
        },
      });
    } catch (error) {
      // Silent fail - don't block the user action
      console.error("Failed to log contact interaction:", error);
    }
  };

  // Handle call button click with logging
  const handleCallClick = (booking: Booking) => {
    if (booking.ownerContact?.phone) {
      logContactInteraction(
        booking.id,
        "call",
        booking.ownerContact.phone,
        booking.property?.id,
        booking.property?.title,
      );
      window.location.href = `tel:${booking.ownerContact.phone}`;
    }
  };

  // Enhanced status configuration with colors and explanations
  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        label: string;
        icon: any;
        explanation: string;
        bgColor: string;
        textColor: string;
        borderColor: string;
      }
    > = {
      pending: {
        label: "Awaiting Confirmation",
        icon: Clock,
        explanation:
          "The hotel is reviewing your request. They typically respond within 15–30 minutes.",
        bgColor: "bg-amber-100 dark:bg-amber-900/50",
        textColor: "text-amber-800 dark:text-amber-200",
        borderColor: "border-amber-300 dark:border-amber-700",
      },
      confirmed: {
        label: "Hotel Accepted",
        icon: CheckCircle,
        explanation:
          "Please confirm to secure your room. The hotel is holding this for you.",
        bgColor: "bg-blue-100 dark:bg-blue-900/50",
        textColor: "text-blue-800 dark:text-blue-200",
        borderColor: "border-blue-300 dark:border-blue-700",
      },
      customer_confirmed: {
        label: "Confirmed",
        icon: CheckCircle,
        explanation: "Your room is secured. Show this booking at check-in.",
        bgColor: "bg-green-100 dark:bg-green-900/50",
        textColor: "text-green-800 dark:text-green-200",
        borderColor: "border-green-300 dark:border-green-700",
      },
      rejected: {
        label: "Declined",
        icon: XCircle,
        explanation: "The hotel couldn't accommodate this request.",
        bgColor: "bg-red-100 dark:bg-red-900/50",
        textColor: "text-red-800 dark:text-red-200",
        borderColor: "border-red-300 dark:border-red-700",
      },
      checked_in: {
        label: "Checked In",
        icon: Home,
        explanation: "You're currently staying at this property. Enjoy!",
        bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
        textColor: "text-emerald-800 dark:text-emerald-200",
        borderColor: "border-emerald-300 dark:border-emerald-700",
      },
      checked_out: {
        label: "Checked Out",
        icon: CheckCircle,
        explanation: "Your stay is complete. We hope you had a great time!",
        bgColor: "bg-slate-100 dark:bg-slate-800/50",
        textColor: "text-slate-700 dark:text-slate-300",
        borderColor: "border-slate-300 dark:border-slate-600",
      },
      completed: {
        label: "Completed",
        icon: CheckCircle,
        explanation: "Your stay is complete. Consider leaving a review!",
        bgColor: "bg-slate-100 dark:bg-slate-800/50",
        textColor: "text-slate-700 dark:text-slate-300",
        borderColor: "border-slate-300 dark:border-slate-600",
      },
      cancelled: {
        label: "Cancelled",
        icon: XCircle,
        explanation: "This booking was cancelled.",
        bgColor: "bg-red-100 dark:bg-red-900/50",
        textColor: "text-red-800 dark:text-red-200",
        borderColor: "border-red-300 dark:border-red-700",
      },
      no_show: {
        label: "No-Show",
        icon: AlertTriangle,
        explanation: "Check-in did not occur on the scheduled date.",
        bgColor: "bg-orange-100 dark:bg-orange-900/50",
        textColor: "text-orange-800 dark:text-orange-200",
        borderColor: "border-orange-300 dark:border-orange-700",
      },
    };
    return (
      configs[status] || {
        label: status,
        icon: Clock,
        explanation: "",
        bgColor: "bg-muted",
        textColor: "text-muted-foreground",
        borderColor: "border-muted",
      }
    );
  };

  const getStatusBadge = (status: string, showExplanation: boolean = true) => {
    const config = getStatusConfig(status);
    const Icon = config.icon;
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
        >
          <Icon className="h-4 w-4" />
          <span className="font-semibold text-sm">{config.label}</span>
        </div>
        {showExplanation && config.explanation && (
          <span
            className={`text-xs max-w-[200px] text-right ${config.textColor}`}
          >
            {config.explanation}
          </span>
        )}
      </div>
    );
  };

  // Strict status mapping for tabs
  // PENDING: Waiting for owner response (status = pending)
  const isPendingBooking = (booking: Booking): boolean => {
    return booking.status === "pending";
  };

  // ONGOING: Currently checked in
  const isOngoingBooking = (booking: Booking): boolean => {
    return booking.status === "checked_in";
  };

  // UPCOMING: Confirmed/accepted bookings with future check-in date (not pending, not checked in yet)
  const isUpcomingBooking = (booking: Booking): boolean => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const upcomingStatuses = ["confirmed", "customer_confirmed"];
    return upcomingStatuses.includes(booking.status) && checkInDate > now;
  };

  // PAST: Completed, cancelled, rejected, checked_out, no_show
  const isPastBooking = (booking: Booking): boolean => {
    const pastStatuses = [
      "completed",
      "cancelled",
      "rejected",
      "checked_out",
      "no_show",
    ];
    return pastStatuses.includes(booking.status);
  };

  const filteredBookings = sortedBookings?.filter((booking) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return isPendingBooking(booking);
    if (activeTab === "upcoming") return isUpcomingBooking(booking);
    if (activeTab === "ongoing") return isOngoingBooking(booking);
    if (activeTab === "past") return isPastBooking(booking);
    return true;
  });

  // Calculate counts for each tab
  const pendingCount = sortedBookings?.filter(isPendingBooking).length || 0;
  const upcomingCount = sortedBookings?.filter(isUpcomingBooking).length || 0;
  const ongoingCount = sortedBookings?.filter(isOngoingBooking).length || 0;
  const pastCount = sortedBookings?.filter(isPastBooking).length || 0;

  const renderBookingCard = (booking: Booking, index: number) => {
    // Highlight the newest booking when success banner is shown
    const isNewestBooking = index === 0 && showNewBookingBanner;
    // Highlight booking from email deep link
    const isHighlightedFromEmail =
      highlightedBookingCode && booking.bookingCode === highlightedBookingCode;
    // Check if this is an ongoing booking
    const isOngoing = isOngoingBooking(booking);

    return (
      <Card
        key={booking.id}
        data-testid={`booking-card-${booking.id}`}
        data-booking-code={booking.bookingCode || undefined}
        className={`overflow-hidden transition-all duration-500 ${isNewestBooking || isHighlightedFromEmail ? "ring-2 ring-primary ring-offset-2 shadow-lg" : ""} ${isOngoing ? "border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-950/20" : ""}`}
      >
        {/* Currently Staying Banner for Ongoing Bookings */}
        {isOngoing && (
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 flex items-center gap-2"
            data-testid={`currently-staying-${booking.id}`}
          >
            <Home className="h-4 w-4" />
            <span className="font-semibold text-sm">Currently Staying</span>
            {booking.checkInTime && (
              <span className="text-xs opacity-90 ml-auto">
                Checked in{" "}
                {format(new Date(booking.checkInTime), "dd MMM 'at' h:mm a")}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-col md:flex-row">
          {booking.property?.images?.[0] && (
            <div className="w-full md:w-48 h-32 md:h-auto flex-shrink-0">
              <img
                src={booking.property.images[0]}
                alt={booking.property.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {booking.property?.title || "Property"}
                    </CardTitle>
                    {booking.bookingCode && (
                      <Badge
                        variant="outline"
                        className="text-xs font-mono"
                        data-testid={`booking-code-${booking.id}`}
                      >
                        {booking.bookingCode}
                      </Badge>
                    )}
                  </div>
                  {booking.property?.destination && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {booking.property.destination}
                    </p>
                  )}
                </div>
                {getStatusBadge(booking.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Check-in</p>
                    <p className="font-medium">
                      {format(new Date(booking.checkIn), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Check-out</p>
                    <p className="font-medium">
                      {format(new Date(booking.checkOut), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Guests</p>
                    <p className="font-medium">{booking.guests}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium">
                      {formatCurrency(booking.totalPrice)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Booked On date */}
              {(booking.bookingCreatedAt || booking.createdAt) && (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-testid={`booked-on-${booking.id}`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Booked on{" "}
                    {format(
                      new Date(booking.bookingCreatedAt || booking.createdAt),
                      "dd MMM yyyy, h:mm a",
                    )}
                  </span>
                </div>
              )}

              {(booking.roomType || booking.roomOption) && (
                <div className="flex flex-wrap gap-3 text-sm pt-1">
                  {booking.roomType && (
                    <div
                      className="flex items-center gap-2"
                      data-testid={`room-type-${booking.id}`}
                    >
                      <BedDouble className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Room:</span>
                      <span className="font-medium">
                        {booking.roomType.name}
                      </span>
                    </div>
                  )}
                  {booking.roomOption && (
                    <div
                      className="flex items-center gap-2"
                      data-testid={`meal-plan-${booking.id}`}
                    >
                      <Utensils className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Meal Plan:</span>
                      <span className="font-medium">
                        {booking.roomOption.name}
                        {Number(booking.roomOption.priceAdjustment) > 0 && (
                          <span className="text-muted-foreground font-normal ml-1">
                            (₹
                            {Number(
                              booking.roomOption.priceAdjustment,
                            ).toLocaleString("en-IN")}
                            /person/night)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Information - Always visible */}
              <div
                className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg"
                data-testid={`payment-info-${booking.id}`}
              >
                <IndianRupee className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                    Pay at Hotel
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {formatCurrency(booking.totalPrice)} to be paid directly at
                    the property during check-in. No advance payment required.
                  </p>
                </div>
              </div>

              {/* Booking Timeline */}
              {(() => {
                const steps: {
                  key: TimelineStep;
                  label: string;
                  completed: boolean;
                  active: boolean;
                }[] = [
                  {
                    key: "requested",
                    label: "Requested",
                    completed: true,
                    active: booking.status === "pending",
                  },
                  {
                    key: "accepted",
                    label: "Accepted",
                    completed: [
                      "confirmed",
                      "customer_confirmed",
                      "checked_in",
                      "checked_out",
                      "completed",
                    ].includes(booking.status),
                    active: booking.status === "confirmed",
                  },
                  {
                    key: "confirmed",
                    label: "Confirmed",
                    completed: [
                      "customer_confirmed",
                      "checked_in",
                      "checked_out",
                      "completed",
                    ].includes(booking.status),
                    active: booking.status === "customer_confirmed",
                  },
                  {
                    key: "checked_in",
                    label: "Checked In",
                    completed: [
                      "checked_in",
                      "checked_out",
                      "completed",
                    ].includes(booking.status),
                    active: booking.status === "checked_in",
                  },
                  {
                    key: "checked_out",
                    label: "Completed",
                    completed: ["checked_out", "completed"].includes(
                      booking.status,
                    ),
                    active: ["checked_out", "completed"].includes(
                      booking.status,
                    ),
                  },
                ];

                // Don't show timeline for cancelled/rejected/no-show
                if (
                  ["cancelled", "rejected", "no_show"].includes(booking.status)
                ) {
                  return null;
                }

                return (
                  <div
                    className="py-2"
                    data-testid={`booking-timeline-${booking.id}`}
                  >
                    <div className="flex items-center justify-between">
                      {steps.map((step, idx) => (
                        <div
                          key={step.key}
                          className="flex items-center flex-1"
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                step.completed
                                  ? "bg-green-500 text-white"
                                  : step.active
                                    ? "bg-blue-500 text-white ring-2 ring-blue-300"
                                    : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {step.completed ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={`text-[10px] mt-1 ${step.completed || step.active ? "text-foreground font-medium" : "text-muted-foreground"}`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {idx < steps.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-1 ${step.completed ? "bg-green-500" : "bg-muted"}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {booking.status === "pending" && (
                <div className="space-y-3">
                  {/* Booking Request Status Banner */}

                  {/* What happens next */}
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      What happens next?
                    </p>
                    <ul className="text-muted-foreground space-y-1 text-xs pl-6">
                      <li>• The hotel will accept or decline your request</li>
                      <li>
                        • If accepted, you'll need to confirm to secure your
                        room
                      </li>
                      <li>
                        • Contact options will be available after confirmation
                      </li>
                    </ul>
                  </div>

                  {/* Action Buttons - NO contact options for pending bookings */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {booking.property && (
                      <Link href={`/properties/${booking.property.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`btn-view-property-pending-${booking.id}`}
                        >
                          View Property
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                      onClick={() => openCancelModal(booking)}
                      data-testid={`btn-cancel-pending-${booking.id}`}
                    >
                      <XCircle className="h-4 w-4" />
                      Withdraw Request
                    </Button>
                  </div>

                  {/* Contact availability info */}
                  <p className="text-xs text-muted-foreground mt-3">
                    Hotel contact details will be available after your booking
                    is confirmed.
                  </p>
                </div>
              )}

              {booking.status === "rejected" && (
                <div className="space-y-4">
                  <div className="text-sm p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-200">
                          Request Declined
                        </p>
                        <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                          {booking.ownerResponseMessage ||
                            "The hotel was unable to accommodate this booking request."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {booking.property && (
                      <Link href={`/properties/${booking.property.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`btn-view-property-rejected-${booking.id}`}
                        >
                          View Property
                        </Button>
                      </Link>
                    )}
                    <Link href="/">
                      <Button
                        size="sm"
                        data-testid={`btn-find-alternative-${booking.id}`}
                      >
                        Find Alternative
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {booking.status === "no_show" && (
                <div className="space-y-4">
                  <div className="text-sm p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-800 dark:text-orange-200">
                          Marked as No-Show
                        </p>
                        <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                          Check-in did not occur on{" "}
                          {format(new Date(booking.checkIn), "dd MMM yyyy")}. If
                          this is an error, please contact the property.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {booking.property && (
                      <Link href={`/properties/${booking.property.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`btn-view-property-noshow-${booking.id}`}
                        >
                          View Property
                        </Button>
                      </Link>
                    )}
                    <Link href="/">
                      <Button
                        size="sm"
                        data-testid={`btn-book-again-noshow-${booking.id}`}
                      >
                        Book Again
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {booking.status === "confirmed" && (
                <div className="space-y-4">
                  {/* Full-width Hotel Acceptance Confirmation Card */}
                  <div className="p-5 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/50 dark:via-emerald-950/50 dark:to-teal-950/50 border-2 border-green-300 dark:border-green-700 rounded-xl shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/60 rounded-full flex-shrink-0">
                        <PartyPopper className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-green-900 dark:text-green-100 text-lg flex items-center gap-2">
                          Hotel has accepted your booking!
                        </h4>
                        <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                          Please confirm your booking to secure your room. The
                          hotel is holding this reservation for you.
                        </p>

                        {/* Booking Summary */}
                        <div className="mt-4 p-4 bg-white/60 dark:bg-black/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">
                            Booking Summary
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Check-in
                              </p>
                              <p className="font-medium text-green-900 dark:text-green-100">
                                {format(
                                  new Date(booking.checkIn),
                                  "dd MMM yyyy",
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Check-out
                              </p>
                              <p className="font-medium text-green-900 dark:text-green-100">
                                {format(
                                  new Date(booking.checkOut),
                                  "dd MMM yyyy",
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Guests
                              </p>
                              <p className="font-medium text-green-900 dark:text-green-100">
                                {booking.guests}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs">
                                Total Price
                              </p>
                              <p className="font-semibold text-green-900 dark:text-green-100">
                                {formatCurrency(booking.totalPrice)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Inline Cancellation Policy Info for confirmed status */}
                        {(() => {
                          const checkInDate = new Date(booking.checkIn);
                          const freeCancelDeadline = getCancellationDeadline(
                            checkInDate,
                            24,
                          );
                          const canFreeCancel = canFreeCancellation(
                            checkInDate,
                            24,
                          );

                          return (
                            <div
                              className={`mt-3 p-3 rounded-lg text-sm ${
                                canFreeCancel
                                  ? "bg-green-100/50 dark:bg-green-900/30"
                                  : "bg-amber-100/50 dark:bg-amber-900/30"
                              }`}
                              data-testid={`cancellation-policy-confirmed-${booking.id}`}
                            >
                              <div className="flex items-center gap-2">
                                {canFreeCancel ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                )}
                                <span
                                  className={
                                    canFreeCancel
                                      ? "text-green-800 dark:text-green-200"
                                      : "text-amber-800 dark:text-amber-200"
                                  }
                                >
                                  {canFreeCancel
                                    ? `Free cancellation until ${format(freeCancelDeadline, "dd MMM, h:mm a")}`
                                    : "Cancellation charges may apply"}
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Confirmation Action Buttons - Fixed at bottom, always visible */}
                        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <Button
                            size="lg"
                            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white gap-2"
                            onClick={() =>
                              confirmBookingMutation.mutate(booking.id)
                            }
                            disabled={confirmBookingMutation.isPending}
                            data-testid={`btn-confirm-booking-${booking.id}`}
                          >
                            <CheckCircle className="h-5 w-5" />
                            {confirmBookingMutation.isPending
                              ? "Confirming..."
                              : "Confirm Booking"}
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                            onClick={() => openCancelModal(booking)}
                            data-testid={`btn-cancel-request-${booking.id}`}
                          >
                            <XCircle className="h-5 w-5 mr-1" />
                            Cancel Request
                          </Button>
                        </div>

                        {/* Contact Options */}
                        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                          <p className="text-xs text-muted-foreground mb-2">
                            Contact Hotel
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href="/messages">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                data-testid={`btn-chat-hotel-confirmed-${booking.id}`}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Chat
                              </Button>
                            </Link>
                            {booking.ownerContact?.phone && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  onClick={() => handleCallClick(booking)}
                                  data-testid={`btn-call-hotel-confirmed-${booking.id}`}
                                >
                                  <Phone className="h-4 w-4" />
                                  Call
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {booking.status === "customer_confirmed" && (
                <div className="space-y-3">
                  {/* Success Banner for Customer Confirmed */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900 dark:text-green-100 text-base">
                          Booking Confirmed!
                        </h4>
                        <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                          Your room is secured. Show this booking at check-in on{" "}
                          {format(new Date(booking.checkIn), "dd MMM yyyy")}.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Inline Cancellation Policy Info */}
                  {(() => {
                    const checkInDate = new Date(booking.checkIn);
                    const freeCancelDeadline = getCancellationDeadline(
                      checkInDate,
                      24,
                    );
                    const canFreeCancel = canFreeCancellation(checkInDate, 24);
                    const now = new Date();

                    return (
                      <div
                        className={`p-3 rounded-lg border text-sm ${
                          canFreeCancel
                            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                        }`}
                        data-testid={`cancellation-policy-${booking.id}`}
                      >
                        <div className="flex items-start gap-2">
                          {canFreeCancel ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            {canFreeCancel ? (
                              <>
                                <p className="font-medium text-green-800 dark:text-green-200">
                                  Free cancellation available
                                </p>
                                <p className="text-green-700 dark:text-green-300 text-xs mt-0.5">
                                  Cancel for free until{" "}
                                  {format(
                                    freeCancelDeadline,
                                    "dd MMM yyyy, h:mm a",
                                  )}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-amber-800 dark:text-amber-200">
                                  Cancellation charges may apply
                                </p>
                                <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                                  Free cancellation period has ended. Refund
                                  depends on property policy.
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons for Customer Confirmed - Chat, Call, WhatsApp enabled */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href="/messages">
                      <Button
                        size="sm"
                        className="gap-2"
                        data-testid={`btn-message-hotel-${booking.id}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Chat with Hotel
                      </Button>
                    </Link>
                    {booking.ownerContact?.phone && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleCallClick(booking)}
                          data-testid={`btn-call-hotel-${booking.id}`}
                        >
                          <Phone className="h-4 w-4" />
                          Call Hotel
                        </Button>
                      </>
                    )}
                    {booking.property && (
                      <Link href={`/properties/${booking.property.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`btn-view-property-confirmed-${booking.id}`}
                        >
                          View Property
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                      onClick={() => openCancelModal(booking)}
                      data-testid={`btn-cancel-confirmed-${booking.id}`}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel Booking
                    </Button>
                  </div>
                </div>
              )}

              {booking.status === "checked_in" && (
                <div className="space-y-4">
                  <div className="text-sm p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-blue-800 dark:text-blue-200">
                      You're checked in! Enjoy your stay.
                      {booking.checkInTime && (
                        <span className="block text-xs mt-1">
                          Checked in on{" "}
                          {format(
                            new Date(booking.checkInTime),
                            "dd MMM yyyy 'at' HH:mm",
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href="/messages">
                      <Button
                        size="sm"
                        className="gap-2"
                        data-testid={`btn-chat-hotel-checked-in-${booking.id}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Chat with Hotel
                      </Button>
                    </Link>
                    {booking.ownerContact?.phone && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleCallClick(booking)}
                          data-testid={`btn-call-hotel-checked-in-${booking.id}`}
                        >
                          <Phone className="h-4 w-4" />
                          Call Hotel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {(booking.status === "checked_out" ||
                booking.status === "completed") && (
                <div className="space-y-3">
                  {booking.checkOutTime && (
                    <div
                      className={`text-sm p-3 border rounded-md ${booking.earlyCheckout ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-muted"}`}
                    >
                      <p
                        className={
                          booking.earlyCheckout
                            ? "text-amber-800 dark:text-amber-200"
                            : "text-muted-foreground"
                        }
                      >
                        {booking.earlyCheckout ? (
                          <>
                            <span className="flex items-center gap-1 font-medium">
                              <AlertTriangle className="h-4 w-4" />
                              You checked out early
                            </span>
                            <span className="block text-xs mt-1">
                              Original check-out:{" "}
                              {format(
                                new Date(booking.checkOut),
                                "dd MMM yyyy",
                              )}{" "}
                              | Actual check-out:{" "}
                              {format(
                                new Date(booking.checkOutTime),
                                "dd MMM yyyy 'at' HH:mm",
                              )}
                            </span>
                            <span className="block text-xs mt-1 text-amber-600 dark:text-amber-400">
                              Please contact the hotel regarding any refund
                              policies.
                            </span>
                          </>
                        ) : (
                          <>
                            Your stay is complete. Thank you for choosing us!
                            <span className="block text-xs mt-1">
                              Checked out on{" "}
                              {format(
                                new Date(booking.checkOutTime),
                                "dd MMM yyyy 'at' HH:mm",
                              )}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    {!booking.hasReview ? (
                      <Link
                        href={`/property/${booking.propertyId}/review?bookingId=${booking.id}`}
                      >
                        <Button
                          size="sm"
                          className="gap-2"
                          data-testid={`btn-leave-review-${booking.id}`}
                        >
                          <Star className="h-4 w-4" />
                          Leave a Review
                        </Button>
                      </Link>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="gap-1"
                        data-testid={`badge-reviewed-${booking.id}`}
                      >
                        <Star className="h-3 w-3 fill-current" />
                        Reviewed
                      </Badge>
                    )}
                    {booking.property && (
                      <Link href={`/properties/${booking.property.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`btn-view-property-completed-${booking.id}`}
                        >
                          View Property
                        </Button>
                      </Link>
                    )}
                    {/* Only show contact for completed status, not checked_out */}
                    {booking.status === "completed" &&
                      booking.ownerContact?.phone && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleCallClick(booking)}
                            data-testid={`btn-call-hotel-completed-${booking.id}`}
                          >
                            <Phone className="h-4 w-4" />
                            Call
                          </Button>
                        </>
                      )}
                  </div>
                </div>
              )}

              {booking.bookingType === "extension" && (
                <div className="text-sm p-3 bg-primary/5 border border-primary/20 rounded-md">
                  <p className="flex items-center gap-1 text-primary font-medium">
                    <Link2 className="h-4 w-4" />
                    Stay Extension
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    This booking is an extension of a previous stay. Payment to
                    be settled at the hotel.
                  </p>
                </div>
              )}

              {/* Cancelled bookings - no contact options, just view property and find alternative */}
              {booking.status === "cancelled" && (
                <div className="space-y-3">
                  <div className="text-sm p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-md">
                    <p className="text-muted-foreground">
                      This booking has been cancelled. You can book this
                      property again or find alternatives.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {booking.property && (
                      <Link href={`/properties/${booking.property.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`view-property-${booking.id}`}
                        >
                          View Property
                        </Button>
                      </Link>
                    )}
                    <Link href="/">
                      <Button
                        size="sm"
                        data-testid={`btn-find-alternative-cancelled-${booking.id}`}
                      >
                        Find Alternative
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </Card>
    );
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render content (redirect will happen via useEffect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="btn-back">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold">My Bookings</h1>
        </div>

        {/* Success Banner for New Booking */}
        {showNewBookingBanner && (
          <Card className="mb-6 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40">
            <CardContent
              className="flex items-center gap-3 py-4"
              data-testid="new-booking-success-banner"
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">
                  Booking Request Created Successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your latest booking is shown below. The property owner will
                  review your request shortly.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewBookingBanner(false)}
                className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
                data-testid="btn-dismiss-banner"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Booking Not Found Banner - when deep link reference doesn't match */}
        {bookingNotFound && (
          <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40">
            <CardContent
              className="flex items-center gap-3 py-4"
              data-testid="booking-not-found-banner"
            >
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Booking Not Found
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  We couldn't find a booking with reference{" "}
                  <span className="font-mono font-semibold">
                    {bookingNotFound}
                  </span>{" "}
                  in your account. Please check your other bookings below or
                  contact support if you believe this is an error.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBookingNotFound(null)}
                className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
                data-testid="btn-dismiss-not-found-banner"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Booking Found Banner - when deep link reference matches */}
        {highlightedBookingCode && !isLoading && (
          <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
            <CardContent
              className="flex items-center gap-3 py-4"
              data-testid="booking-found-banner"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Viewing Booking{" "}
                  <span className="font-mono">{highlightedBookingCode}</span>
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The booking from your email is highlighted below.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHighlightedBookingCode(null)}
                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                data-testid="btn-dismiss-found-banner"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Show error message with failsafe - never show "Not Found" */}
        {isError && (
          <Card className="mb-6">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <p className="text-muted-foreground">
                Unable to load booking details. Your bookings are available in
                the list below.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            className="flex w-full overflow-x-auto gap-1 md:grid md:grid-cols-5"
            data-testid="booking-tabs"
          >
            <TabsTrigger
              value="all"
              className="flex-shrink-0 px-3 md:px-4"
              data-testid="tab-all"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="flex-shrink-0 px-3 md:px-4"
              data-testid="tab-pending"
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 h-5 px-1.5 text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="flex-shrink-0 px-3 md:px-4"
              data-testid="tab-upcoming"
            >
              <span>Upcoming</span>
              {upcomingCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {upcomingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="ongoing"
              className="flex-shrink-0 px-3 md:px-4"
              data-testid="tab-ongoing"
            >
              <span>Ongoing</span>
              {ongoingCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-1 h-5 px-1.5 text-xs bg-green-600"
                >
                  {ongoingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="past"
              className="flex-shrink-0 px-3 md:px-4"
              data-testid="tab-past"
            >
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : filteredBookings && filteredBookings.length > 0 ? (
              <div className="space-y-4">
                {filteredBookings.map((booking, index) =>
                  renderBookingCard(booking, index),
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  {/* Tab-specific empty states */}
                  {activeTab === "all" && (
                    <>
                      <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No bookings yet
                      </h3>
                      <p className="text-muted-foreground text-center mb-4 max-w-sm">
                        Start exploring amazing properties and book your perfect
                        stay.
                      </p>
                      <Link href="/">
                        <Button data-testid="btn-browse-properties">
                          Browse Properties
                        </Button>
                      </Link>
                    </>
                  )}
                  {activeTab === "pending" && (
                    <>
                      <Clock className="h-12 w-12 text-amber-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No pending requests
                      </h3>
                      <p className="text-muted-foreground text-center mb-4 max-w-sm">
                        You don't have any booking requests waiting for hotel
                        confirmation.
                      </p>
                      <Link href="/">
                        <Button data-testid="btn-browse-properties-pending">
                          Find a Place to Stay
                        </Button>
                      </Link>
                    </>
                  )}
                  {activeTab === "upcoming" && (
                    <>
                      <CalendarDays className="h-12 w-12 text-blue-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No upcoming stays
                      </h3>
                      <p className="text-muted-foreground text-center mb-4 max-w-sm">
                        You don't have any confirmed bookings coming up. Time to
                        plan your next trip!
                      </p>
                      <Link href="/">
                        <Button data-testid="btn-browse-properties-upcoming">
                          Plan Your Next Trip
                        </Button>
                      </Link>
                    </>
                  )}
                  {activeTab === "ongoing" && (
                    <>
                      <Home className="h-12 w-12 text-green-500 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        Not currently staying anywhere
                      </h3>
                      <p className="text-muted-foreground text-center mb-4 max-w-sm">
                        When you check in to a property, it will appear here for
                        easy access.
                      </p>
                      {upcomingCount > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab("upcoming")}
                          data-testid="btn-view-upcoming"
                        >
                          View Upcoming Stays ({upcomingCount})
                        </Button>
                      )}
                    </>
                  )}
                  {activeTab === "past" && (
                    <>
                      <CheckCircle className="h-12 w-12 text-slate-400 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        No past bookings
                      </h3>
                      <p className="text-muted-foreground text-center mb-4 max-w-sm">
                        Your completed stays will appear here. Start your
                        journey with ZECOHO!
                      </p>
                      <Link href="/">
                        <Button data-testid="btn-browse-properties-past">
                          Explore Destinations
                        </Button>
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cancellation Confirmation Modal */}
      <Dialog
        open={cancelModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCancelModalOpen(false);
            setCancellingBooking(null);
            setCancellationReason("");
            setCancelPreview(null);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          data-testid="cancel-booking-modal"
        >
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              {cancellingBooking?.property?.title && (
                <span className="font-medium text-foreground">
                  {cancellingBooking.property.title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : cancelPreview ? (
              <>
                {/* Booking Details */}
                {cancellingBooking && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-in:</span>
                      <span className="font-medium">
                        {format(
                          new Date(cancellingBooking.checkIn),
                          "dd MMM yyyy",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Check-out:</span>
                      <span className="font-medium">
                        {format(
                          new Date(cancellingBooking.checkOut),
                          "dd MMM yyyy",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Price:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(cancellingBooking.totalPrice)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Refund Information */}
                <div
                  className={`p-4 rounded-lg border ${
                    cancelPreview.refundPercentage === 100
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : cancelPreview.refundPercentage &&
                          cancelPreview.refundPercentage > 0
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {cancelPreview.refundPercentage === 100 ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : cancelPreview.refundPercentage &&
                      cancelPreview.refundPercentage > 0 ? (
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                    <span className="font-semibold text-foreground">
                      {cancelPreview.refundPercentage === 100
                        ? "Full Refund"
                        : cancelPreview.refundPercentage &&
                            cancelPreview.refundPercentage > 0
                          ? `${cancelPreview.refundPercentage}% Partial Refund`
                          : "No Refund"}
                    </span>
                  </div>

                  {cancelPreview.refundAmount &&
                    Number(cancelPreview.refundAmount) > 0 && (
                      <p className="text-lg font-bold text-foreground mb-1">
                        {formatCurrency(cancelPreview.refundAmount)} refund
                      </p>
                    )}

                  <p className="text-sm text-muted-foreground">
                    {cancelPreview.message}
                  </p>

                  {cancelPreview.policyType && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Policy:{" "}
                      <span className="capitalize">
                        {cancelPreview.policyType}
                      </span>
                      {cancelPreview.hoursUntilCheckIn !== undefined && (
                        <span>
                          {" "}
                          • {cancelPreview.hoursUntilCheckIn} hours until
                          check-in
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Cancellation Reason */}
                <div className="space-y-2">
                  <Label htmlFor="cancellation-reason">
                    Reason for cancellation (optional)
                  </Label>
                  <Textarea
                    id="cancellation-reason"
                    placeholder="Let the property know why you're cancelling..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="resize-none"
                    rows={3}
                    data-testid="input-cancellation-reason"
                  />
                </div>

                {!cancelPreview.canCancel && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">
                      {cancelPreview.message}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Unable to load cancellation details
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelModalOpen(false)}
              data-testid="btn-cancel-modal-close"
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={
                !cancelPreview?.canCancel || cancelBookingMutation.isPending
              }
              data-testid="btn-confirm-cancel"
            >
              {cancelBookingMutation.isPending
                ? "Cancelling..."
                : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
