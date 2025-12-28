import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useKycGuard } from "@/hooks/useKycGuard";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CalendarDays,
  Users,
  IndianRupee,
  Check,
  X,
  Clock,
  MessageSquare,
  XCircle,
  CalendarPlus,
  AlertTriangle,
  BedDouble,
  Utensils,
  CheckCircle,
  AlertCircle,
  Phone,
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface Booking {
  id: string;
  bookingCode?: string | null;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  status: "pending" | "confirmed" | "customer_confirmed" | "rejected" | "cancelled" | "checked_in" | "checked_out" | "completed" | "no_show";
  ownerResponseMessage?: string;
  respondedAt?: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkedInBy?: string;
  checkedOutBy?: string;
  actualCheckOutDate?: string;
  earlyCheckout?: boolean;
  bookingType?: "standard" | "extension";
  parentBookingId?: string | null;
  bookingCreatedAt?: string;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    images: string[];
    pricePerNight?: string;
  };
  guest?: {
    id: string;
    name: string;
    email: string;
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

export default function OwnerBookings() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("");
  const [customRejectionReason, setCustomRejectionReason] = useState("");
  const [earlyCheckoutDialogOpen, setEarlyCheckoutDialogOpen] = useState(false);
  const [earlyCheckoutBooking, setEarlyCheckoutBooking] = useState<Booking | null>(null);
  const [extendStayDialogOpen, setExtendStayDialogOpen] = useState(false);
  const [extendStayBooking, setExtendStayBooking] = useState<Booking | null>(null);
  const [extendDate, setExtendDate] = useState<Date | undefined>(undefined);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [bookingToAccept, setBookingToAccept] = useState<Booking | null>(null);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [bookingToMarkNoShow, setBookingToMarkNoShow] = useState<Booking | null>(null);
  const [noShowReason, setNoShowReason] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login?returnTo=/owner/bookings");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const REJECTION_REASONS = [
    { value: "dates_unavailable", label: "Property is not available for the requested dates" },
    { value: "fully_booked", label: "We are fully booked during this period" },
    { value: "maintenance", label: "Property is under maintenance" },
    { value: "minimum_stay", label: "Booking doesn't meet our minimum stay requirements" },
    { value: "guest_count", label: "The number of guests exceeds our capacity" },
    { value: "policy_violation", label: "Request doesn't comply with our property policies" },
    { value: "other", label: "Other (specify below)" },
  ];
  const { toast } = useToast();
  const { isKycRejected } = useKycGuard();

  if (isKycRejected) {
    return (
      <OwnerLayout>
        <Alert variant="destructive" className="mb-6" data-testid="kyc-rejected-block">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>Your KYC has been rejected. Please fix your KYC to access bookings.</span>
            <Link href="/owner/kyc">
              <Button variant="destructive" size="sm" data-testid="btn-fix-kyc">
                Fix KYC & Resubmit
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </OwnerLayout>
    );
  }

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/owner/bookings"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, responseMessage }: { id: string; status: string; responseMessage?: string }) => {
      return apiRequest("PATCH", `/api/owner/bookings/${id}/status`, { status, responseMessage });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      const message = variables.status === "confirmed" 
        ? "Booking confirmed! The guest has been notified."
        : variables.status === "rejected"
        ? "Booking declined. The guest has been notified."
        : "Booking status updated.";
      toast({
        title: variables.status === "confirmed" ? "Booking Confirmed" : "Booking Updated",
        description: message,
      });
      setRejectDialogOpen(false);
      setSelectedBooking(null);
      setSelectedRejectionReason("");
      setCustomRejectionReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking status.",
        variant: "destructive",
      });
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/owner/bookings/${id}/check-in`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      toast({
        title: "Guest Checked In",
        description: "The guest has been successfully checked in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error?.message || "Failed to mark guest as checked in.",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async ({ id, confirmEarlyCheckout }: { id: string; confirmEarlyCheckout?: boolean }) => {
      return apiRequest("PATCH", `/api/owner/bookings/${id}/check-out`, { confirmEarlyCheckout });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      setEarlyCheckoutDialogOpen(false);
      setEarlyCheckoutBooking(null);
      const isEarly = data?.isEarlyCheckout;
      toast({
        title: isEarly ? "Early Check-out Complete" : "Guest Checked Out",
        description: isEarly 
          ? "The guest has checked out early. Any refund policies should be discussed directly." 
          : "The guest has been checked out and the booking is now complete.",
      });
    },
    onError: (error: any) => {
      if (error?.requiresConfirmation) {
        const booking = bookings?.find(b => b.id === error?.bookingId);
        if (booking) {
          setEarlyCheckoutBooking(booking);
          setEarlyCheckoutDialogOpen(true);
        }
        return;
      }
      toast({
        title: "Check-out Failed",
        description: error?.message || "Failed to mark guest as checked out.",
        variant: "destructive",
      });
    },
  });

  const extendStayMutation = useMutation({
    mutationFn: async ({ id, newCheckOutDate }: { id: string; newCheckOutDate: string }) => {
      return apiRequest("POST", `/api/owner/bookings/${id}/extend`, { newCheckOutDate });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      setExtendStayDialogOpen(false);
      setExtendStayBooking(null);
      setExtendDate(undefined);
      toast({
        title: "Stay Extended",
        description: `${data.additionalNights} night(s) added. Additional payment of ₹${data.additionalAmount?.toLocaleString('en-IN')} to be collected at hotel.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Extension Failed",
        description: error?.message || "Failed to extend the stay.",
        variant: "destructive",
      });
    },
  });

  const noShowMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return apiRequest("PATCH", `/api/owner/bookings/${id}/no-show`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      setNoShowDialogOpen(false);
      setBookingToMarkNoShow(null);
      setNoShowReason("");
      toast({
        title: "Booking Marked as No-Show",
        description: "The booking has been marked as no-show. The guest has been notified and the room inventory has been released.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Mark No-Show",
        description: error?.message || "Failed to mark booking as no-show.",
        variant: "destructive",
      });
    },
  });

  const handleReject = () => {
    if (!selectedBooking) return;
    let finalReason = "";
    if (selectedRejectionReason === "other") {
      finalReason = customRejectionReason.trim();
    } else if (selectedRejectionReason) {
      const selectedOption = REJECTION_REASONS.find(r => r.value === selectedRejectionReason);
      finalReason = selectedOption?.label || "";
    }
    updateStatusMutation.mutate({
      id: selectedBooking.id,
      status: "rejected",
      responseMessage: finalReason || undefined,
    });
  };

  const openRejectDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setSelectedRejectionReason("");
    setCustomRejectionReason("");
    setRejectDialogOpen(true);
  };

  const openAcceptDialog = (booking: Booking) => {
    setBookingToAccept(booking);
    setAcceptDialogOpen(true);
  };

  const confirmAccept = () => {
    if (!bookingToAccept) return;
    updateStatusMutation.mutate({ id: bookingToAccept.id, status: "confirmed" });
    setAcceptDialogOpen(false);
    setBookingToAccept(null);
  };

  const renderBookingTimeline = (status: string) => {
    const steps = [
      { label: "Booking Requested", completed: true },
      { label: "Accepted by You", completed: status === "confirmed" || status === "checked_in" || status === "checked_out" || status === "completed" },
      { label: "Awaiting Guest Confirmation", pending: status === "confirmed", completed: status === "checked_in" || status === "checked_out" || status === "completed" },
    ];

    if (status === "rejected" || status === "cancelled") {
      return null;
    }

    return (
      <div className="text-xs space-y-1 pt-3 border-t border-border/50" data-testid="booking-timeline">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            {step.completed ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : step.pending ? (
              <Clock className="h-3 w-3 text-amber-500" />
            ) : (
              <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
            )}
            <span className={step.completed ? "text-foreground" : step.pending ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending Your Response" },
      confirmed: { variant: "default", label: "Accepted – Awaiting Guest Confirmation" },
      customer_confirmed: { variant: "default", label: "Guest Confirmed – Ready for Check-in" },
      rejected: { variant: "destructive", label: "Declined" },
      checked_in: { variant: "default", label: "Checked In" },
      checked_out: { variant: "secondary", label: "Checked Out" },
      completed: { variant: "secondary", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      no_show: { variant: "destructive", label: "No-Show" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Helper to check if no-show can be marked (guest-confirmed, past check-in time + 2 hour grace period)
  const NO_SHOW_GRACE_PERIOD_HOURS = 2;
  
  const getNoShowAvailableAt = (booking: Booking): Date => {
    const checkInDateTime = new Date(booking.checkIn);
    checkInDateTime.setHours(12, 0, 0, 0); // Standard hotel check-in at 12 PM
    return new Date(checkInDateTime.getTime() + NO_SHOW_GRACE_PERIOD_HOURS * 60 * 60 * 1000);
  };
  
  const canMarkNoShow = (booking: Booking) => {
    if (booking.status !== "customer_confirmed") return false;
    const now = new Date();
    const noShowAvailableAt = getNoShowAvailableAt(booking);
    
    // Check if we're past the check-in date entirely
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDateOnly = new Date(booking.checkIn);
    checkInDateOnly.setHours(0, 0, 0, 0);
    const isPastCheckInDate = today > checkInDateOnly;
    
    // Allow no-show if: current time >= check-in + grace period, OR current date > check-in date
    return now >= noShowAvailableAt || isPastCheckInDate;
  };
  
  // Check if no-show button should be shown (for guest-confirmed bookings on/after check-in date)
  const shouldShowNoShowButton = (booking: Booking) => {
    if (booking.status !== "customer_confirmed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDateOnly = new Date(booking.checkIn);
    checkInDateOnly.setHours(0, 0, 0, 0);
    return today >= checkInDateOnly; // Show button on check-in day or later
  };
  
  const getNoShowTooltipMessage = (booking: Booking): string => {
    const noShowAvailableAt = getNoShowAvailableAt(booking);
    const timeFormatted = noShowAvailableAt.toLocaleTimeString('en-IN', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    const dateFormatted = noShowAvailableAt.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short' 
    });
    return `Available after ${timeFormatted} on ${dateFormatted}`;
  };

  const openNoShowDialog = (booking: Booking) => {
    setBookingToMarkNoShow(booking);
    setNoShowReason("");
    setNoShowDialogOpen(true);
  };

  const confirmNoShow = () => {
    if (!bookingToMarkNoShow) return;
    noShowMutation.mutate({ id: bookingToMarkNoShow.id, reason: noShowReason || undefined });
  };

  // Helper to check if check-in is allowed (today >= check-in date)
  const canCheckIn = (booking: Booking) => {
    if (booking.status !== "confirmed" && booking.status !== "customer_confirmed") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkInDate = new Date(booking.checkIn);
    checkInDate.setHours(0, 0, 0, 0);
    return today >= checkInDate;
  };

  // Helper to check if check-out is allowed (any checked-in booking can be checked out)
  const canCheckOut = (booking: Booking) => {
    return booking.status === "checked_in";
  };

  // Check if this is an early checkout (before scheduled date)
  const isEarlyCheckout = (booking: Booking) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkOutDate = new Date(booking.checkOut);
    checkOutDate.setHours(0, 0, 0, 0);
    return today < checkOutDate;
  };

  // Handle check-out button click
  const handleCheckOut = (booking: Booking) => {
    if (isEarlyCheckout(booking)) {
      setEarlyCheckoutBooking(booking);
      setEarlyCheckoutDialogOpen(true);
    } else {
      checkOutMutation.mutate({ id: booking.id });
    }
  };

  // Confirm early checkout
  const confirmEarlyCheckout = () => {
    if (!earlyCheckoutBooking) return;
    checkOutMutation.mutate({ id: earlyCheckoutBooking.id, confirmEarlyCheckout: true });
  };

  // Handle extend stay
  const openExtendStayDialog = (booking: Booking) => {
    setExtendStayBooking(booking);
    const defaultDate = new Date(booking.checkOut);
    defaultDate.setDate(defaultDate.getDate() + 1);
    setExtendDate(defaultDate);
    setExtendStayDialogOpen(true);
  };

  const handleExtendStay = () => {
    if (!extendStayBooking || !extendDate) return;
    extendStayMutation.mutate({
      id: extendStayBooking.id,
      newCheckOutDate: format(extendDate, "yyyy-MM-dd"),
    });
  };

  const filteredBookings = bookings?.filter((booking) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") return booking.status === "confirmed" || booking.status === "customer_confirmed" || booking.status === "checked_in";
    if (activeTab === "past") return booking.status === "completed" || booking.status === "cancelled" || booking.status === "rejected" || booking.status === "checked_out" || booking.status === "no_show";
    if (activeTab === "pending") return booking.status === "pending";
    return true;
  });

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} data-testid={`booking-card-${booking.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{booking.property?.title || "Property"}</CardTitle>
              {booking.bookingCode && (
                <Badge variant="outline" className="text-xs font-mono" data-testid={`booking-code-${booking.id}`}>
                  {booking.bookingCode}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Booked by {booking.guest?.name || "Guest"}
              {booking.guest?.email && ` (${booking.guest.email})`}
            </p>
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
              <p className="font-medium">{format(new Date(booking.checkIn), "dd MMM yyyy")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Check-out</p>
              <p className="font-medium">{format(new Date(booking.checkOut), "dd MMM yyyy")}</p>
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
              <p className="font-medium">{formatCurrency(booking.totalPrice)}</p>
            </div>
          </div>
        </div>
        
        {/* Booked On date */}
        {(booking.bookingCreatedAt || booking.createdAt) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`booked-on-${booking.id}`}>
            <Clock className="h-3.5 w-3.5" />
            <span>Booked on {format(new Date(booking.bookingCreatedAt || booking.createdAt), "dd MMM yyyy, h:mm a")}</span>
          </div>
        )}

        {(booking.roomType || booking.roomOption) && (
          <div className="flex flex-wrap gap-3 text-sm pt-1">
            {booking.roomType && (
              <div className="flex items-center gap-2" data-testid={`room-type-${booking.id}`}>
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Room:</span>
                <span className="font-medium">{booking.roomType.name}</span>
              </div>
            )}
            {booking.roomOption && (
              <div className="flex items-center gap-2" data-testid={`meal-plan-${booking.id}`}>
                <Utensils className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Meal Plan:</span>
                <span className="font-medium">{booking.roomOption.name}</span>
              </div>
            )}
          </div>
        )}

        {booking.ownerResponseMessage && booking.status === "rejected" && (
          <div className="text-sm p-3 bg-muted rounded-md">
            <p className="text-muted-foreground font-medium">Decline reason:</p>
            <p>{booking.ownerResponseMessage}</p>
          </div>
        )}

        {booking.earlyCheckout && booking.status === "completed" && (
          <div className="text-sm p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-amber-800 dark:text-amber-200">
              Early check-out on {booking.actualCheckOutDate && format(new Date(booking.actualCheckOutDate), "dd MMM yyyy")}
              (scheduled: {format(new Date(booking.checkOut), "dd MMM yyyy")})
            </span>
          </div>
        )}

        {booking.bookingType === "extension" && (
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
            Stay Extension
          </Badge>
        )}

        {booking.status === "pending" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => openAcceptDialog(booking)}
                disabled={updateStatusMutation.isPending}
                data-testid={`confirm-booking-${booking.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept Booking
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openRejectDialog(booking)}
                disabled={updateStatusMutation.isPending}
                data-testid={`decline-booking-${booking.id}`}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
              <Link href="/owner/messages">
                <Button size="sm" variant="ghost" data-testid={`message-guest-pending-${booking.id}`}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </Link>
              {booking.guest?.phone && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.location.href = `tel:${booking.guest!.phone}`}
                  data-testid={`call-guest-pending-${booking.id}`}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
              )}
            </div>
            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Accepting will temporarily hold this room for the guest. Payment is not collected yet.
              </p>
            </div>
            {renderBookingTimeline(booking.status)}
          </div>
        )}

        {booking.status === "confirmed" && (
          <div className="space-y-3">
            <div className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-xs text-green-700 dark:text-green-300">
                The guest has been notified. You'll be informed once the guest confirms or completes payment.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canCheckIn(booking) && (
                <Button
                  size="sm"
                  onClick={() => checkInMutation.mutate(booking.id)}
                  disabled={checkInMutation.isPending}
                  data-testid={`check-in-booking-${booking.id}`}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Checked-in
                </Button>
              )}
              {!canCheckIn(booking) && (
                <Badge variant="outline" className="text-xs">
                  Check-in available from {format(new Date(booking.checkIn), "dd MMM")}
                </Badge>
              )}
              <Link href="/owner/messages">
                <Button size="sm" data-testid={`message-guest-confirmed-${booking.id}`}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message Guest
                </Button>
              </Link>
              {booking.guest?.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = `tel:${booking.guest!.phone}`}
                  data-testid={`call-guest-confirmed-${booking.id}`}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call Guest
                </Button>
              )}
            </div>
            {renderBookingTimeline(booking.status)}
          </div>
        )}

        {booking.status === "customer_confirmed" && (
          <div className="space-y-3">
            <div className="p-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                The guest has confirmed their booking. Room is secured and ready for their arrival.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canCheckIn(booking) && (
                <Button
                  size="sm"
                  onClick={() => checkInMutation.mutate(booking.id)}
                  disabled={checkInMutation.isPending}
                  data-testid={`check-in-booking-${booking.id}`}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark Checked-in
                </Button>
              )}
              {!canCheckIn(booking) && (
                <Badge variant="outline" className="text-xs">
                  Check-in available from {format(new Date(booking.checkIn), "dd MMM")}
                </Badge>
              )}
              <Link href="/owner/messages">
                <Button size="sm" data-testid={`message-guest-customer-confirmed-${booking.id}`}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message Guest
                </Button>
              </Link>
              {booking.guest?.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = `tel:${booking.guest!.phone}`}
                  data-testid={`call-guest-customer-confirmed-${booking.id}`}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call Guest
                </Button>
              )}
              {shouldShowNoShowButton(booking) && (
                canMarkNoShow(booking) ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openNoShowDialog(booking)}
                    disabled={noShowMutation.isPending}
                    data-testid={`mark-no-show-${booking.id}`}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Mark No-Show
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          data-testid={`mark-no-show-disabled-${booking.id}`}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          No-Show
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{getNoShowTooltipMessage(booking)}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              )}
            </div>
            {shouldShowNoShowButton(booking) && (
              <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {canMarkNoShow(booking) 
                    ? `Guest was expected to check in by 2:00 PM on ${format(new Date(booking.checkIn), "dd MMM")} but has not arrived. If the guest did not show up, you can mark this booking as a no-show.`
                    : `No-show can be marked after ${getNoShowTooltipMessage(booking).replace('Available after ', '')}. Please wait for the grace period to pass.`
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {booking.status === "checked_in" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => handleCheckOut(booking)}
                disabled={checkOutMutation.isPending}
                data-testid={`check-out-booking-${booking.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                {isEarlyCheckout(booking) ? "Early Check-out" : "Mark Checked-out"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openExtendStayDialog(booking)}
                disabled={extendStayMutation.isPending}
                data-testid={`extend-stay-${booking.id}`}
              >
                <CalendarPlus className="h-4 w-4 mr-1" />
                Extend Stay
              </Button>
              <Link href="/owner/messages">
                <Button size="sm" variant="ghost" data-testid={`message-guest-${booking.id}`}>
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Message Guest
                </Button>
              </Link>
              {booking.guest?.phone && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.location.href = `tel:${booking.guest!.phone}`}
                  data-testid={`call-guest-checked-in-${booking.id}`}
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call Guest
                </Button>
              )}
            </div>
            {booking.checkInTime && (
              <span className="text-xs text-muted-foreground">
                Checked in: {format(new Date(booking.checkInTime), "dd MMM HH:mm")}
              </span>
            )}
          </div>
        )}

        {(booking.status === "completed" || booking.status === "checked_out") && (
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            {booking.checkInTime && (
              <span>Checked in: {format(new Date(booking.checkInTime), "dd MMM HH:mm")}</span>
            )}
            {booking.checkOutTime && (
              <span>Checked out: {format(new Date(booking.checkOutTime), "dd MMM HH:mm")}</span>
            )}
          </div>
        )}

        {(booking.status === "rejected" || booking.status === "cancelled") && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/owner/messages">
              <Button size="sm" variant="ghost" data-testid={`message-guest-${booking.id}`}>
                <MessageSquare className="h-4 w-4 mr-1" />
                Message Guest
              </Button>
            </Link>
            {booking.guest?.phone && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.href = `tel:${booking.guest!.phone}`}
                data-testid={`call-guest-rejected-${booking.id}`}
              >
                <Phone className="h-4 w-4 mr-1" />
                Call Guest
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-bookings">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4" data-testid="booking-tabs">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Confirmed</TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : filteredBookings && filteredBookings.length > 0 ? (
              <div className="space-y-4">
                {filteredBookings.map(renderBookingCard)}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No bookings found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Booking Request</DialogTitle>
            <DialogDescription>
              Let the guest know why you're declining their booking request. This helps them understand and find a better match.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Select a reason</Label>
              <Select
                value={selectedRejectionReason}
                onValueChange={setSelectedRejectionReason}
              >
                <SelectTrigger data-testid="select-rejection-reason">
                  <SelectValue placeholder="Choose a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value} data-testid={`reason-${reason.value}`}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRejectionReason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Specify your reason</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Please provide more details..."
                  value={customRejectionReason}
                  onChange={(e) => setCustomRejectionReason(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="input-custom-rejection-reason"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="btn-cancel-reject">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={updateStatusMutation.isPending || !selectedRejectionReason || (selectedRejectionReason === "other" && !customRejectionReason.trim())}
              data-testid="btn-confirm-reject"
            >
              {updateStatusMutation.isPending ? "Declining..." : "Decline Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early Checkout Confirmation Dialog */}
      <Dialog open={earlyCheckoutDialogOpen} onOpenChange={setEarlyCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Early Check-out Confirmation
            </DialogTitle>
            <DialogDescription>
              The guest is checking out before their scheduled date. Please confirm to proceed.
            </DialogDescription>
          </DialogHeader>
          {earlyCheckoutBooking && (
            <div className="py-4 space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Booking Details:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Property: {earlyCheckoutBooking.property?.title}</p>
                  <p>Scheduled Check-out: {format(new Date(earlyCheckoutBooking.checkOut), "dd MMM yyyy")}</p>
                  <p>Today: {format(new Date(), "dd MMM yyyy")}</p>
                </div>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription>
                  Early check-out does not automatically process refunds. Please discuss any refund policies directly with the guest.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setEarlyCheckoutDialogOpen(false);
                setEarlyCheckoutBooking(null);
              }}
              data-testid="btn-cancel-early-checkout"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmEarlyCheckout}
              disabled={checkOutMutation.isPending}
              data-testid="btn-confirm-early-checkout"
            >
              {checkOutMutation.isPending ? "Processing..." : "Confirm Early Check-out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Stay Dialog */}
      <Dialog open={extendStayDialogOpen} onOpenChange={setExtendStayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Extend Guest Stay
            </DialogTitle>
            <DialogDescription>
              Select a new check-out date to extend the guest's stay. Payment will be collected at the hotel.
            </DialogDescription>
          </DialogHeader>
          {extendStayBooking && (
            <div className="py-4 space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Current Booking:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Property: {extendStayBooking.property?.title}</p>
                  <p>Guest: {extendStayBooking.guest?.name}</p>
                  <p>Current Check-out: {format(new Date(extendStayBooking.checkOut), "dd MMM yyyy")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>New Check-out Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="input-extend-date"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {extendDate ? format(extendDate, "dd MMM yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={extendDate}
                      onSelect={setExtendDate}
                      disabled={(date) => {
                        const minDate = new Date(extendStayBooking.checkOut);
                        return date <= minDate;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {extendDate && extendStayBooking.property?.pricePerNight && (
                <div className="bg-primary/5 p-4 rounded-lg">
                  <p className="text-sm font-medium">Extension Summary:</p>
                  <div className="text-sm text-muted-foreground mt-2">
                    {(() => {
                      const originalCheckout = new Date(extendStayBooking.checkOut);
                      const nights = Math.ceil((extendDate.getTime() - originalCheckout.getTime()) / (1000 * 60 * 60 * 24));
                      const price = nights * parseFloat(extendStayBooking.property?.pricePerNight || "0");
                      return (
                        <>
                          <p>Additional Nights: {nights}</p>
                          <p className="font-medium text-foreground">
                            Additional Payment: {formatCurrency(price.toString())}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setExtendStayDialogOpen(false);
                setExtendStayBooking(null);
                setExtendDate(undefined);
              }}
              data-testid="btn-cancel-extend"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExtendStay}
              disabled={extendStayMutation.isPending || !extendDate}
              data-testid="btn-confirm-extend"
            >
              {extendStayMutation.isPending ? "Extending..." : "Confirm Extension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Confirmation Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking Acceptance</DialogTitle>
            <DialogDescription>
              Please review the following before accepting this booking.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>This booking will be marked as Accepted</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>The guest will be notified instantly</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>The room will be held for this guest</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-amber-700 dark:text-amber-300">Payment is not collected yet</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAcceptDialogOpen(false);
                setBookingToAccept(null);
              }}
              data-testid="btn-cancel-accept"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmAccept}
              disabled={updateStatusMutation.isPending}
              data-testid="btn-confirm-accept"
            >
              {updateStatusMutation.isPending ? "Accepting..." : "Confirm Acceptance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* No-Show Confirmation Dialog */}
      <Dialog open={noShowDialogOpen} onOpenChange={(open) => {
        setNoShowDialogOpen(open);
        if (!open) {
          setNoShowReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Booking as No-Show</DialogTitle>
            <DialogDescription>
              Confirm that the guest did not check in for this booking.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {bookingToMarkNoShow && (
              <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
                <p><strong>Guest:</strong> {bookingToMarkNoShow.guest?.name}</p>
                <p><strong>Property:</strong> {bookingToMarkNoShow.property?.title}</p>
                <p><strong>Check-in Date:</strong> {format(new Date(bookingToMarkNoShow.checkIn), "dd MMM yyyy")}</p>
                <p><strong>Amount:</strong> {formatCurrency(bookingToMarkNoShow.totalPrice)}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="no-show-reason">Reason (optional)</Label>
              <Textarea
                id="no-show-reason"
                placeholder="e.g., Guest did not arrive, could not be reached by phone..."
                value={noShowReason}
                onChange={(e) => setNoShowReason(e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="input-no-show-reason"
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <span>This booking will be marked as No-Show</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <span>The guest will be notified via email</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Room inventory will be released for new bookings</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-amber-700 dark:text-amber-300">This action cannot be undone by you</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setNoShowDialogOpen(false);
                setNoShowReason("");
              }}
              data-testid="btn-cancel-no-show"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmNoShow}
              disabled={noShowMutation.isPending}
              data-testid="btn-confirm-no-show"
            >
              {noShowMutation.isPending ? "Marking..." : "Confirm No-Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
