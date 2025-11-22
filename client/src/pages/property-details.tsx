import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Heart, 
  MapPin, 
  Star, 
  Users, 
  Bed, 
  Bath,
  Check
} from "lucide-react";
import type { Property, Amenity } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", propertyId],
    enabled: !!propertyId,
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: user?.userRole === "guest",
  });

  const { data: propertyAmenities = [] } = useQuery<Amenity[]>({
    queryKey: ["/api/properties", propertyId, "/amenities"],
    enabled: !!propertyId,
  });

  const { data: bookedDates = [] } = useQuery<{ checkIn: Date; checkOut: Date }[]>({
    queryKey: ["/api/properties", propertyId, "/booked-dates"],
    queryFn: async () => {
      if (!propertyId) return [];
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      const response = await fetch(
        `/api/properties/${propertyId}/booked-dates?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.map((d: any) => ({
        checkIn: new Date(d.checkIn),
        checkOut: new Date(d.checkOut),
      }));
    },
    enabled: !!propertyId,
  });

  const isWishlisted = wishlists.some((w: any) => w.propertyId === propertyId);

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        const wishlist = wishlists.find((w: any) => w.propertyId === propertyId);
        await apiRequest("DELETE", `/api/wishlists/${wishlist.id}`, undefined);
      } else {
        await apiRequest("POST", "/api/wishlists", { propertyId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlists"] });
      toast({
        title: isWishlisted ? "Removed from wishlist" : "Added to wishlist",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update wishlist",
        variant: "destructive",
      });
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!checkIn || !checkOut) {
        throw new Error("Please select check-in and check-out dates");
      }
      if (guests < 1 || guests > (property?.maxGuests || 1)) {
        throw new Error(`Guests must be between 1 and ${property?.maxGuests || 1}`);
      }
      
      const totalPrice = calculateTotalPrice();
      
      return apiRequest("POST", "/api/bookings", {
        propertyId,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        guests,
        totalPrice,
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking Created",
        description: "Your booking request has been submitted successfully!",
      });
      setCheckIn("");
      setCheckOut("");
      setGuests(2);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create booking",
        variant: "destructive",
      });
    },
  });

  const calculateTotalPrice = () => {
    if (!checkIn || !checkOut || !property) return 0;
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) return 0;
    
    return nights * Number(property.pricePerNight);
  };

  const totalPrice = useMemo(() => calculateTotalPrice(), [checkIn, checkOut, property]);
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  const hasDateOverlap = useMemo(() => {
    if (!checkIn || !checkOut || bookedDates.length === 0) return false;
    
    const selectedStart = new Date(checkIn);
    const selectedEnd = new Date(checkOut);
    
    return bookedDates.some((booked) => {
      const bookedStart = new Date(booked.checkIn);
      const bookedEnd = new Date(booked.checkOut);
      
      return (selectedStart < bookedEnd && selectedEnd > bookedStart);
    });
  }, [checkIn, checkOut, bookedDates]);

  const handleBooking = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to book this property",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    if (user.userRole !== "guest") {
      toast({
        title: "Guest Account Required",
        description: "Only guests can book properties",
        variant: "destructive",
      });
      return;
    }
    
    bookingMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container px-4 md:px-6 py-6">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <Skeleton className="aspect-[2/1] rounded-lg mb-6" />
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Property not found</h1>
          <p className="text-muted-foreground">This property may have been removed</p>
        </div>
      </div>
    );
  }

  const mainImage = property.images?.[0] || "/placeholder-property.jpg";
  const additionalImages = property.images?.slice(1, 5) || [];

  return (
    <div className="min-h-screen pb-16">
      <div className="container px-4 md:px-6 py-6">
        {/* Title and Actions */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold mb-2" data-testid="text-property-title">
                {property.title}
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{property.destination}</span>
                </div>
                {property.rating && Number(property.rating) > 0 && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      <span className="font-semibold">{Number(property.rating).toFixed(1)}</span>
                      <span>({property.reviewCount} reviews)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {user?.userRole === "guest" && (
              <Button
                variant={isWishlisted ? "default" : "outline"}
                onClick={() => wishlistMutation.mutate()}
                disabled={wishlistMutation.isPending}
                data-testid="button-wishlist-toggle"
              >
                <Heart className={`h-4 w-4 mr-2 ${isWishlisted ? "fill-current" : ""}`} />
                {isWishlisted ? "Saved" : "Save"}
              </Button>
            )}
          </div>
          <Badge>{property.propertyType}</Badge>
        </div>

        {/* Image Gallery */}
        <div className="mb-8">
          {additionalImages.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden h-[500px]">
              <div className="col-span-4 md:col-span-2 md:row-span-2">
                <img
                  src={mainImage}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {additionalImages.map((img, idx) => (
                <div key={idx} className="col-span-2 md:col-span-1">
                  <img
                    src={img}
                    alt={`${property.title} ${idx + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="aspect-[2/1] rounded-xl overflow-hidden">
              <img
                src={mainImage}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Quick Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Property details</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Guests</p>
                      <p className="font-semibold">{property.maxGuests}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrooms</p>
                      <p className="font-semibold">{property.bedrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Beds</p>
                      <p className="font-semibold">{property.beds}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bathrooms</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold mb-4">About this property</h2>
              <p className="text-muted-foreground leading-relaxed">
                {property.description}
              </p>
            </div>

            {/* Amenities */}
            <div>
              <h2 className="text-xl font-semibold mb-4">What this place offers</h2>
              {propertyAmenities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {propertyAmenities.map((amenity) => (
                    <div key={amenity.id} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary" />
                      <span>{amenity.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  No amenities listed for this property
                </div>
              )}
            </div>

            {/* Policies */}
            {property.policies && (
              <div>
                <h2 className="text-xl font-semibold mb-4">House rules</h2>
                <p className="text-muted-foreground">{property.policies}</p>
              </div>
            )}
          </div>

          {/* Booking Card */}
          <div className="md:sticky md:top-24 h-fit">
            <Card>
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-semibold" data-testid="text-price-detail">
                      ${Number(property.pricePerNight).toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">/ night</span>
                  </div>
                  {property.rating && Number(property.rating) > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      <span className="font-semibold">{Number(property.rating).toFixed(1)}</span>
                      <span className="text-muted-foreground">
                        ({property.reviewCount} reviews)
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-semibold block mb-2">Check-in</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={(e) => setCheckIn(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border rounded-lg"
                      data-testid="input-checkin-booking"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Check-out</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      min={checkIn || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border rounded-lg"
                      data-testid="input-checkout-booking"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Guests</label>
                    <input
                      type="number"
                      min="1"
                      max={property.maxGuests}
                      value={guests}
                      onChange={(e) => setGuests(Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg"
                      data-testid="input-guests-booking"
                    />
                  </div>
                </div>

                {hasDateOverlap && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      Selected dates are not available. Please choose different dates.
                    </p>
                  </div>
                )}

                {nights > 0 && totalPrice > 0 && !hasDateOverlap && (
                  <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        ${Number(property.pricePerNight).toFixed(0)} x {nights} {nights === 1 ? 'night' : 'nights'}
                      </span>
                      <span className="font-semibold">${totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleBooking}
                  disabled={bookingMutation.isPending || !checkIn || !checkOut || hasDateOverlap}
                  data-testid="button-reserve"
                >
                  {bookingMutation.isPending ? "Processing..." : "Reserve"}
                </Button>
                
                <p className="text-sm text-center text-muted-foreground mt-4">
                  You won't be charged yet
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
