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
  User,
  MapPin,
  IndianRupee,
  Check,
  X,
  CheckCircle,
} from "lucide-react";

interface Booking {
  id: string;
  propertyId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: string;
  guest?: { firstName: string; lastName: string; email: string; profileImageUrl?: string };
  property?: { title: string; destination: string };
}

export default function OwnerBookings() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/owner/bookings", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/owner/bookings?filter=${activeTab}`);
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/owner/bookings/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      toast({ title: "Booking updated", description: "Status has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update booking.", variant: "destructive" });
    },
  });

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      confirmed: { variant: "default", label: "Confirmed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      completed: { variant: "secondary", label: "Completed" },
    };
    const c = config[status] || { variant: "secondary", label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card className="mb-4" data-testid={`booking-card-${booking.id}`}>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium" data-testid={`guest-name-${booking.id}`}>
                {booking.guest?.firstName} {booking.guest?.lastName}
              </span>
              {getStatusBadge(booking.status)}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{booking.property?.title || "Property"}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {format(new Date(booking.checkIn), "MMM d, yyyy")} - {format(new Date(booking.checkOut), "MMM d, yyyy")}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IndianRupee className="h-4 w-4" />
              <span>{formatCurrency(booking.totalPrice)}</span>
              <span>•</span>
              <span>{booking.guests} guest{booking.guests > 1 ? "s" : ""}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
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
                  variant="destructive"
                  onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "cancelled" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`cancel-booking-${booking.id}`}
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </>
            )}
            {booking.status === "confirmed" && activeTab === "ongoing" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatusMutation.mutate({ id: booking.id, status: "completed" })}
                disabled={updateStatusMutation.isPending}
                data-testid={`complete-booking-${booking.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Complete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderBookings = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (!bookings || bookings.length === 0) {
      return (
        <div className="text-center py-12">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">No {activeTab} bookings found</p>
        </div>
      );
    }

    return bookings.map((booking) => <BookingCard key={booking.id} booking={booking} />);
  };

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-bookings">
        <Card>
          <CardHeader>
            <CardTitle>Manage Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="ongoing" data-testid="tab-ongoing">Ongoing</TabsTrigger>
                <TabsTrigger value="past" data-testid="tab-past">Past</TabsTrigger>
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab}>
                {renderBookings()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </OwnerLayout>
  );
}
