import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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
  XCircle,
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
  };
  guest?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export default function OwnerBookings() {
  const [activeTab, setActiveTab] = useState("all");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
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
      setRejectionReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking status.",
        variant: "destructive",
      });
    },
  });

  const handleReject = () => {
    if (!selectedBooking) return;
    updateStatusMutation.mutate({
      id: selectedBooking.id,
      status: "rejected",
      responseMessage: rejectionReason.trim() || undefined,
    });
  };

  const openRejectDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setRejectionReason("");
    setRejectDialogOpen(true);
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
      pending: { variant: "outline", label: "Pending Review" },
      confirmed: { variant: "default", label: "Confirmed" },
      rejected: { variant: "destructive", label: "Declined" },
      completed: { variant: "secondary", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };
    const config = statusConfig[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredBookings = bookings?.filter((booking) => {
    if (activeTab === "all") return true;
    if (activeTab === "upcoming") return booking.status === "confirmed";
    if (activeTab === "past") return booking.status === "completed" || booking.status === "cancelled" || booking.status === "rejected";
    if (activeTab === "pending") return booking.status === "pending";
    return true;
  });

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} data-testid={`booking-card-${booking.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">{booking.property?.title || "Property"}</CardTitle>
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

        {booking.ownerResponseMessage && booking.status === "rejected" && (
          <div className="text-sm p-3 bg-muted rounded-md">
            <p className="text-muted-foreground font-medium">Decline reason:</p>
            <p>{booking.ownerResponseMessage}</p>
          </div>
        )}

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
            </>
          )}
          {booking.status === "confirmed" && (
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
          <div className="py-4">
            <Textarea
              placeholder="e.g., Property is not available for those dates, or we're fully booked..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-rejection-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} data-testid="btn-cancel-reject">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={updateStatusMutation.isPending}
              data-testid="btn-confirm-reject"
            >
              {updateStatusMutation.isPending ? "Declining..." : "Decline Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OwnerLayout>
  );
}
