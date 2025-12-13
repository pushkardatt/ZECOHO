import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  CalendarDays,
  Users,
  IndianRupee,
  Check,
  X,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Link } from "wouter";

interface Booking {
  id: number;
  propertyId: number;
  propertyTitle: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  status: "pending" | "confirmed" | "ongoing" | "completed" | "cancelled";
  createdAt: string;
}

export default function OwnerBookings() {
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/owner/bookings", activeTab],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/owner/bookings/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      toast({
        title: "Booking Updated",
        description: "The booking status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking status.",
        variant: "destructive",
      });
    },
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
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      confirmed: { variant: "default", label: "Confirmed" },
      ongoing: { variant: "secondary", label: "Ongoing" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredBookings = bookings?.filter((booking) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") return booking.status === "confirmed";
    if (activeTab === "ongoing") return booking.status === "ongoing";
    if (activeTab === "past") return booking.status === "completed" || booking.status === "cancelled";
    if (activeTab === "pending") return booking.status === "pending";
    return true;
  });

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} data-testid={`booking-card-${booking.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">{booking.propertyTitle}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Booked by {booking.guestName}
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

        <div className="flex items-center gap-2 flex-wrap">
          {booking.status === "pending" && (
            <>
              <Button
                size="sm"
                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "confirmed" })}
                disabled={updateStatusMutation.isPending}
                data-testid={`confirm-booking-${booking.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "cancelled" })}
                disabled={updateStatusMutation.isPending}
                data-testid={`decline-booking-${booking.id}`}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </>
          )}
          {booking.status === "ongoing" && (
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "completed" })}
              disabled={updateStatusMutation.isPending}
              data-testid={`complete-booking-${booking.id}`}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          )}
          <Link href="/owner/messages">
            <Button size="sm" variant="ghost" data-testid={`message-guest-${booking.id}`}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Message Guest
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-bookings">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5" data-testid="booking-tabs">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">Pending</TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="ongoing" data-testid="tab-ongoing">Ongoing</TabsTrigger>
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
    </OwnerLayout>
  );
}
