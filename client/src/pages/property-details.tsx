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
  Phone,
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
  CalendarIcon,
  BadgeCheck,
  Handshake,
  Minus,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

// Helper to parse date string as local time (avoids timezone issues)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
import type { LucideIcon } from "lucide-react";
import { PropertyMap } from "@/components/PropertyMap";
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
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  
  // Controlled popover states for date pickers and guests with auto-navigation
  const [checkInPopoverOpen, setCheckInPopoverOpen] = useState(false);
  const [checkOutPopoverOpen, setCheckOutPopoverOpen] = useState(false);
  const [guestsPopoverOpen, setGuestsPopoverOpen] = useState(false);
  const [ownerResponseDialogOpen, setOwnerResponseDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [amenitiesDialogOpen, setAmenitiesDialogOpen] = useState(false);
  const getHelpfulStorageKey = () => user?.id ? `markedHelpfulReviews_${user.id}` : 'markedHelpfulReviews';
  
  // Sync guests from adults + children
  useEffect(() => {
    setGuests(adults + children);
  }, [adults, children]);
  
  // Read URL query params or localStorage to initialize booking form
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlCheckIn = searchParams.get("checkIn");
      const urlCheckOut = searchParams.get("checkOut");
      const urlAdults = searchParams.get("adults");
      const urlChildren = searchParams.get("children");
      const urlRooms = searchParams.get("rooms");
      
      // Load saved guest preferences from localStorage
      const savedPrefs = localStorage.getItem("guestPreferences");
      const savedGuestPrefs = savedPrefs ? JSON.parse(savedPrefs) : null;
      
      // URL params take priority, then localStorage, then defaults
      if (urlCheckIn) setCheckIn(urlCheckIn);
      if (urlCheckOut) setCheckOut(urlCheckOut);
      
      setAdults(urlAdults ? parseInt(urlAdults) : (savedGuestPrefs?.adults ?? 2));
      setChildren(urlChildren ? parseInt(urlChildren) : (savedGuestPrefs?.children ?? 0));
      setRooms(urlRooms ? parseInt(urlRooms) : (savedGuestPrefs?.rooms ?? 1));
    }
  }, []);
  
  // Save guest preferences to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("guestPreferences", JSON.stringify({ adults, children, rooms }));
    }
  }, [adults, children, rooms]);
  
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

  const { data: blockedDates = [] } = useQuery<{ startDate: Date; endDate: Date; type: string }[]>({
    queryKey: ["/api/properties", propertyId, "availability-overrides"],
    queryFn: async () => {
      if (!propertyId) return [];
      const response = await fetch(`/api/properties/${propertyId}/availability-overrides`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.map((d: any) => ({
        startDate: new Date(d.startDate),
        endDate: new Date(d.endDate),
        type: d.overrideType,
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

  const contactOwnerMutation = useMutation({
    mutationFn: async () => {
      if (!propertyId) throw new Error("Property ID not found");
      const response = await apiRequest("POST", "/api/conversations", { propertyId });
      return await response.json();
    },
    onSuccess: (conversation: any) => {
      setLocation(`/messages?conversationId=${conversation.id}`);
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
      if (guests < 1 || guests > maxAllowedGuests) {
        throw new Error(`Guests must be between 1 and ${maxAllowedGuests} for ${rooms} room${rooms > 1 ? 's' : ''}`);
      }
      
      const totalPrice = calculateTotalPrice();
      
      return apiRequest("POST", "/api/bookings", {
        propertyId,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        guests,
        rooms,
        totalPrice,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Booking Created",
        description: "Your booking request has been submitted successfully! Check your Messages or My Bookings in your profile to track the status.",
      });
      setCheckIn("");
      setCheckOut("");
      setGuests(2);
      setAdults(2);
      setChildren(0);
      setRooms(1);
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

  // Max guests per room - use property.maxGuests as the per-room capacity
  const maxGuestsPerRoom = property?.maxGuests || 2;
  
  // Calculate maximum allowed guests based on rooms selected
  const maxAllowedGuests = useMemo(() => {
    return rooms * maxGuestsPerRoom;
  }, [rooms, maxGuestsPerRoom]);
  
  const calculateTotalPrice = () => {
    if (!checkIn || !checkOut || !property) return 0;
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) return 0;
    
    // Calculate guests per room to determine occupancy type
    const guestsPerRoom = Math.ceil(guests / rooms);
    
    // Determine price based on occupancy type
    let pricePerNight = Number(property.pricePerNight);
    
    if (guestsPerRoom === 1 && property.singleOccupancyPrice) {
      pricePerNight = Number(property.singleOccupancyPrice);
    } else if (guestsPerRoom === 2 && property.doubleOccupancyPrice) {
      pricePerNight = Number(property.doubleOccupancyPrice);
    } else if (guestsPerRoom >= 3 && property.tripleOccupancyPrice) {
      pricePerNight = Number(property.tripleOccupancyPrice);
    }
    
    // Calculate base price
    let basePrice = nights * pricePerNight * rooms;
    
    // Apply bulk booking discount if applicable
    if (property.bulkBookingEnabled && 
        property.bulkBookingMinRooms && 
        rooms >= property.bulkBookingMinRooms && 
        property.bulkBookingDiscountPercent) {
      const discountPercent = Number(property.bulkBookingDiscountPercent);
      basePrice = basePrice * (1 - discountPercent / 100);
    }
    
    return Math.round(basePrice);
  };

  const totalPrice = useMemo(() => calculateTotalPrice(), [checkIn, checkOut, property, rooms, guests]);
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

  const blockedDateInfo = useMemo(() => {
    if (!checkIn || !checkOut || blockedDates.length === 0) return null;
    
    const selectedStart = new Date(checkIn);
    const selectedEnd = new Date(checkOut);
    selectedStart.setHours(0, 0, 0, 0);
    selectedEnd.setHours(0, 0, 0, 0);
    
    const overlappingBlock = blockedDates.find((blocked) => {
      const blockStart = new Date(blocked.startDate);
      const blockEnd = new Date(blocked.endDate);
      blockStart.setHours(0, 0, 0, 0);
      blockEnd.setHours(0, 0, 0, 0);
      
      return (selectedStart < blockEnd && selectedEnd > blockStart);
    });
    
    return overlappingBlock || null;
  }, [checkIn, checkOut, blockedDates]);

  const hasBlockedDateOverlap = blockedDateInfo !== null;

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
    
    // Owners can book other properties, just not their own
    if (property && property.ownerId === user.id) {
      toast({
        title: "Cannot Book Own Property",
        description: "You cannot book your own property",
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
          <h1 className="text-3xl font-semibold mb-2">Property not found</h1>
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
          <div className="flex flex-wrap items-center gap-2">
            {property.propertyCode && (
              <Badge variant="outline" className="font-mono text-xs" data-testid="property-code">
                {property.propertyCode}
              </Badge>
            )}
            <Badge>{property.propertyType}</Badge>
            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">
              <BadgeCheck className="h-3 w-3 mr-1" />
              100% Verified
            </Badge>
            <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0">
              <Clock className="h-3 w-3 mr-1" />
              24hr Check-in
            </Badge>
            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0">
              <Handshake className="h-3 w-3 mr-1" />
              Direct Negotiation
            </Badge>
          </div>
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

            {/* Location Map */}
            {property.latitude && property.longitude && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Where you'll be</h2>
                <p className="text-muted-foreground mb-4">{property.destination}</p>
                <div className="rounded-xl overflow-hidden border" data-testid="property-map-container">
                  <PropertyMap 
                    latitude={Number(property.latitude)} 
                    longitude={Number(property.longitude)}
                    title={property.title}
                  />
                </div>
              </div>
            )}

            {/* Things to Know */}
            {(property.policies || property.checkInTime || property.checkOutTime || 
              (property.safetyFeatures && property.safetyFeatures.length > 0) || 
              property.cancellationPolicy || property.maxGuests) && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Things to know</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* House Rules */}
                  <div>
                    <h3 className="font-semibold mb-3">House rules</h3>
                    <div className="space-y-2 text-muted-foreground">
                      {property.checkInTime && (
                        <p>Check-in after {property.checkInTime}</p>
                      )}
                      {property.checkOutTime && (
                        <p>Checkout before {property.checkOutTime}</p>
                      )}
                      <p>{property.maxGuests} guests maximum</p>
                      {property.policies && (
                        <p className="text-sm mt-2">{property.policies.length > 100 ? property.policies.substring(0, 100) + "..." : property.policies}</p>
                      )}
                    </div>
                  </div>

                  {/* Safety & Property */}
                  <div>
                    <h3 className="font-semibold mb-3">Safety & property</h3>
                    <div className="space-y-2 text-muted-foreground">
                      {property.safetyFeatures && property.safetyFeatures.length > 0 ? (
                        property.safetyFeatures.slice(0, 4).map((feature, idx) => (
                          <p key={idx}>{feature}</p>
                        ))
                      ) : (
                        <p className="text-sm">Contact host for safety information</p>
                      )}
                    </div>
                  </div>

                  {/* Cancellation Policy */}
                  <div>
                    <h3 className="font-semibold mb-3">Cancellation policy</h3>
                    <div className="space-y-2 text-muted-foreground">
                      {property.cancellationPolicy ? (
                        <p>{property.cancellationPolicy.length > 150 ? property.cancellationPolicy.substring(0, 150) + "..." : property.cancellationPolicy}</p>
                      ) : (
                        <p className="text-sm">Contact host for cancellation details</p>
                      )}
                    </div>
                  </div>
                </div>
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
                  {(property.singleOccupancyPrice || property.doubleOccupancyPrice || property.tripleOccupancyPrice) && (
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      {property.singleOccupancyPrice && (
                        <div>Single: ₹{Number(property.singleOccupancyPrice).toLocaleString('en-IN')}/night</div>
                      )}
                      {property.doubleOccupancyPrice && (
                        <div>Double: ₹{Number(property.doubleOccupancyPrice).toLocaleString('en-IN')}/night</div>
                      )}
                      {property.tripleOccupancyPrice && (
                        <div>Triple: ₹{Number(property.tripleOccupancyPrice).toLocaleString('en-IN')}/night</div>
                      )}
                    </div>
                  )}
                  {property.bulkBookingEnabled && property.bulkBookingMinRooms && property.bulkBookingDiscountPercent && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {Number(property.bulkBookingDiscountPercent)}% off on {property.bulkBookingMinRooms}+ rooms
                    </div>
                  )}
                  {property.rating && Number(property.rating) > 0 && (
                    <div className="flex items-center gap-1 text-sm mt-2">
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
                    <Popover open={checkInPopoverOpen} onOpenChange={setCheckInPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="input-checkin-booking"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkIn ? format(parseLocalDate(checkIn), "PPP") : <span className="text-muted-foreground">Select date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkIn ? parseLocalDate(checkIn) : undefined}
                          onSelect={(date) => {
                            // Use format() to preserve local timezone instead of toISOString() which shifts to UTC
                            const dateStr = date ? format(date, "yyyy-MM-dd") : "";
                            setCheckIn(dateStr);
                            if (checkOut && date && parseLocalDate(checkOut) <= date) {
                              setCheckOut("");
                            }
                            // Close check-in and auto-open check-out using requestAnimationFrame to prevent race condition
                            if (date) {
                              setCheckInPopoverOpen(false);
                              requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                  setCheckOutPopoverOpen(true);
                                });
                              });
                            }
                          }}
                          disabled={(date) => {
                            const today = new Date(new Date().setHours(0, 0, 0, 0));
                            if (date < today) return true;
                            const currentDate = new Date(date);
                            currentDate.setHours(0, 0, 0, 0);
                            
                            const isBooked = bookedDates.some((booked) => {
                              const bookedStart = new Date(booked.checkIn);
                              const bookedEnd = new Date(booked.checkOut);
                              bookedStart.setHours(0, 0, 0, 0);
                              bookedEnd.setHours(0, 0, 0, 0);
                              return currentDate >= bookedStart && currentDate < bookedEnd;
                            });
                            if (isBooked) return true;

                            const isBlocked = blockedDates.some((blocked) => {
                              const blockStart = new Date(blocked.startDate);
                              const blockEnd = new Date(blocked.endDate);
                              blockStart.setHours(0, 0, 0, 0);
                              blockEnd.setHours(0, 0, 0, 0);
                              return currentDate >= blockStart && currentDate < blockEnd;
                            });
                            return isBlocked;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Check-out</label>
                    <Popover open={checkOutPopoverOpen} onOpenChange={setCheckOutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="input-checkout-booking"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkOut ? format(parseLocalDate(checkOut), "PPP") : <span className="text-muted-foreground">Select date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOut ? parseLocalDate(checkOut) : undefined}
                          onSelect={(date) => {
                            // Use format() to preserve local timezone instead of toISOString() which shifts to UTC
                            setCheckOut(date ? format(date, "yyyy-MM-dd") : "");
                            if (date) {
                              setCheckOutPopoverOpen(false);
                            }
                          }}
                          disabled={(date) => {
                            const today = new Date(new Date().setHours(0, 0, 0, 0));
                            if (date <= today) return true;
                            if (checkIn && date <= parseLocalDate(checkIn)) return true;
                            const currentDate = new Date(date);
                            currentDate.setHours(0, 0, 0, 0);
                            
                            const isBooked = bookedDates.some((booked) => {
                              const bookedStart = new Date(booked.checkIn);
                              const bookedEnd = new Date(booked.checkOut);
                              bookedStart.setHours(0, 0, 0, 0);
                              bookedEnd.setHours(0, 0, 0, 0);
                              return currentDate >= bookedStart && currentDate < bookedEnd;
                            });
                            if (isBooked) return true;

                            const isBlocked = blockedDates.some((blocked) => {
                              const blockStart = new Date(blocked.startDate);
                              const blockEnd = new Date(blocked.endDate);
                              blockStart.setHours(0, 0, 0, 0);
                              blockEnd.setHours(0, 0, 0, 0);
                              return currentDate >= blockStart && currentDate < blockEnd;
                            });
                            return isBlocked;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-2">Guests</label>
                    <Popover open={guestsPopoverOpen} onOpenChange={setGuestsPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between text-left font-normal"
                          data-testid="input-guests-booking"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>
                              {adults} Adult{adults !== 1 ? 's' : ''}, {children} Child{children !== 1 ? 'ren' : ''}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-4" align="start">
                        <div className="space-y-4">
                          {/* Adults */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Adults</div>
                              <div className="text-xs text-muted-foreground">Ages 13 or above</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAdults(Math.max(1, adults - 1));
                                }}
                                disabled={adults <= 1}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                data-testid="button-adults-minus"
                              >
                                <Minus className="h-4 w-4 text-gray-600" />
                              </button>
                              <span className="w-6 text-center font-medium" data-testid="text-adults-count">{adults}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (adults + children < maxAllowedGuests) {
                                    setAdults(Math.min(maxAllowedGuests, adults + 1));
                                  }
                                }}
                                disabled={adults >= maxAllowedGuests || (adults + children) >= maxAllowedGuests}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                data-testid="button-adults-plus"
                              >
                                <Plus className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Children */}
                          <div className="flex items-center justify-between border-t pt-4">
                            <div>
                              <div className="font-medium">Children</div>
                              <div className="text-xs text-muted-foreground">Ages 2–12</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setChildren(Math.max(0, children - 1));
                                }}
                                disabled={children <= 0}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                data-testid="button-children-minus"
                              >
                                <Minus className="h-4 w-4 text-gray-600" />
                              </button>
                              <span className="w-6 text-center font-medium" data-testid="text-children-count">{children}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (adults + children < maxAllowedGuests) {
                                    setChildren(Math.min(maxAllowedGuests - adults, children + 1));
                                  }
                                }}
                                disabled={children >= (maxAllowedGuests - adults) || (adults + children) >= maxAllowedGuests}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                data-testid="button-children-plus"
                              >
                                <Plus className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Rooms */}
                          <div className="flex items-center justify-between border-t pt-4">
                            <div>
                              <div className="font-medium">Rooms</div>
                              <div className="text-xs text-muted-foreground">Number of rooms</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRooms(Math.max(1, rooms - 1));
                                }}
                                disabled={rooms <= 1}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                data-testid="button-rooms-minus"
                              >
                                <Minus className="h-4 w-4 text-gray-600" />
                              </button>
                              <span className="w-6 text-center font-medium" data-testid="text-rooms-count">{rooms}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setRooms(Math.min(5, rooms + 1));
                                }}
                                disabled={rooms >= 5}
                                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                data-testid="button-rooms-plus"
                              >
                                <Plus className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Max guests info */}
                          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                            Max {maxGuestsPerRoom} guests per room ({maxAllowedGuests} total for {rooms} room{rooms > 1 ? 's' : ''})
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {hasDateOverlap && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      Selected dates are not available. Please choose different dates.
                    </p>
                  </div>
                )}

                {hasBlockedDateOverlap && !hasDateOverlap && (
                  <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg" data-testid="blocked-dates-warning">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      {blockedDateInfo?.type === "hold" && "This property is temporarily not accepting bookings for these dates."}
                      {blockedDateInfo?.type === "sold_out" && "This property is fully booked for these dates."}
                      {blockedDateInfo?.type === "maintenance" && "This property is under maintenance during these dates."}
                    </p>
                    {blockedDateInfo?.type === "hold" && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        The owner has placed a temporary hold on bookings. Please select different dates or contact the owner.
                      </p>
                    )}
                  </div>
                )}

                {nights > 0 && totalPrice > 0 && !hasDateOverlap && !hasBlockedDateOverlap && (() => {
                  const guestsPerRoom = Math.ceil(guests / rooms);
                  let effectivePrice = Number(property.pricePerNight);
                  let occupancyLabel = "";
                  
                  if (guestsPerRoom === 1 && property.singleOccupancyPrice) {
                    effectivePrice = Number(property.singleOccupancyPrice);
                    occupancyLabel = "Single";
                  } else if (guestsPerRoom === 2 && property.doubleOccupancyPrice) {
                    effectivePrice = Number(property.doubleOccupancyPrice);
                    occupancyLabel = "Double";
                  } else if (guestsPerRoom >= 3 && property.tripleOccupancyPrice) {
                    effectivePrice = Number(property.tripleOccupancyPrice);
                    occupancyLabel = "Triple";
                  }
                  
                  const hasBulkDiscount = property.bulkBookingEnabled && 
                    property.bulkBookingMinRooms && 
                    rooms >= property.bulkBookingMinRooms && 
                    property.bulkBookingDiscountPercent;
                  
                  const discountPercent = hasBulkDiscount ? Number(property.bulkBookingDiscountPercent) : 0;
                  const subtotal = nights * effectivePrice * rooms;
                  
                  return (
                    <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          ₹{effectivePrice.toLocaleString('en-IN')} × {nights} {nights === 1 ? 'night' : 'nights'} × {rooms} {rooms === 1 ? 'room' : 'rooms'}
                        </span>
                        <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {guests} guest{guests !== 1 ? 's' : ''} ({adults} adult{adults !== 1 ? 's' : ''}, {children} child{children !== 1 ? 'ren' : ''})
                          {occupancyLabel && <span className="ml-1">• {occupancyLabel} occupancy</span>}
                        </span>
                      </div>
                      {hasBulkDiscount && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Bulk booking discount ({discountPercent}%)</span>
                          <span>-₹{Math.round(subtotal * discountPercent / 100).toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-semibold pt-2 border-t">
                        <span>Total</span>
                        <span data-testid="text-total-price">₹{totalPrice.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  );
                })()}

                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleBooking}
                  disabled={bookingMutation.isPending || !checkIn || !checkOut || hasDateOverlap || hasBlockedDateOverlap}
                  data-testid="button-reserve"
                >
                  {bookingMutation.isPending ? "Processing..." : "Reserve"}
                </Button>
                
                <div className="text-center mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground" data-testid="text-no-payment-now">
                    No payment required now
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Booking confirmation pending hotel approval
                  </p>
                </div>
                
                {property.status === "published" && (
                  <div className="flex flex-col gap-2 mt-3">
                    {(property as any).ownerContact?.phone && (
                      <Button
                        className="w-full"
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          if (!user) {
                            toast({
                              title: "Login Required",
                              description: "Please login to call the owner",
                              variant: "destructive",
                            });
                            setTimeout(() => {
                              window.location.href = "/api/login";
                            }, 500);
                            return;
                          }
                          window.location.href = `tel:${(property as any).ownerContact.phone}`;
                        }}
                        data-testid="button-call-owner"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Call Owner
                      </Button>
                    )}
                    <Button
                      className="w-full"
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        if (!user) {
                          toast({
                            title: "Login Required",
                            description: "Please login to chat with the owner",
                            variant: "destructive",
                          });
                          setTimeout(() => {
                            window.location.href = "/api/login";
                          }, 500);
                          return;
                        }
                        // Owners can chat with other owners, just not themselves
                        if (property && property.ownerId === user.id) {
                          toast({
                            title: "Cannot Chat With Yourself",
                            description: "You cannot start a conversation with yourself",
                            variant: "destructive",
                          });
                          return;
                        }
                        contactOwnerMutation.mutate();
                      }}
                      disabled={contactOwnerMutation.isPending}
                      data-testid="button-contact-owner"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {contactOwnerMutation.isPending ? "Loading..." : "Chat with Owner"}
                    </Button>
                  </div>
                )}
                
                              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
