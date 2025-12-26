import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  bookingCode?: string | null;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  status: "pending" | "confirmed" | "customer_confirmed" | "rejected" | "cancelled" | "checked_in" | "checked_out" | "completed";
  ownerResponseMessage?: string;
  respondedAt?: string;
  checkInTime?: string;
  checkOutTime?: string;
  actualCheckOutDate?: string;
  earlyCheckout?: boolean;
  bookingType?: "standard" | "extension";
  parentBookingId?: string | null;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    images: string[];
    destination: string;
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

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState("all");
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showNewBookingBanner, setShowNewBookingBanner] = useState(false);

  // Check if user just created a booking (via URL param)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "true") {
      setShowNewBookingBanner(true);
      // Clean up URL without triggering navigation
      window.history.replaceState({}, "", "/my-bookings");
      // Auto-hide banner after 10 seconds
      const timer = setTimeout(() => setShowNewBookingBanner(false), 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login?returnTo=/my-bookings");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: bookings, isLoading, isError, error } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: isAuthenticated && !authLoading, // Only fetch when authenticated
  });
  
  // Sort bookings by createdAt (newest first) so newly created booking appears at top
  const sortedBookings = bookings?.slice().sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

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
      return await apiRequest("POST", `/api/bookings/${bookingId}/customer-confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Confirmed!",
        description: "The hotel has been notified. Your room is now secured.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Confirmation Failed",
        description: error.message || "Unable to confirm booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await apiRequest("PATCH", `/api/bookings/${bookingId}/status`, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Booking Cancelled",
        description: "Your booking request has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Unable to cancel booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: any }> = {
      pending: { variant: "outline", label: "Awaiting Hotel Confirmation", icon: Clock },
      confirmed: { variant: "default", label: "Accepted by Hotel", icon: CheckCircle },
      customer_confirmed: { variant: "default", label: "Confirmed", icon: CheckCircle },
      rejected: { variant: "destructive", label: "Declined", icon: XCircle },
      checked_in: { variant: "default", label: "Checked In", icon: CheckCircle },
      checked_out: { variant: "secondary", label: "Checked Out", icon: CheckCircle },
      completed: { variant: "secondary", label: "Completed", icon: CheckCircle },
      cancelled: { variant: "destructive", label: "Cancelled", icon: XCircle },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status, icon: Clock };
    const Icon = config.icon;
    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant={config.variant} className="flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {config.label}
        </Badge>
        {status === "confirmed" && (
          <span className="text-xs text-muted-foreground">Please confirm to proceed</span>
        )}
      </div>
    );
  };

  const filteredBookings = sortedBookings?.filter((booking) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") return booking.status === "pending" || booking.status === "confirmed" || booking.status === "customer_confirmed" || booking.status === "checked_in";
    if (activeTab === "past") return booking.status === "completed" || booking.status === "cancelled" || booking.status === "rejected" || booking.status === "checked_out";
    return true;
  });

  const renderBookingCard = (booking: Booking, index: number) => {
    // Highlight the newest booking when success banner is shown
    const isNewestBooking = index === 0 && showNewBookingBanner;
    
    return (
    <Card 
      key={booking.id} 
      data-testid={`booking-card-${booking.id}`} 
      className={`overflow-hidden transition-all duration-500 ${isNewestBooking ? 'ring-2 ring-primary ring-offset-2 shadow-lg' : ''}`}
    >
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
                  <CardTitle className="text-base">{booking.property?.title || "Property"}</CardTitle>
                  {booking.bookingCode && (
                    <Badge variant="outline" className="text-xs font-mono" data-testid={`booking-code-${booking.id}`}>
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

            {booking.status === "pending" && (
              <div className="space-y-3">
                {/* Booking Request Status Banner */}
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-base">
                        Booking Request Sent
                      </h4>
                      <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                        Your booking request has been sent to the property owner. They usually respond within 24 hours.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Next Steps Info */}
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    Next step: Wait for owner confirmation or message them to speed things up
                  </p>
                  <ul className="text-muted-foreground space-y-1 text-xs pl-6">
                    <li>• The hotel will review and confirm your booking</li>
                    <li>• Once confirmed, you'll receive check-in details</li>
                    <li>• Payment is settled directly at the hotel</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <Link href="/messages">
                    <Button size="sm" className="gap-2" data-testid={`btn-chat-owner-${booking.id}`}>
                      <MessageSquare className="h-4 w-4" />
                      Chat with Owner
                    </Button>
                  </Link>
                  {booking.property && (
                    <Link href={`/properties/${booking.property.id}`}>
                      <Button size="sm" variant="outline" data-testid={`btn-view-property-pending-${booking.id}`}>
                        View Property
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {booking.status === "rejected" && (
              <div className="text-sm p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-destructive font-medium">Booking was declined by the owner</p>
                {booking.ownerResponseMessage && (
                  <p className="text-muted-foreground mt-1">{booking.ownerResponseMessage}</p>
                )}
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
                        Please confirm your booking to secure your room. The hotel is holding this reservation for you.
                      </p>
                      
                      {/* Booking Summary */}
                      <div className="mt-4 p-4 bg-white/60 dark:bg-black/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-3">Booking Summary</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Check-in</p>
                            <p className="font-medium text-green-900 dark:text-green-100">{format(new Date(booking.checkIn), "dd MMM yyyy")}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Check-out</p>
                            <p className="font-medium text-green-900 dark:text-green-100">{format(new Date(booking.checkOut), "dd MMM yyyy")}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Guests</p>
                            <p className="font-medium text-green-900 dark:text-green-100">{booking.guests}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Total Price</p>
                            <p className="font-semibold text-green-900 dark:text-green-100">{formatCurrency(booking.totalPrice)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Confirmation Action Buttons - Fixed at bottom, always visible */}
                      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <Button 
                          size="lg"
                          className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white gap-2"
                          onClick={() => confirmBookingMutation.mutate(booking.id)}
                          disabled={confirmBookingMutation.isPending}
                          data-testid={`btn-confirm-booking-${booking.id}`}
                        >
                          <CheckCircle className="h-5 w-5" />
                          {confirmBookingMutation.isPending ? "Confirming..." : "Confirm Booking"}
                        </Button>
                        <Button 
                          size="lg"
                          variant="outline" 
                          className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                          onClick={() => cancelBookingMutation.mutate(booking.id)}
                          disabled={cancelBookingMutation.isPending}
                          data-testid={`btn-cancel-request-${booking.id}`}
                        >
                          <XCircle className="h-5 w-5 mr-1" />
                          {cancelBookingMutation.isPending ? "Cancelling..." : "Cancel Request"}
                        </Button>
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
                        Your room is secured. The hotel has been notified. You'll receive check-in details closer to your arrival date.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons for Customer Confirmed - Chat and Call enabled */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Link href="/messages">
                    <Button size="sm" className="gap-2" data-testid={`btn-message-hotel-${booking.id}`}>
                      <MessageSquare className="h-4 w-4" />
                      Chat with Hotel
                    </Button>
                  </Link>
                  {booking.property && (
                    <Link href={`/properties/${booking.property.id}`}>
                      <Button size="sm" variant="outline" data-testid={`btn-view-property-confirmed-${booking.id}`}>
                        View Property
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {booking.status === "checked_in" && (
              <div className="text-sm p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-blue-800 dark:text-blue-200">
                  You're checked in! Enjoy your stay.
                  {booking.checkInTime && (
                    <span className="block text-xs mt-1">
                      Checked in on {format(new Date(booking.checkInTime), "dd MMM yyyy 'at' HH:mm")}
                    </span>
                  )}
                </p>
              </div>
            )}

            {(booking.status === "checked_out" || booking.status === "completed") && booking.checkOutTime && (
              <div className={`text-sm p-3 border rounded-md ${booking.earlyCheckout ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-muted'}`}>
                <p className={booking.earlyCheckout ? 'text-amber-800 dark:text-amber-200' : 'text-muted-foreground'}>
                  {booking.earlyCheckout ? (
                    <>
                      <span className="flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        You checked out early
                      </span>
                      <span className="block text-xs mt-1">
                        Original check-out: {format(new Date(booking.checkOut), "dd MMM yyyy")} | 
                        Actual check-out: {format(new Date(booking.checkOutTime), "dd MMM yyyy 'at' HH:mm")}
                      </span>
                      <span className="block text-xs mt-1 text-amber-600 dark:text-amber-400">
                        Please contact the hotel regarding any refund policies.
                      </span>
                    </>
                  ) : (
                    <>
                      Your stay is complete. Thank you for choosing us!
                      <span className="block text-xs mt-1">
                        Checked out on {format(new Date(booking.checkOutTime), "dd MMM yyyy 'at' HH:mm")}
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}

            {booking.bookingType === "extension" && (
              <div className="text-sm p-3 bg-primary/5 border border-primary/20 rounded-md">
                <p className="flex items-center gap-1 text-primary font-medium">
                  <Link2 className="h-4 w-4" />
                  Stay Extension
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  This booking is an extension of a previous stay. Payment to be settled at the hotel.
                </p>
              </div>
            )}

            {/* Only show generic action buttons for statuses that don't have their own */}
            {booking.status !== "pending" && booking.status !== "confirmed" && booking.status !== "customer_confirmed" && (
              <div className="flex items-center gap-2 flex-wrap">
                {booking.property && (
                  <Link href={`/properties/${booking.property.id}`}>
                    <Button size="sm" variant="outline" data-testid={`view-property-${booking.id}`}>
                      View Property
                    </Button>
                  </Link>
                )}
                <Link href="/messages">
                  <Button size="sm" variant="ghost" data-testid={`message-owner-${booking.id}`}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message Owner
                  </Button>
                </Link>
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
            <CardContent className="flex items-center gap-3 py-4" data-testid="new-booking-success-banner">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">
                  Booking Request Created Successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your latest booking is shown below. The property owner will review your request shortly.
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

        {/* Show error message with failsafe - never show "Not Found" */}
        {isError && (
          <Card className="mb-6">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <p className="text-muted-foreground">
                Unable to load booking details. Your bookings are available in the list below.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3" data-testid="booking-tabs">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
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
                {filteredBookings.map((booking, index) => renderBookingCard(booking, index))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No bookings found</p>
                  <Link href="/">
                    <Button data-testid="btn-browse-properties">
                      Browse Properties
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
