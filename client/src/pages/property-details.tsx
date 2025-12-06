import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Heart, 
  MapPin, 
  Star, 
  Users, 
  Bed, 
  Bath,
  Check,
  MessageCircle,
  ThumbsUp,
  Wifi,
  Car,
  Wind,
  Tv,
  Utensils,
  Coffee,
  Waves,
  Dumbbell,
  Laptop,
  Baby,
  Flame,
  Building,
  Puzzle,
  Book,
  Shield,
  ArrowUp,
  Flower,
  Gamepad,
  Zap,
  Clock,
  UtensilsCrossed,
  Snowflake,
  CircleParking,
  Refrigerator,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Property, Amenity } from "@shared/schema";
import { insertReviewSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const reviewFormSchema = insertReviewSchema
  .pick({ rating: true, comment: true })
  .extend({
    rating: z.coerce.number().min(1, "Please select a rating").max(5),
    comment: z.string().min(10, "Review must be at least 10 characters"),
  });

const iconMap: Record<string, LucideIcon> = {
  Wifi,
  Car,
  Wind,
  Tv,
  Utensils,
  Coffee,
  Waves,
  Dumbbell,
  Laptop,
  Baby,
  Flame,
  Building,
  Puzzle,
  Book,
  Shield,
  ArrowUp,
  Flower,
  Gamepad,
  Zap,
  Clock,
  UtensilsCrossed,
  Snowflake,
  CircleParking,
  Refrigerator,
  Heart,
  Users,
  Bed,
  Bath,
  Check,
  Star,
};

function getAmenityIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Check;
  return iconMap[iconName] || Check;
}

const ownerResponseSchema = z.object({
  ownerResponse: z.string().min(10, "Response must be at least 10 characters"),
});

export default function PropertyDetails() {
  const [, params] = useRoute("/properties/:id");
  const [, setLocation] = useLocation();
  const propertyId = params?.id;
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [ownerResponseDialogOpen, setOwnerResponseDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [amenitiesDialogOpen, setAmenitiesDialogOpen] = useState(false);
  const getHelpfulStorageKey = () => user?.id ? `markedHelpfulReviews_${user.id}` : 'markedHelpfulReviews';
  
  const [markedHelpfulReviews, setMarkedHelpfulReviews] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const stored = localStorage.getItem(getHelpfulStorageKey());
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const stored = localStorage.getItem(getHelpfulStorageKey());
      if (stored) {
        setMarkedHelpfulReviews(new Set(JSON.parse(stored)));
      }
    }
  }, [user?.id]);

  const reviewForm = useForm<z.infer<typeof reviewFormSchema>>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 5,
      comment: "",
    },
  });

  const ownerResponseForm = useForm<z.infer<typeof ownerResponseSchema>>({
    resolver: zodResolver(ownerResponseSchema),
    defaultValues: {
      ownerResponse: "",
    },
  });

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", propertyId],
    enabled: !!propertyId,
  });

  const { data: reviews = [] } = useQuery<any[]>({
    queryKey: ["/api/properties", propertyId, "reviews"],
    enabled: !!propertyId,
  });

  const { data: userBookings = [] } = useQuery<any[]>({
    queryKey: ["/api/bookings"],
    enabled: user?.userRole === "guest",
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
      
      if (!response.ok) {
        console.error(`Failed to fetch booked dates: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`Error body: ${errorText}`);
        throw new Error(`Failed to fetch booked dates: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.map((d: any) => ({
        checkIn: new Date(d.checkIn),
        checkOut: new Date(d.checkOut),
      }));
    },
    enabled: !!propertyId,
    retry: 1,
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

  const contactOwnerMutation = useMutation({
    mutationFn: async () => {
      if (!propertyId) throw new Error("Property ID not found");
      return await apiRequest("POST", "/api/conversations", { propertyId });
    },
    onSuccess: (conversation: any) => {
      setLocation("/messages");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "Please log in to contact the owner",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  const availableBookingToReview = useMemo(() => {
    if (!user || user.userRole !== "guest" || !propertyId) return null;
    
    const completedBookings = userBookings
      .filter((booking: any) => 
        booking.propertyId === propertyId && 
        booking.status === "completed" &&
        new Date(booking.checkOut) < new Date()
      )
      .sort((a: any, b: any) => new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime());
    
    const reviewedBookingIds = new Set(
      reviews
        .filter((review: any) => review.guestId === user.id)
        .map((review: any) => review.bookingId)
    );
    
    return completedBookings.find((booking: any) => !reviewedBookingIds.has(booking.id)) || null;
  }, [user, userBookings, reviews, propertyId]);

  const canReview = !!availableBookingToReview;

  const submitReviewMutation = useMutation({
    mutationFn: async (data: { propertyId: string; bookingId: string; rating: number; comment: string }) => {
      return await apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
      setReviewDialogOpen(false);
      reviewForm.reset({ rating: 5, comment: "" });
      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const handleReviewSubmit = (formData: z.infer<typeof reviewFormSchema>) => {
    if (!propertyId) {
      toast({
        title: "Error",
        description: "Property ID not found",
        variant: "destructive",
      });
      return;
    }

    if (!availableBookingToReview) {
      toast({
        title: "Error",
        description: "No available booking to review. You may have already reviewed all your completed stays.",
        variant: "destructive",
      });
      return;
    }
    
    submitReviewMutation.mutate({
      propertyId,
      bookingId: availableBookingToReview.id,
      rating: formData.rating,
      comment: formData.comment,
    });
  };

  const ownerResponseMutation = useMutation({
    mutationFn: async ({ reviewId, data }: { reviewId: string; data: z.infer<typeof ownerResponseSchema> }) => {
      return await apiRequest("PATCH", `/api/reviews/${reviewId}/response`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "reviews"] });
      setOwnerResponseDialogOpen(false);
      ownerResponseForm.reset({ ownerResponse: "" });
      setSelectedReviewId(null);
      toast({
        title: "Response Added",
        description: "Your response has been posted",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add response",
        variant: "destructive",
      });
    },
  });

  const createOwnerResponseSubmitHandler = (reviewId: string) => {
    return (data: z.infer<typeof ownerResponseSchema>) => {
      ownerResponseMutation.mutate({ reviewId, data });
    };
  };

  const helpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      return await apiRequest("PATCH", `/api/reviews/${reviewId}/helpful`, {});
    },
    onSuccess: (_data, reviewId) => {
      setMarkedHelpfulReviews((prev) => {
        const updated = new Set(prev).add(reviewId);
        if (typeof window !== 'undefined') {
          localStorage.setItem(getHelpfulStorageKey(), JSON.stringify(Array.from(updated)));
        }
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "reviews"] });
      toast({
        title: "Marked as Helpful",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark as helpful",
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
              <h2 className="text-xl font-semibold mb-6">What this place offers</h2>
              {propertyAmenities.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                    {propertyAmenities.slice(0, 8).map((amenity) => {
                      const IconComponent = getAmenityIcon(amenity.icon);
                      return (
                        <div key={amenity.id} className="flex items-center gap-4 py-2" data-testid={`amenity-item-${amenity.id}`}>
                          <IconComponent className="h-6 w-6 text-foreground flex-shrink-0" />
                          <span className="text-foreground">{amenity.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  {propertyAmenities.length > 8 && (
                    <Dialog open={amenitiesDialogOpen} onOpenChange={setAmenitiesDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="mt-6"
                          data-testid="button-show-all-amenities"
                        >
                          Show all {propertyAmenities.length} amenities
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>What this place offers</DialogTitle>
                          <DialogDescription>
                            All amenities available at this property
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mt-4">
                          {propertyAmenities.map((amenity) => {
                            const IconComponent = getAmenityIcon(amenity.icon);
                            return (
                              <div key={amenity.id} className="flex items-center gap-4 py-2">
                                <IconComponent className="h-6 w-6 text-foreground flex-shrink-0" />
                                <span className="text-foreground">{amenity.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </>
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

            {/* Reviews Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    Reviews {reviews.length > 0 && `(${reviews.length})`}
                  </h2>
                  {property.rating && Number(property.rating) > 0 && (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-current text-yellow-500" />
                      <span className="text-lg font-semibold">{Number(property.rating).toFixed(1)}</span>
                      <span className="text-muted-foreground">• {property.reviewCount} reviews</span>
                    </div>
                  )}
                </div>
                
                {canReview && (
                  <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-write-review">Write a Review</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Write a Review</DialogTitle>
                        <DialogDescription>
                          Share your experience with other travelers
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...reviewForm}>
                        <form onSubmit={reviewForm.handleSubmit(handleReviewSubmit)} className="space-y-4">
                          <FormField
                            control={reviewForm.control}
                            name="rating"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rating</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    value={String(field.value ?? 5)}
                                    onValueChange={(value) => field.onChange(Number(value))}
                                    className="flex gap-1"
                                  >
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <div key={star} className="relative">
                                        <RadioGroupItem
                                          value={String(star)}
                                          id={`rating-${star}`}
                                          className="peer sr-only"
                                          data-testid={`button-rating-${star}`}
                                        />
                                        <label
                                          htmlFor={`rating-${star}`}
                                          className="cursor-pointer hover:scale-110 transition-transform"
                                        >
                                          <Star
                                            className={`h-8 w-8 transition-colors ${
                                              star <= Number(field.value ?? 5)
                                                ? "fill-yellow-500 text-yellow-500"
                                                : "text-muted-foreground hover:text-yellow-300"
                                            }`}
                                          />
                                        </label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={reviewForm.control}
                            name="comment"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Your Review</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Tell us about your stay..."
                                    rows={6}
                                    data-testid="textarea-review-comment"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setReviewDialogOpen(false)}
                              data-testid="button-cancel-review"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={submitReviewMutation.isPending}
                              data-testid="button-submit-review"
                            >
                              {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {reviews.length > 0 ? (
                <div className="space-y-6">
                  {reviews.map((review: any) => (
                    <Card key={review.id} data-testid={`card-review-${review.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar>
                            <AvatarImage src={review.guestProfileImageUrl} />
                            <AvatarFallback>
                              {review.guestFirstName?.[0]}{review.guestLastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <h4 className="font-semibold" data-testid={`text-reviewer-name-${review.id}`}>
                                  {review.guestFirstName} {review.guestLastName}
                                </h4>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= review.rating
                                        ? "fill-yellow-500 text-yellow-500"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            
                            <p className="text-muted-foreground leading-relaxed" data-testid={`text-review-comment-${review.id}`}>
                              {review.comment}
                            </p>

                            {review.ownerResponse && (
                              <div className="mt-4 pl-4 border-l-2 border-muted">
                                <p className="text-sm font-semibold mb-1">Response from owner</p>
                                <p className="text-sm text-muted-foreground" data-testid={`text-owner-response-${review.id}`}>
                                  {review.ownerResponse}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center gap-3 pt-2">
                              <Button
                                variant={markedHelpfulReviews.has(review.id) ? "default" : "ghost"}
                                size="sm"
                                onClick={() => helpfulMutation.mutate(review.id)}
                                disabled={helpfulMutation.isPending || markedHelpfulReviews.has(review.id)}
                                data-testid={`button-helpful-${review.id}`}
                              >
                                <ThumbsUp className={`h-4 w-4 mr-1 ${markedHelpfulReviews.has(review.id) ? "fill-current" : ""}`} />
                                {markedHelpfulReviews.has(review.id) ? "Marked Helpful" : "Helpful"} {review.helpful > 0 && `(${review.helpful})`}
                              </Button>

                              {user?.id === property.ownerId && !review.ownerResponse && (
                                <Dialog
                                  open={ownerResponseDialogOpen && selectedReviewId === review.id}
                                  onOpenChange={(open) => {
                                    setOwnerResponseDialogOpen(open);
                                    if (open) {
                                      setSelectedReviewId(review.id);
                                    } else {
                                      setSelectedReviewId(null);
                                      ownerResponseForm.reset();
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      data-testid={`button-respond-${review.id}`}
                                    >
                                      Respond
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[500px]">
                                    <DialogHeader>
                                      <DialogTitle>Respond to Review</DialogTitle>
                                      <DialogDescription>
                                        Share your response with {review.guestFirstName}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <Form {...ownerResponseForm}>
                                      <form onSubmit={ownerResponseForm.handleSubmit(createOwnerResponseSubmitHandler(review.id))} className="space-y-4">
                                        <FormField
                                          control={ownerResponseForm.control}
                                          name="ownerResponse"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <Textarea
                                                  {...field}
                                                  placeholder="Thank you for your feedback..."
                                                  rows={4}
                                                  data-testid="textarea-owner-response"
                                                />
                                              </FormControl>
                                              <FormMessage />
                                            </FormItem>
                                          )}
                                        />
                                        <div className="flex gap-2 justify-end">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                              setOwnerResponseDialogOpen(false);
                                              setSelectedReviewId(null);
                                              ownerResponseForm.reset();
                                            }}
                                            data-testid="button-cancel-response"
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            type="submit"
                                            disabled={ownerResponseMutation.isPending}
                                            data-testid="button-submit-response"
                                          >
                                            {ownerResponseMutation.isPending ? "Posting..." : "Post Response"}
                                          </Button>
                                        </div>
                                      </form>
                                    </Form>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No reviews yet. Be the first to review this property!</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Card */}
          <div className="md:sticky md:top-24 h-fit">
            <Card>
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-semibold" data-testid="text-price-detail">
                      ₹{Number(property.pricePerNight).toLocaleString('en-IN')}
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
                        ₹{Number(property.pricePerNight).toLocaleString('en-IN')} x {nights} {nights === 1 ? 'night' : 'nights'}
                      </span>
                      <span className="font-semibold">₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span>₹{totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                
                {user?.userRole === "guest" && (
                  <Button
                    className="w-full mt-3"
                    variant="outline"
                    size="lg"
                    onClick={() => contactOwnerMutation.mutate()}
                    disabled={contactOwnerMutation.isPending}
                    data-testid="button-contact-owner"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {contactOwnerMutation.isPending ? "Loading..." : "Contact Owner"}
                  </Button>
                )}
                
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
