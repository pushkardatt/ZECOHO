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
} from "lucide-react";
import { Link } from "wouter";

interface Booking {
  id: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  ownerResponseMessage?: string;
  respondedAt?: string;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    images: string[];
    city: string;
    state: string;
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
      pending: { variant: "outline", label: "Awaiting Confirmation", icon: Clock },
      confirmed: { variant: "default", label: "Confirmed", icon: CheckCircle },
      rejected: { variant: "destructive", label: "Declined", icon: XCircle },
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
    if (activeTab === "upcoming") return booking.status === "pending" || booking.status === "confirmed";
    if (activeTab === "past") return booking.status === "completed" || booking.status === "cancelled" || booking.status === "rejected";
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
                <CardTitle className="text-base">{booking.property?.title || "Property"}</CardTitle>
                {booking.property && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {booking.property.city}, {booking.property.state}
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
              <div className="text-sm p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-amber-800 dark:text-amber-200">
                  Your booking request has been sent to the property owner. They typically respond within 24 hours.
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
          <h1 className="text-2xl font-bold">My Bookings</h1>
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
