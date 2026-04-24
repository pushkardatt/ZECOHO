import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  MapPin,
  Star,
  ArrowLeft,
  Users,
  Moon,
  CheckCircle2,
  Shield,
  CreditCard,
  Clock,
  Home,
  BadgeCheck,
} from "lucide-react";
import {
  GuestDetailsForm,
  type GuestDetailsFormData,
} from "@/components/GuestDetailsForm";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePreLoginBooking } from "@/hooks/usePreLoginBooking";
import { Helmet } from "react-helmet-async";

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { saveBookingIntent } = usePreLoginBooking();

  const searchParams = new URLSearchParams(window.location.search);
  const propertyId = searchParams.get("propertyId") || "";
  const roomTypeId = searchParams.get("roomTypeId") || "";
  const mealOptionId = searchParams.get("mealOptionId") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const adults = parseInt(searchParams.get("adults") || "2");
  const children = parseInt(searchParams.get("children") || "0");
  const rooms = parseInt(searchParams.get("rooms") || "1");
  const guests = adults + children;

  const [guestDetailsValid, setGuestDetailsValid] = useState(false);
  const [guestDetailsData, setGuestDetailsData] =
    useState<GuestDetailsFormData | null>(null);

  const handleGuestDetailsChange = useCallback(
    (isValid: boolean, data: GuestDetailsFormData | null) => {
      setGuestDetailsValid(isValid);
      setGuestDetailsData(data);
    },
    [],
  );

  // Redirect to search if required params missing
  useEffect(() => {
    if (!propertyId || !roomTypeId || !checkIn || !checkOut) {
      setLocation("/search");
    }
  }, []);

  // Auth guard — save intent then redirect to login
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      saveBookingIntent({
        propertyId,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        adults,
        children,
        rooms,
        selectedRoomTypeId: roomTypeId || null,
        selectedMealOptionId: mealOptionId || null,
      });
      const returnUrl = `/checkout?${window.location.search.slice(1)}`;
      window.location.href = `/login?returnTo=${encodeURIComponent(returnUrl)}`;
    }
  }, [authLoading, isAuthenticated]);

  const { data: property, isLoading: propertyLoading } = useQuery<any>({
    queryKey: ["/api/properties", propertyId],
    enabled: !!propertyId,
  });

  const { data: roomTypes = [], isLoading: roomTypesLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/properties", propertyId, "rooms"],
    enabled: !!propertyId,
  });

  const selectedRoomType = roomTypes.find((rt: any) => rt.id === roomTypeId);
  const selectedMealOption = selectedRoomType?.mealOptions?.find(
    (opt: any) => opt.id === mealOptionId,
  );

  // Fetch price overrides for accurate nightly pricing
  type PriceOverrideEntry = { base?: number; double?: number; triple?: number };
  const { data: priceOverridesMap } = useQuery<
    Map<string, PriceOverrideEntry>
  >({
    queryKey: [
      "/api/properties",
      propertyId,
      "pricing-calendar",
      checkIn,
      checkOut,
      roomTypeId,
    ],
    queryFn: async () => {
      if (!propertyId || !checkIn || !checkOut || !roomTypeId)
        return new Map();
      const end = new Date(checkOut);
      end.setDate(end.getDate() - 1);
      const res = await fetch(
        `/api/properties/${propertyId}/pricing-calendar?startDate=${checkIn}&endDate=${end.toISOString().split("T")[0]}`,
      );
      if (!res.ok) return new Map();
      const data = await res.json();
      const rt = (data.roomTypes || []).find(
        (r: any) => r.roomTypeId === roomTypeId,
      );
      if (!rt?.overrides) return new Map();
      return new Map<string, PriceOverrideEntry>(
        Object.entries(rt.overrides) as [string, PriceOverrideEntry][],
      );
    },
    enabled: !!propertyId && !!checkIn && !!checkOut && !!roomTypeId,
  });

  const priceBreakdown = useMemo(() => {
    if (!checkIn || !checkOut || !selectedRoomType) return null;

    const start = parseLocalDate(checkIn);
    const end = parseLocalDate(checkOut);
    const nightCount = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (nightCount <= 0) return null;

    const adultsPerRoom = Math.ceil(adults / rooms);
    const singleBase = selectedRoomType.singleOccupancyPrice
      ? Number(selectedRoomType.singleOccupancyPrice)
      : Number(selectedRoomType.basePrice);

    let occupancyIncrement = 0;
    let occupancyLabel = "Single occupancy";
    if (adultsPerRoom >= 3 && selectedRoomType.tripleOccupancyPrice) {
      occupancyIncrement =
        Number(selectedRoomType.tripleOccupancyPrice) - singleBase;
      occupancyLabel = "Triple occupancy";
    } else if (adultsPerRoom >= 2 && selectedRoomType.doubleOccupancyPrice) {
      occupancyIncrement =
        Number(selectedRoomType.doubleOccupancyPrice) - singleBase;
      occupancyLabel = "Double occupancy";
    }

    let roomCost = 0;
    const cursor = new Date(start);
    while (cursor < end) {
      const dateKey = cursor.toISOString().split("T")[0];
      const ov = priceOverridesMap?.get(dateKey);
      let nightlyPrice: number;
      if (ov !== undefined) {
        if (adultsPerRoom >= 3 && ov.triple !== undefined) {
          nightlyPrice = ov.triple;
        } else if (adultsPerRoom >= 2 && ov.double !== undefined) {
          nightlyPrice = ov.double;
        } else if (ov.base !== undefined) {
          nightlyPrice = ov.base + occupancyIncrement;
        } else {
          nightlyPrice = singleBase + occupancyIncrement;
        }
      } else {
        nightlyPrice = singleBase + occupancyIncrement;
      }
      roomCost += nightlyPrice * rooms;
      cursor.setDate(cursor.getDate() + 1);
    }

    const perNightRate =
      rooms > 0 ? Math.round(roomCost / nightCount / rooms) : 0;
    const mealOptionPrice = selectedMealOption
      ? Number(selectedMealOption.priceAdjustment)
      : 0;
    const mealCost = nightCount * mealOptionPrice * guests;
    const total = Math.round(roomCost + mealCost);

    return {
      nightCount,
      rooms,
      adults,
      children,
      guests,
      occupancyLabel,
      perNightRate,
      roomCost: Math.round(roomCost),
      mealPlanName: selectedMealOption?.name ?? null,
      mealCost,
      total,
    };
  }, [
    checkIn,
    checkOut,
    selectedRoomType,
    adults,
    children,
    rooms,
    guests,
    priceOverridesMap,
    selectedMealOption,
  ]);

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!guestDetailsData)
        throw new Error("Please fill in traveller details");
      if (!priceBreakdown) throw new Error("Invalid booking parameters");

      const bookingData: any = {
        propertyId,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        guests,
        rooms,
        totalPrice: priceBreakdown.total,
        guestName: guestDetailsData.guestName,
        guestMobile: `+91${guestDetailsData.guestMobile}`,
        guestEmail: guestDetailsData.guestEmail,
        gstNumber: guestDetailsData.gstNumber || null,
        specialRequests: guestDetailsData.specialRequests || null,
        adults,
        childrenCount: children,
        roomTypeId,
      };
      if (mealOptionId) bookingData.roomOptionId = mealOptionId;

      const res = await apiRequest("POST", "/api/bookings", bookingData);
      return res.json();
    },
    onSuccess: (booking: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      setLocation(`/booking-confirmed/${booking.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking Failed",
        description:
          error.message || "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = authLoading || propertyLoading || roomTypesLoading;
  const canConfirm =
    guestDetailsValid && !bookingMutation.isPending && !!priceBreakdown;

  const mainImage = property?.images?.[0] || "/placeholder-property.jpg";
  const backUrl = `/properties/${propertyId}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}&rooms=${rooms}&roomType=${roomTypeId}${mealOptionId ? `&mealOption=${mealOptionId}` : ""}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <div className="bg-background border-b h-14" />
        <div className="container max-w-6xl px-4 md:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </div>
            <div className="lg:col-span-3 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Property not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Helmet>
        <title>Complete Booking — {property.title} | ZECOHO</title>
      </Helmet>

      {/* Step header */}
      <div className="bg-background border-b sticky top-0 z-40">
        <div className="container max-w-6xl px-4 md:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation(backUrl)}
            className="gap-1.5 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to property</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2 text-sm overflow-hidden">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold shrink-0">
                1
              </div>
              <span className="hidden sm:inline whitespace-nowrap">
                Select Room
              </span>
            </div>
            <div className="h-px w-6 bg-border shrink-0" />
            <div className="flex items-center gap-1.5 text-primary">
              <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shrink-0">
                2
              </div>
              <span className="hidden sm:inline font-medium whitespace-nowrap">
                Review &amp; Confirm
              </span>
            </div>
            <div className="h-px w-6 bg-border shrink-0" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <span className="hidden sm:inline whitespace-nowrap">
                Confirmed
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
          {/* ── Left: Booking Summary ── */}
          <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-20">
            {/* Property thumbnail + meta */}
            <Card className="overflow-hidden shadow-sm">
              <div className="relative h-40 sm:h-44">
                <img
                  src={mainImage}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h2 className="text-white font-semibold text-sm sm:text-base line-clamp-1">
                    {property.title}
                  </h2>
                  <div className="flex items-center gap-1 text-white/80 text-xs mt-0.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="line-clamp-1">{property.destination}</span>
                  </div>
                </div>
                {property.rating && Number(property.rating) > 0 && (
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/95 rounded px-1.5 py-0.5 text-xs font-bold shadow-sm">
                    <Star className="h-3 w-3 fill-current text-yellow-500" />
                    {Number(property.rating).toFixed(1)}
                  </div>
                )}
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Check-in / Check-out grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Check-in
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {checkIn
                        ? format(parseLocalDate(checkIn), "EEE, d MMM")
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {checkIn
                        ? format(parseLocalDate(checkIn), "yyyy")
                        : ""}
                    </p>
                    {property.checkInTime && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        from {property.checkInTime}
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      Check-out
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {checkOut
                        ? format(parseLocalDate(checkOut), "EEE, d MMM")
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {checkOut
                        ? format(parseLocalDate(checkOut), "yyyy")
                        : ""}
                    </p>
                    {property.checkOutTime && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        by {property.checkOutTime}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stay summary pills */}
                <div className="flex flex-wrap gap-2">
                  {priceBreakdown && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                      <Moon className="h-3 w-3" />
                      {priceBreakdown.nightCount}{" "}
                      {priceBreakdown.nightCount === 1 ? "Night" : "Nights"}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                    <Users className="h-3 w-3" />
                    {adults} Adult{adults !== 1 ? "s" : ""}
                    {children > 0
                      ? `, ${children} Child${children !== 1 ? "ren" : ""}`
                      : ""}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                    <Home className="h-3 w-3" />
                    {rooms} Room{rooms !== 1 ? "s" : ""}
                  </div>
                </div>

                {/* Selected room type */}
                {selectedRoomType && (
                  <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Selected Room
                    </p>
                    <p className="text-sm font-semibold mt-0.5">
                      {selectedRoomType.name}
                    </p>
                    {selectedMealOption && (
                      <p className="text-xs text-primary mt-0.5">
                        + {selectedMealOption.name}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price breakdown */}
            {priceBreakdown && (
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold text-sm">Price Breakdown</h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-muted-foreground leading-snug">
                        ₹{priceBreakdown.perNightRate.toLocaleString("en-IN")}{" "}
                        × {priceBreakdown.nightCount}N × {priceBreakdown.rooms}R
                        {priceBreakdown.occupancyLabel !== "Single occupancy" && (
                          <span className="text-xs block text-muted-foreground/70">
                            {priceBreakdown.occupancyLabel}
                          </span>
                        )}
                      </span>
                      <span className="font-medium whitespace-nowrap">
                        ₹{priceBreakdown.roomCost.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {priceBreakdown.mealCost > 0 &&
                      priceBreakdown.mealPlanName && (
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-muted-foreground leading-snug">
                            {priceBreakdown.mealPlanName}
                            <span className="text-xs block text-muted-foreground/70">
                              {priceBreakdown.guests} guests ×{" "}
                              {priceBreakdown.nightCount}N
                            </span>
                          </span>
                          <span className="font-medium whitespace-nowrap">
                            ₹{priceBreakdown.mealCost.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}

                    <div className="flex justify-between text-green-600 dark:text-green-400 text-sm">
                      <span>Platform Fee</span>
                      <span className="font-semibold">FREE</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span data-testid="checkout-total-price">
                      ₹{priceBreakdown.total.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CreditCard className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                      Pay at hotel · No advance required
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancellation policy */}
            {property.cancellationPolicyType && (
              <Card className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">
                      Cancellation Policy
                    </h3>
                  </div>
                  <Badge
                    variant={
                      property.cancellationPolicyType === "flexible"
                        ? "default"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {property.cancellationPolicyType}
                  </Badge>
                  {property.cancellationPolicyType === "flexible" && (
                    <p className="text-xs text-muted-foreground">
                      Free cancellation up to 24 hours before check-in
                    </p>
                  )}
                  {property.cancellationPolicyType === "moderate" && (
                    <p className="text-xs text-muted-foreground">
                      Free cancellation up to 5 days before check-in
                    </p>
                  )}
                  {property.cancellationPolicyType === "strict" && (
                    <p className="text-xs text-muted-foreground">
                      Non-refundable after booking is confirmed
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Right: Guest Details Form ── */}
          <div className="lg:col-span-3 space-y-5">
            <div>
              <h1 className="text-xl font-bold">Enter Traveller Details</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Details of the primary guest checking in
              </p>
            </div>

            <GuestDetailsForm
              user={user ?? null}
              adults={adults}
              children={children}
              onValidChange={handleGuestDetailsChange}
            />

            {/* Important info */}
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-2.5">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Important Information
                </h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {property.checkInTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Check-in from {property.checkInTime}</span>
                    </div>
                  )}
                  {property.checkOutTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Check-out by {property.checkOutTime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                    <span>
                      Zero commission — hotel keeps 100% of your payment
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                    <span>Show your booking code at hotel reception</span>
                  </div>
                  {property.localIdAllowed && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                      <span>Local ID accepted</span>
                    </div>
                  )}
                  {property.coupleFriendly && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                      <span>Couple friendly property</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Confirm button */}
            <div className="space-y-2 pb-6">
              <Button
                className="w-full"
                size="lg"
                onClick={() => bookingMutation.mutate()}
                disabled={!canConfirm}
                data-testid="button-confirm-booking"
              >
                {bookingMutation.isPending
                  ? "Processing..."
                  : "Confirm Booking"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No advance payment required · Pay directly at the hotel
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
