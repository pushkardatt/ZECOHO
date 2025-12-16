import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import {
  CalendarDays,
  Users,
  IndianRupee,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  ownerResponseMessage?: string;
}

interface BookingActionCardProps {
  booking: Booking;
  isOwner: boolean;
  propertyTitle?: string;
  onStatusChange?: () => void;
}

const REJECTION_REASONS = [
  { value: "dates_unavailable", label: "Property is not available for the requested dates" },
  { value: "fully_booked", label: "We are fully booked during this period" },
  { value: "maintenance", label: "Property is under maintenance" },
  { value: "minimum_stay", label: "Booking doesn't meet our minimum stay requirements" },
  { value: "guest_count", label: "The number of guests exceeds our capacity" },
  { value: "policy_violation", label: "Request doesn't comply with our property policies" },
  { value: "other", label: "Other (specify below)" },
];

export function BookingActionCard({ 
  booking, 
  isOwner, 
  propertyTitle,
  onStatusChange 
}: BookingActionCardProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState("");
  const [customRejectionReason, setCustomRejectionReason] = useState("");
  const { toast } = useToast();

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, responseMessage }: { status: string; responseMessage?: string }) => {
      return apiRequest("PATCH", `/api/owner/bookings/${booking.id}/status`, { 
        status, 
        responseMessage 
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      const message = variables.status === "confirmed" 
        ? "Booking confirmed! The guest has been notified."
        : "Booking declined. The guest has been notified.";
      toast({
        title: variables.status === "confirmed" ? "Booking Confirmed" : "Booking Declined",
        description: message,
      });
      setRejectDialogOpen(false);
      setSelectedRejectionReason("");
      setCustomRejectionReason("");
      onStatusChange?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking status.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    updateStatusMutation.mutate({ status: "confirmed" });
  };

  const handleReject = () => {
    let finalReason = "";
    if (selectedRejectionReason === "other") {
      finalReason = customRejectionReason.trim();
    } else if (selectedRejectionReason) {
      const selectedOption = REJECTION_REASONS.find(r => r.value === selectedRejectionReason);
      finalReason = selectedOption?.label || "";
    }
    updateStatusMutation.mutate({
      status: "rejected",
      responseMessage: finalReason || undefined,
    });
  };

  const getStatusBadge = () => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: any }> = {
      pending: { variant: "outline", label: "Awaiting Response", icon: Clock },
      confirmed: { variant: "default", label: "Confirmed", icon: CheckCircle },
      rejected: { variant: "destructive", label: "Declined", icon: XCircle },
      completed: { variant: "secondary", label: "Completed", icon: CheckCircle },
      cancelled: { variant: "destructive", label: "Cancelled", icon: XCircle },
    };
    const config = statusConfig[booking.status] || { variant: "secondary", label: booking.status, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <>
      <Card className="bg-muted/50 border-primary/20" data-testid={`booking-card-chat-${booking.id}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {isOwner ? "Booking Request" : "Your Booking Request"}
            </span>
            {getStatusBadge()}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Check-in</p>
                <p className="font-medium">{format(new Date(booking.checkIn), "dd MMM yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Check-out</p>
                <p className="font-medium">{format(new Date(booking.checkOut), "dd MMM yyyy")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Guests</p>
                <p className="font-medium">{booking.guests}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="font-medium">{formatCurrency(booking.totalPrice)}</p>
              </div>
            </div>
          </div>

          {booking.status === "rejected" && booking.ownerResponseMessage && (
            <div className="text-sm p-2 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-destructive font-medium text-xs">Decline reason:</p>
              <p className="text-muted-foreground">{booking.ownerResponseMessage}</p>
            </div>
          )}

          {isOwner && booking.status === "pending" && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={updateStatusMutation.isPending}
                className="flex-1"
                data-testid={`accept-booking-chat-${booking.id}`}
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectDialogOpen(true)}
                disabled={updateStatusMutation.isPending}
                className="flex-1"
                data-testid={`decline-booking-chat-${booking.id}`}
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          )}

          {!isOwner && booking.status === "pending" && (
            <p className="text-xs text-muted-foreground pt-2">
              The property owner typically responds within 24 hours.
            </p>
          )}

          {booking.status === "confirmed" && (
            <p className="text-xs text-green-600 dark:text-green-400 pt-2">
              This booking has been confirmed!
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Booking Request</DialogTitle>
            <DialogDescription>
              Let the guest know why you're declining their booking request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason-chat">Select a reason</Label>
              <Select
                value={selectedRejectionReason}
                onValueChange={setSelectedRejectionReason}
              >
                <SelectTrigger data-testid="select-rejection-reason-chat">
                  <SelectValue placeholder="Choose a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value} data-testid={`chat-reason-${reason.value}`}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRejectionReason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason-chat">Specify your reason</Label>
                <Textarea
                  id="custom-reason-chat"
                  placeholder="Please provide more details..."
                  value={customRejectionReason}
                  onChange={(e) => setCustomRejectionReason(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="input-custom-rejection-reason-chat"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={updateStatusMutation.isPending || !selectedRejectionReason || (selectedRejectionReason === "other" && !customRejectionReason.trim())}
              data-testid="btn-confirm-reject-chat"
            >
              {updateStatusMutation.isPending ? "Declining..." : "Decline Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
