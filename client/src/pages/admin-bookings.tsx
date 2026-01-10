import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDays, XCircle, LogIn, LogOut, AlertTriangle, Search, BookOpen, Clock, CheckCircle, Ban, Info } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, Property, User } from "@shared/schema";

type BookingWithDetails = Booking & { property: Property; guest: User };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  customer_confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  checked_in: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  checked_out: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  no_show: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export default function AdminBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [noShowDialogOpen, setNoShowDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [selectedCancelReason, setSelectedCancelReason] = useState("");

  const CANCELLATION_REASONS = [
    { value: "guest_request", label: "Guest requested cancellation" },
    { value: "payment_issue", label: "Payment issue" },
    { value: "property_unavailable", label: "Property no longer available" },
    { value: "overbooking", label: "Overbooking" },
    { value: "maintenance", label: "Property under maintenance" },
    { value: "policy_violation", label: "Policy violation by guest" },
    { value: "fraudulent_booking", label: "Fraudulent booking" },
    { value: "emergency", label: "Emergency situation" },
    { value: "owner_request", label: "Property owner request" },
    { value: "other", label: "Other (specify below)" },
  ];

  const { data: bookings, isLoading: bookingsLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/bookings"],
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    noShowBookings: number;
  }>({
    queryKey: ["/api/admin/stats/bookings"],
    enabled: !!user,
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/bookings/${bookingId}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats/bookings"] });
      toast({ title: "Booking cancelled", description: "The booking has been cancelled successfully." });
      setCancelDialogOpen(false);
      setSelectedBooking(null);
      setActionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markNoShowMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      return apiRequest("PATCH", `/api/admin/bookings/${bookingId}/no-show`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats/bookings"] });
      toast({ title: "Marked as no-show", description: "The booking has been marked as no-show." });
      setNoShowDialogOpen(false);
      setSelectedBooking(null);
      setActionReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const forceCheckInMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("POST", `/api/admin/bookings/${bookingId}/force-check-in`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Checked in", description: "The guest has been force checked in." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const forceCheckOutMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("POST", `/api/admin/bookings/${bookingId}/force-check-out`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      toast({ title: "Checked out", description: "The guest has been force checked out." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredBookings = bookings?.filter((booking) => {
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      booking.bookingCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${booking.guest.firstName} ${booking.guest.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Booking Management</h1>
        <p className="text-muted-foreground">
          View and manage all platform bookings
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card 
          className={`cursor-pointer hover-elevate transition-all ${statusFilter === "all" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setStatusFilter("all")}
          data-testid="card-total-bookings"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover-elevate transition-all ${statusFilter === "pending" ? "ring-2 ring-yellow-500" : ""}`}
          onClick={() => setStatusFilter("pending")}
          data-testid="card-pending-bookings"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">{stats?.pendingBookings || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover-elevate transition-all ${statusFilter === "confirmed" ? "ring-2 ring-green-500" : ""}`}
          onClick={() => setStatusFilter("confirmed")}
          data-testid="card-confirmed-bookings"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{stats?.confirmedBookings || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover-elevate transition-all ${statusFilter === "cancelled" ? "ring-2 ring-red-500" : ""}`}
          onClick={() => setStatusFilter("cancelled")}
          data-testid="card-cancelled-bookings"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-red-600">{stats?.cancelledBookings || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover-elevate transition-all ${statusFilter === "no_show" ? "ring-2 ring-orange-500" : ""}`}
          onClick={() => setStatusFilter("no_show")}
          data-testid="card-noshow-bookings"
        >
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No-Show</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">{stats?.noShowBookings || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>Manage bookings across all properties</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="input-booking-search"
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter" className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="customer_confirmed">Customer Confirmed</SelectItem>
                  <SelectItem value="checked_in">Checked In</SelectItem>
                  <SelectItem value="checked_out">Checked Out</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bookingsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredBookings?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">No bookings found</p>
              {statusFilter !== "all" && (
                <p className="text-sm">
                  No bookings with status "{statusFilter.replace("_", " ")}".{" "}
                  <button 
                    className="text-primary hover:underline"
                    onClick={() => setStatusFilter("all")}
                    data-testid="button-show-all-bookings"
                  >
                    Show all bookings
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking Code</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings?.map((booking) => (
                    <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                      <TableCell className="font-mono font-medium">
                        {booking.bookingCode || booking.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={booking.property.title}>
                          {booking.property.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        {booking.guest.firstName} {booking.guest.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(Number(booking.totalPrice))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={STATUS_COLORS[booking.status] || ""}>
                            {booking.status.replace("_", " ")}
                          </Badge>
                          {booking.status === "cancelled" && booking.cancellationReason && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <div className="text-sm">
                                  <p className="font-medium mb-1">Cancellation Reason:</p>
                                  <p className="text-muted-foreground">{booking.cancellationReason}</p>
                                  {booking.cancelledBy && (
                                    <p className="text-xs mt-1 text-muted-foreground">
                                      By: {booking.cancelledBy}
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {booking.status === "no_show" && booking.noShowReason && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5">
                                  <Info className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[300px]">
                                <div className="text-sm">
                                  <p className="font-medium mb-1">No-Show Reason:</p>
                                  <p className="text-muted-foreground">{booking.noShowReason}</p>
                                  {booking.noShowMarkedBy && (
                                    <p className="text-xs mt-1 text-muted-foreground">
                                      By: {booking.noShowMarkedBy}
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {booking.status !== "cancelled" && booking.status !== "completed" && booking.status !== "no_show" && booking.status !== "checked_in" && booking.status !== "checked_out" && booking.status !== "rejected" && (
                            <Button
                              data-testid={`button-cancel-booking-${booking.id}`}
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setCancelDialogOpen(true);
                              }}
                              title="Cancel Booking"
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          {(booking.status === "confirmed" || booking.status === "customer_confirmed") && (
                            <>
                              <Button
                                data-testid={`button-no-show-${booking.id}`}
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setNoShowDialogOpen(true);
                                }}
                                title="Mark as No-Show"
                              >
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              </Button>
                              <Button
                                data-testid={`button-force-checkin-${booking.id}`}
                                variant="ghost"
                                size="icon"
                                onClick={() => forceCheckInMutation.mutate(booking.id)}
                                disabled={forceCheckInMutation.isPending}
                                title="Force Check-In"
                              >
                                <LogIn className="h-4 w-4 text-blue-500" />
                              </Button>
                            </>
                          )}
                          {booking.status === "checked_in" && (
                            <Button
                              data-testid={`button-force-checkout-${booking.id}`}
                              variant="ghost"
                              size="icon"
                              onClick={() => forceCheckOutMutation.mutate(booking.id)}
                              disabled={forceCheckOutMutation.isPending}
                              title="Force Check-Out"
                            >
                              <LogOut className="h-4 w-4 text-purple-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
          setCancelDialogOpen(open);
          if (!open) {
            setSelectedCancelReason("");
            setActionReason("");
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              This will cancel the booking and issue a full refund to the guest. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason-select">Reason for Cancellation (required)</Label>
              <Select
                value={selectedCancelReason}
                onValueChange={(value) => {
                  setSelectedCancelReason(value);
                  if (value !== "other") {
                    const reason = CANCELLATION_REASONS.find(r => r.value === value);
                    setActionReason(reason?.label || "");
                  } else {
                    setActionReason("");
                  }
                }}
              >
                <SelectTrigger id="cancel-reason-select" data-testid="select-cancel-reason">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCancelReason === "other" && (
              <div className="space-y-2">
                <Label htmlFor="cancel-reason-details">Please specify the reason</Label>
                <Textarea
                  id="cancel-reason-details"
                  data-testid="textarea-cancel-reason"
                  placeholder="Enter the specific reason for cancellation..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>
            )}
            {selectedCancelReason && selectedCancelReason !== "other" && (
              <div className="space-y-2">
                <Label htmlFor="cancel-reason-notes">Additional notes (optional)</Label>
                <Textarea
                  id="cancel-reason-notes"
                  data-testid="textarea-cancel-notes"
                  placeholder="Add any additional details..."
                  value={actionReason.replace(CANCELLATION_REASONS.find(r => r.value === selectedCancelReason)?.label || "", "").trim()}
                  onChange={(e) => {
                    const baseReason = CANCELLATION_REASONS.find(r => r.value === selectedCancelReason)?.label || "";
                    const notes = e.target.value.trim();
                    setActionReason(notes ? `${baseReason}: ${notes}` : baseReason);
                  }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-confirm-cancel"
              variant="destructive"
              onClick={() => {
                if (selectedBooking) {
                  cancelBookingMutation.mutate({
                    bookingId: selectedBooking.id,
                    reason: actionReason,
                  });
                }
              }}
              disabled={cancelBookingMutation.isPending || !actionReason.trim()}
            >
              {cancelBookingMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noShowDialogOpen} onOpenChange={setNoShowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as No-Show</DialogTitle>
            <DialogDescription>
              This will mark the booking as no-show. The guest will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="noshow-reason">Reason for No-Show</Label>
              <Textarea
                id="noshow-reason"
                data-testid="textarea-noshow-reason"
                placeholder="Enter the reason for marking as no-show..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoShowDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-confirm-noshow"
              variant="destructive"
              onClick={() => {
                if (selectedBooking && actionReason) {
                  markNoShowMutation.mutate({
                    bookingId: selectedBooking.id,
                    reason: actionReason,
                  });
                }
              }}
              disabled={markNoShowMutation.isPending || !actionReason}
            >
              {markNoShowMutation.isPending ? "Marking..." : "Confirm No-Show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
