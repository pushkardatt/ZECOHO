import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import { Link } from "wouter";

interface Booking {
  id: string;
  bookingCode?: string | null;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "checked_in" | "checked_out" | "completed";
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
}

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState("all");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: any }> = {
      pending: { variant: "outline", label: "Awaiting Hotel Confirmation", icon: Clock },
      confirmed: { variant: "default", label: "Confirmed", icon: CheckCircle },
      rejected: { variant: "destructive", label: "Declined", icon: XCircle },
      checked_in: { variant: "default", label: "Checked In", icon: CheckCircle },
      checked_out: { variant: "secondary", label: "Checked Out", icon: CheckCircle },
      completed: { variant: "secondary", label: "Completed", icon: CheckCircle },
      cancelled: { variant: "destructive", label: "Cancelled", icon: XCircle },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredBookings = bookings?.filter((booking) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") return booking.status === "pending" || booking.status === "confirmed" || booking.status === "checked_in";
    if (activeTab === "past") return booking.status === "completed" || booking.status === "cancelled" || booking.status === "rejected" || booking.status === "checked_out";
    return true;
  });

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} data-testid={`booking-card-${booking.id}`} className="overflow-hidden">
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

            {booking.status === "pending" && (
              <div className="text-sm p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md space-y-3">
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">What happens next?</p>
                  <ul className="text-amber-700 dark:text-amber-300 space-y-1 text-xs">
                    <li>1. The hotel will review and confirm your booking (usually within 24 hours)</li>
                    <li>2. Once confirmed, you'll receive details about the token payment</li>
                    <li>3. The remaining balance is paid directly at the hotel during check-in</li>
                  </ul>
                </div>
                <p className="text-amber-600 dark:text-amber-400 text-xs">
                  No payment is required until the hotel confirms your booking.
                </p>
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
              <div className="text-sm p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-green-800 dark:text-green-200">
                  Your booking is confirmed! You'll receive check-in details closer to your arrival date.
                </p>
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
          </CardContent>
        </div>
      </div>
    </Card>
  );

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
                {filteredBookings.map(renderBookingCard)}
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
