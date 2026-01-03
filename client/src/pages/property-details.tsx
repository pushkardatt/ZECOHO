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
  Info,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { NearbyPlaces } from "@/components/NearbyPlaces";
import { HowToReach } from "@/components/HowToReach";
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
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(null);
  const [selectedMealOptionId, setSelectedMealOptionId] = useState<string | null>(null);
  
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

  // Fetch room types for this property
  const { data: roomTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/properties", propertyId, "rooms"],
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

  // Fetch per-date calendar availability (total rooms vs available rooms)
  interface CalendarAvailability {
    date: string;
    totalRooms: number;
    availableRooms: number;
    status: 'available' | 'partial' | 'full';
    isBlocked: boolean;
  }
  
  const { data: calendarAvailability = [] } = useQuery<CalendarAvailability[]>({
    queryKey: ["/api/properties", propertyId, "calendar-availability"],
    queryFn: async () => {
      if (!propertyId) return [];
      
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      
      const response = await fetch(
        `/api/properties/${propertyId}/calendar-availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch calendar availability: ${response.status} ${response.statusText}`);
        return [];
      }
      
      return await response.json();
    },
    enabled: !!propertyId,
    retry: 1,
  });
  
  // Create a lookup map for fast date availability checks
  const availabilityByDate = useMemo(() => {
    const map = new Map<string, CalendarAvailability>();
    calendarAvailability.forEach((day) => {
      map.set(day.date, day);
    });
    return map;
  }, [calendarAvailability]);

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

  // Fetch real-time room inventory for selected dates
  const { data: roomInventory = [] } = useQuery<any[]>({
    queryKey: ["/api/properties", propertyId, "room-inventory", checkIn, checkOut],
    queryFn: async () => {
      if (!propertyId || !checkIn || !checkOut) return [];
      // checkIn/checkOut are stored as strings (YYYY-MM-DD format), convert to Date for API
      const checkInDate = parseLocalDate(checkIn);
      const checkOutDate = parseLocalDate(checkOut);
      if (!checkInDate || !checkOutDate) return [];
      const response = await fetch(
        `/api/properties/${propertyId}/room-inventory?startDate=${checkInDate.toISOString()}&endDate=${checkOutDate.toISOString()}`
      );
      if (!response.ok) return [];
      return await response.json();
    },
    enabled: !!propertyId && !!checkIn && !!checkOut,
    staleTime: 30000, // Cache for 30 seconds
  });
  
  // Get selected room type data for auto-calculation
  const selectedRoomType = useMemo(() => {
    if (!selectedRoomTypeId) return null;
    return roomTypes.find((rt: any) => rt.id === selectedRoomTypeId) || null;
  }, [selectedRoomTypeId, roomTypes]);
  
  // Get real-time inventory for selected room type
  const selectedRoomInventory = useMemo(() => {
    if (!selectedRoomTypeId || !roomInventory.length) return null;
    return roomInventory.find((ri: any) => ri.roomTypeId === selectedRoomTypeId) || null;
  }, [selectedRoomTypeId, roomInventory]);
  
  // Calculate required rooms based on both adult and child counts
  // Each room can hold up to 2 adults AND 2 children - whichever limit is hit first determines rooms needed
  const requiredRooms = useMemo(() => {
    const maxAdultsPerRoom = selectedRoomType?.maxGuests || property?.maxGuests || 2;
    const maxChildrenPerRoom = 2; // Fixed: 2 children max per room
    
    const roomsForAdults = Math.ceil(adults / maxAdultsPerRoom);
    const roomsForChildren = children > 0 ? Math.ceil(children / maxChildrenPerRoom) : 0;
    
    // Take the maximum - need enough rooms for both adults and children
    return Math.max(roomsForAdults, roomsForChildren, 1);
  }, [adults, children, selectedRoomType, property?.maxGuests]);
  
  // Get available rooms for selected room type (real-time if available, fallback to totalRooms)
  const availableRoomsForType = useMemo(() => {
    if (!selectedRoomType) return null;
    // Use real-time inventory if available
    if (selectedRoomInventory) {
      return selectedRoomInventory.availableRooms;
    }
    // Fallback to static totalRooms when no date range selected
    return selectedRoomType.totalRooms || 1;
  }, [selectedRoomType, selectedRoomInventory]);
  
  // Check if we have enough rooms available (use requiredRooms based on guest count)
  const hasInsufficientRooms = useMemo(() => {
    if (availableRoomsForType === null) return false;
    // Compare required rooms (based on guest count) against available rooms
    return requiredRooms > availableRoomsForType;
  }, [requiredRooms, availableRoomsForType]);
  
  // Low inventory warning - use API's isLowStock flag (calculated as: min(5, 20% of totalRooms))
  const isLowInventory = useMemo(() => {
    if (!selectedRoomInventory) return false;
    return selectedRoomInventory.isLowStock === true;
  }, [selectedRoomInventory]);
  
  // Auto-adjust rooms when guest count changes (both adults and children affect room count)
  useEffect(() => {
    if (adults > 0) {
      // Use room type's maxGuests if selected, otherwise fall back to property's maxGuests
      const maxAdultsPerRoom = selectedRoomType?.maxGuests || property?.maxGuests || 2;
      const maxChildrenPerRoom = 2; // Fixed: 2 children max per room
      
      const roomsForAdults = Math.ceil(adults / maxAdultsPerRoom);
      const roomsForChildren = children > 0 ? Math.ceil(children / maxChildrenPerRoom) : 0;
      const neededRooms = Math.max(roomsForAdults, roomsForChildren, 1);
      
      // Determine max available rooms - use real-time inventory when available, NEVER exceed it
      // Only fall back to totalRooms when no real-time data exists (no dates selected)
      const maxAvailable = selectedRoomType 
        ? (selectedRoomInventory 
            ? selectedRoomInventory.availableRooms // Use real-time inventory (could be 0)
            : selectedRoomType.totalRooms || 10)   // Fall back only when no dates selected
        : 10; // Default max when no room type selected
      
      // Only auto-adjust if needed rooms is different and within available limit
      // Clamp to available rooms to prevent overbooking - allow 0 if sold out
      if (neededRooms !== rooms && neededRooms >= 1) {
        const clampedRooms = Math.min(neededRooms, maxAvailable);
        // If maxAvailable is 0, set rooms to 0 to prevent overbooking
        setRooms(maxAvailable === 0 ? 0 : Math.max(1, clampedRooms));
      }
    }
  }, [adults, children, selectedRoomType, selectedRoomInventory, availableRoomsForType, property?.maxGuests]);
  
  // Clear room type selection if it becomes sold out - DON'T auto-clear, just prevent booking
  // This prevents UX confusion where user's selection keeps disappearing
  
  // Check if booking is possible - comprehensive check for all blocking conditions
  const isBookingDisabled = useMemo(() => {
    // No room type selected
    if (!selectedRoomTypeId) return false; // Let the other check handle this
    // If room type is selected but inventory shows sold out
    if (selectedRoomInventory?.isSoldOut) return true;
    // If available rooms is 0 for selected type
    if (availableRoomsForType === 0) return true;
    // If rooms is 0 (shouldn't happen normally but guard against it)
    if (rooms === 0) return true;
    // If requested rooms exceeds available
    if (hasInsufficientRooms) return true;
    return false;
  }, [selectedRoomTypeId, selectedRoomInventory, availableRoomsForType, rooms, hasInsufficientRooms]);

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
      if (!selectedRoomTypeId) {
        throw new Error("Please select a room type");
      }
      if (guests < 1) {
        throw new Error("At least 1 guest is required");
      }
      // Validate that required rooms don't exceed available capacity
      if (hasInsufficientRooms) {
        throw new Error(`Not enough rooms available for ${guests} guest${guests !== 1 ? 's' : ''}. Please reduce guest count or select different dates.`);
      }
      
      const totalPrice = calculateTotalPrice();
      
      const bookingData: any = {
        propertyId,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        guests,
        rooms,
        totalPrice,
      };
      
      if (selectedRoomTypeId) {
        bookingData.roomTypeId = selectedRoomTypeId;
      }
      if (selectedMealOptionId) {
        bookingData.roomOptionId = selectedMealOptionId;
      }
      
      return apiRequest("POST", "/api/bookings", bookingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Reset form state
      setCheckIn("");
      setCheckOut("");
      setGuests(2);
      setAdults(2);
      setChildren(0);
      setRooms(1);
      setSelectedRoomTypeId(null);
      setSelectedMealOptionId(null);
      
      // Redirect to My Bookings page immediately with success indicator
      setLocation("/my-bookings?new=true");
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
  
  // Set a reasonable absolute maximum for guests (not tied to current room selection)
  // This allows users to increase guests first, then rooms auto-adjust
  const absoluteMaxGuests = useMemo(() => {
    // Calculate based on max possible rooms (use selectedRoomType's totalRooms or property maxGuests * 10)
    if (selectedRoomType) {
      return (selectedRoomType.totalRooms || 10) * (selectedRoomType.maxGuests || 2);
    }
    // Default: allow up to 20 guests (reasonable max for most properties)
    return 20;
  }, [selectedRoomType]);
  
  // Calculate maximum allowed guests based on rooms selected (for display/validation)
  const maxAllowedGuests = useMemo(() => {
    return rooms * maxGuestsPerRoom;
  }, [rooms, maxGuestsPerRoom]);
  
  const calculateTotalPrice = () => {
    if (!checkIn || !checkOut || !property) return 0;
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) return 0;
    
    // Room type must be selected for pricing (room-level pricing only)
    if (!selectedRoomTypeId) {
      // Return 0 if no room type selected - pricing is now room-level only
      return 0;
    }
    
    let pricePerNight = 0;
    let mealOptionPrice = 0;
    
    const selectedRoomType = roomTypes.find((rt: any) => rt.id === selectedRoomTypeId);
    if (selectedRoomType) {
      pricePerNight = Number(selectedRoomType.basePrice);
      
      // Add meal option price if selected
      if (selectedMealOptionId && selectedRoomType.mealOptions) {
        const selectedMealOption = selectedRoomType.mealOptions.find((opt: any) => opt.id === selectedMealOptionId);
        if (selectedMealOption) {
          mealOptionPrice = Number(selectedMealOption.priceAdjustment);
        }
      }
    }
    
    if (pricePerNight <= 0) return 0;
    
    // Calculate base price: room rate (per room per night) + meal cost (per person per night)
    const roomCost = nights * pricePerNight * rooms;
    const mealCost = nights * mealOptionPrice * guests;
    let basePrice = roomCost + mealCost;
    
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

  const totalPrice = useMemo(() => calculateTotalPrice(), [checkIn, checkOut, property, rooms, guests, selectedRoomTypeId, selectedMealOptionId, roomTypes]);
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  // Check if any date in selected range has 0 available rooms
  const hasDateOverlap = useMemo(() => {
    if (!checkIn || !checkOut || calendarAvailability.length === 0) return false;
    
    const start = parseLocalDate(checkIn);
    const end = parseLocalDate(checkOut);
    const dateToCheck = new Date(start);
    
    while (dateToCheck < end) {
      const dateStr = format(dateToCheck, "yyyy-MM-dd");
      const availability = availabilityByDate.get(dateStr);
      // Only block if availableRooms === 0 (fully booked)
      if (availability && availability.availableRooms === 0) {
        return true;
      }
      dateToCheck.setDate(dateToCheck.getDate() + 1);
    }
    return false;
  }, [checkIn, checkOut, calendarAvailability, availabilityByDate]);

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

  // Check if any date in selected range has partial availability (some but not all rooms booked)
  const partialAvailabilityInfo = useMemo(() => {
    if (!checkIn || !checkOut || calendarAvailability.length === 0) return null;
    
    const start = parseLocalDate(checkIn);
    const end = parseLocalDate(checkOut);
    const dateToCheck = new Date(start);
    
    let hasPartialDates = false;
    let minAvailable = Infinity;
    
    while (dateToCheck < end) {
      const dateStr = format(dateToCheck, "yyyy-MM-dd");
      const availability = availabilityByDate.get(dateStr);
      if (availability && availability.status === 'partial') {
        hasPartialDates = true;
        if (availability.availableRooms < minAvailable) {
          minAvailable = availability.availableRooms;
        }
      }
      dateToCheck.setDate(dateToCheck.getDate() + 1);
    }
    
    if (!hasPartialDates) return null;
    return { minAvailable: minAvailable === Infinity ? 0 : minAvailable };
  }, [checkIn, checkOut, calendarAvailability, availabilityByDate]);

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
    
    // Room type must be selected for booking
    if (!selectedRoomTypeId) {
      toast({
        title: "Room Type Required",
        description: "Please select a room type before booking",
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
            <div>
              <h2 className="text-xl font-semibold mb-2">Where you'll be</h2>
              {property.latitude && property.longitude ? (
                <>
                  <div className="mb-4 space-y-1">
                    {(property.propStreetAddress || property.propLocality || property.propCity) && (
                      <p className="text-foreground" data-testid="text-property-address">
                        {[
                          property.propStreetAddress,
                          property.propLocality,
                          property.propCity,
                          property.propState,
                          property.propPincode
                        ].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <p className="text-muted-foreground" data-testid="text-property-destination">
                      {property.destination}
                    </p>
                  </div>
                  <div className="rounded-xl overflow-hidden border" data-testid="property-map-container">
                    <PropertyMap 
                      latitude={Number(property.latitude)} 
                      longitude={Number(property.longitude)}
                      title={property.title}
                    />
                  </div>
                </>
              ) : (
                <div className="p-6 bg-muted/50 rounded-lg border text-center" data-testid="location-unavailable">
                  <p className="text-muted-foreground">
                    Exact location will be provided after booking confirmation.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {property.destination}
                  </p>
                </div>
              )}
            </div>

            {/* How to Reach - Transport hubs with travel time estimates */}
            {property.latitude && property.longitude && (
              <HowToReach 
                propertyId={property.id}
                propertyName={property.title}
                latitude={Number(property.latitude)}
                longitude={Number(property.longitude)}
              />
            )}

            {/* Nearby Places - Localities, Landmarks, Things to Do */}
            {property.latitude && property.longitude && (
              <NearbyPlaces 
                propertyId={property.id}
                latitude={Number(property.latitude)}
                longitude={Number(property.longitude)}
              />
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
                  {roomTypes.length > 0 ? (
                    <>
                      {(() => {
                        const lowestPrice = Math.min(...roomTypes.map((rt: any) => Number(rt.basePrice)));
                        const roomWithLowestPrice = roomTypes.find((rt: any) => Number(rt.basePrice) === lowestPrice);
                        const hasDiscount = roomWithLowestPrice?.originalPrice && 
                          parseFloat(roomWithLowestPrice.originalPrice) > parseFloat(roomWithLowestPrice.basePrice);
                        
                        return (
                          <>
                            <div className="flex items-baseline gap-1 mb-2 flex-wrap">
                              {hasDiscount && (
                                <span className="text-xl text-muted-foreground line-through">
                                  ₹{Number(roomWithLowestPrice.originalPrice).toLocaleString('en-IN')}
                                </span>
                              )}
                              <span className={`text-3xl font-semibold ${hasDiscount ? 'text-green-600 dark:text-green-400' : ''}`} data-testid="text-price-detail">
                                ₹{lowestPrice.toLocaleString('en-IN')}
                              </span>
                              <span className="text-muted-foreground">/ night</span>
                            </div>
                            {hasDiscount && (
                              <Badge variant="secondary" className="text-xs mb-2">
                                {Math.round((1 - lowestPrice / Number(roomWithLowestPrice.originalPrice)) * 100)}% OFF
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground">Starting from</p>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No rooms available</p>
                      <p className="text-xs text-muted-foreground mt-1">Please check back later</p>
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
                            
                            // Check availability using the new calendar availability data
                            // Only disable if availableRooms === 0
                            const dateStr = format(date, "yyyy-MM-dd");
                            const availability = availabilityByDate.get(dateStr);
                            if (availability && availability.availableRooms === 0) {
                              return true;
                            }
                            
                            // Also check owner-blocked dates
                            const currentDate = new Date(date);
                            currentDate.setHours(0, 0, 0, 0);
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
                            
                            // Check availability using the new calendar availability data
                            // Only disable if availableRooms === 0
                            const dateStr = format(date, "yyyy-MM-dd");
                            const availability = availabilityByDate.get(dateStr);
                            if (availability && availability.availableRooms === 0) {
                              return true;
                            }
                            
                            // Also check owner-blocked dates
                            const currentDate = new Date(date);
                            currentDate.setHours(0, 0, 0, 0);
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
                                  if (adults + children < absoluteMaxGuests) {
                                    setAdults(adults + 1);
                                  }
                                }}
                                disabled={(adults + children) >= absoluteMaxGuests}
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
                                  if (adults + children < absoluteMaxGuests) {
                                    setChildren(children + 1);
                                  }
                                }}
                                disabled={(adults + children) >= absoluteMaxGuests}
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
                              <div className="text-xs text-muted-foreground">
                                {requiredRooms > 1 
                                  ? `Min ${requiredRooms} for ${guests} guests`
                                  : "Number of rooms"
                                }
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  // Cannot reduce below requiredRooms
                                  setRooms(Math.max(requiredRooms, rooms - 1));
                                }}
                                disabled={rooms <= requiredRooms}
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

                  {/* Room Type Selection */}
                  {roomTypes.length > 0 && (
                    <div>
                      <label className="text-sm font-semibold block mb-2">Select Room Type</label>
                      <div className="space-y-3">
                        {roomTypes.filter((rt: any) => rt.isActive).map((roomType: any) => {
                          // Get dynamic inventory for this room type from real-time API data
                          const inventory = roomInventory.find((ri: any) => ri.roomTypeId === roomType.id);
                          // Use dynamic availability when dates are selected, otherwise show total
                          const displayAvailable = (checkIn && checkOut && inventory) 
                            ? inventory.availableRooms 
                            : roomType.totalRooms;
                          const isSoldOut = inventory?.isSoldOut || false;
                          const isLowStockItem = inventory?.isLowStock || false;
                          
                          return (
                          <div
                            key={roomType.id}
                            className={`p-3 rounded-lg border transition-all ${
                              isSoldOut 
                                ? "border-border opacity-60 cursor-not-allowed bg-muted/50"
                                : selectedRoomTypeId === roomType.id
                                  ? "border-primary bg-primary/5 cursor-pointer"
                                  : "border-border hover-elevate cursor-pointer"
                            }`}
                            onClick={() => {
                              if (!isSoldOut) {
                                setSelectedRoomTypeId(roomType.id);
                                setSelectedMealOptionId(null);
                              }
                            }}
                            data-testid={`card-room-type-${roomType.id}`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{roomType.name}</h4>
                                  {selectedRoomTypeId === roomType.id && !isSoldOut && (
                                    <Badge variant="secondary" className="text-xs">Selected</Badge>
                                  )}
                                  {isSoldOut && (
                                    <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                                  )}
                                  {isLowStockItem && !isSoldOut && (
                                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Low Stock</Badge>
                                  )}
                                </div>
                                {roomType.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{roomType.description}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    Up to {roomType.maxGuests} guests
                                  </span>
                                  <span className={`flex items-center gap-1 ${isSoldOut ? 'text-destructive' : isLowStockItem ? 'text-amber-600' : ''}`}>
                                    <Bed className="h-3.5 w-3.5" />
                                    {isSoldOut 
                                      ? "Sold out for selected dates" 
                                      : `${displayAvailable} available${checkIn && checkOut ? ' for your dates' : ''}`}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                {roomType.originalPrice && parseFloat(roomType.originalPrice) > parseFloat(roomType.basePrice) && (
                                  <div className="text-sm text-muted-foreground line-through">
                                    ₹{Number(roomType.originalPrice).toLocaleString('en-IN')}
                                  </div>
                                )}
                                <div className={`font-semibold ${isSoldOut ? 'line-through text-muted-foreground' : roomType.originalPrice && parseFloat(roomType.originalPrice) > parseFloat(roomType.basePrice) ? 'text-green-600 dark:text-green-400' : ''}`}>
                                  ₹{Number(roomType.basePrice).toLocaleString('en-IN')}
                                </div>
                                <div className="text-xs text-muted-foreground">per night</div>
                                {roomType.originalPrice && parseFloat(roomType.originalPrice) > parseFloat(roomType.basePrice) && (
                                  <Badge variant="secondary" className="mt-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    {Math.round((1 - parseFloat(roomType.basePrice) / parseFloat(roomType.originalPrice)) * 100)}% OFF
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Meal Options for selected room type */}
                            {selectedRoomTypeId === roomType.id && roomType.mealOptions && roomType.mealOptions.length > 0 && (
                              <div className="mt-3 pt-3 border-t space-y-2">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-muted-foreground">Meal Options (per person per night)</p>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button size="icon" variant="ghost" className="h-5 w-5 p-0" data-testid="meal-pricing-info">
                                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 text-sm" align="start">
                                      <p className="font-medium mb-1">Per-Person Meal Pricing</p>
                                      <p className="text-muted-foreground text-xs">
                                        Meal charges are calculated per person per night. The total meal cost = meal price × number of guests × number of nights.
                                      </p>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="space-y-2">
                                  <div
                                    className={`p-2 rounded border cursor-pointer text-sm transition-all ${
                                      selectedMealOptionId === null
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover-elevate"
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMealOptionId(null);
                                    }}
                                    data-testid="option-no-meal"
                                  >
                                    <div className="flex justify-between items-center">
                                      <span>Room only (no meals)</span>
                                      <span className="text-muted-foreground">Included</span>
                                    </div>
                                  </div>
                                  {roomType.mealOptions.map((option: any) => (
                                    <div
                                      key={option.id}
                                      className={`p-2 rounded border cursor-pointer text-sm transition-all ${
                                        selectedMealOptionId === option.id
                                          ? "border-primary bg-primary/5"
                                          : "border-border hover-elevate"
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMealOptionId(option.id);
                                      }}
                                      data-testid={`option-meal-${option.id}`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <span className="font-medium">{option.name}</span>
                                          {option.description && (
                                            <p className="text-xs text-muted-foreground">{option.description}</p>
                                          )}
                                        </div>
                                        <span className="text-primary font-medium">
                                          +₹{Number(option.priceAdjustment).toLocaleString('en-IN')}/person
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Guest/Room calculation helper and warnings */}
                  {selectedRoomType && (
                    <div className="space-y-2">
                      {/* Helper text showing auto-calculated rooms */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid="room-calculation-helper">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <span className="font-medium">{guests} guest{guests !== 1 ? 's' : ''} · {rooms} room{rooms !== 1 ? 's' : ''}</span>
                          {requiredRooms !== rooms && (
                            <span className="ml-2 text-blue-600 dark:text-blue-300">
                              ({requiredRooms} room{requiredRooms !== 1 ? 's' : ''} needed for {adults} adult{adults !== 1 ? 's' : ''})
                            </span>
                          )}
                        </p>
                      </div>
                      
                      {/* Low inventory warning */}
                      {isLowInventory && !hasInsufficientRooms && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg" data-testid="low-inventory-warning">
                          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                            Only {availableRoomsForType} room{availableRoomsForType !== 1 ? 's' : ''} left for this room type!
                          </p>
                        </div>
                      )}
                      
                      {/* Insufficient rooms error */}
                      {hasInsufficientRooms && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg" data-testid="insufficient-rooms-error">
                          <p className="text-sm text-destructive font-medium">
                            Only {availableRoomsForType} room{availableRoomsForType !== 1 ? 's' : ''} available for selected dates.
                          </p>
                          <p className="text-xs text-destructive/80 mt-1">
                            Please reduce the number of guests or select a different room type.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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

                {/* Limited availability info label - shown when selected room type has low stock */}
                {selectedRoomTypeId && selectedRoomInventory?.isLowStock && !selectedRoomInventory?.isSoldOut && !hasDateOverlap && !hasBlockedDateOverlap && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg" data-testid="limited-availability-info">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      Limited availability for selected dates
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      Only {selectedRoomInventory.availableRooms} room{selectedRoomInventory.availableRooms !== 1 ? 's' : ''} available for this room type. Book now to secure your stay!
                    </p>
                  </div>
                )}

                {nights > 0 && totalPrice > 0 && !hasDateOverlap && !hasBlockedDateOverlap && selectedRoomTypeId && (() => {
                  const selectedRoomType = roomTypes.find((rt: any) => rt.id === selectedRoomTypeId);
                  if (!selectedRoomType) return null;
                  
                  const effectivePrice = Number(selectedRoomType.basePrice);
                  const roomTypeName = selectedRoomType.name;
                  let originalPrice: number | null = null;
                  let mealOptionName = "";
                  let mealOptionPrice = 0;
                  
                  // Check for original price (strikethrough)
                  if (selectedRoomType.originalPrice && parseFloat(selectedRoomType.originalPrice) > parseFloat(selectedRoomType.basePrice)) {
                    originalPrice = Number(selectedRoomType.originalPrice);
                  }
                  
                  if (selectedMealOptionId && selectedRoomType.mealOptions) {
                    const selectedMealOption = selectedRoomType.mealOptions.find((opt: any) => opt.id === selectedMealOptionId);
                    if (selectedMealOption) {
                      mealOptionName = selectedMealOption.name;
                      mealOptionPrice = Number(selectedMealOption.priceAdjustment);
                    }
                  }
                  
                  const hasBulkDiscount = property.bulkBookingEnabled && 
                    property.bulkBookingMinRooms && 
                    rooms >= property.bulkBookingMinRooms && 
                    property.bulkBookingDiscountPercent;
                  
                  const discountPercent = hasBulkDiscount ? Number(property.bulkBookingDiscountPercent) : 0;
                  const roomSubtotal = nights * effectivePrice * rooms;
                  const mealSubtotal = nights * mealOptionPrice * guests;
                  const subtotal = roomSubtotal + mealSubtotal;
                  
                  // Calculate savings from original price
                  const originalSubtotal = originalPrice ? nights * originalPrice * rooms : 0;
                  const priceSavings = originalPrice ? originalSubtotal - roomSubtotal : 0;
                  
                  return (
                    <div className="mb-6 p-4 bg-muted rounded-lg space-y-2">
                      {/* Room pricing with strikethrough if discount */}
                      {originalPrice && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground line-through">
                            <span className="font-medium">{roomTypeName}: </span>
                            ₹{originalPrice.toLocaleString('en-IN')} × {nights} {nights === 1 ? 'night' : 'nights'} × {rooms} {rooms === 1 ? 'room' : 'rooms'}
                          </span>
                          <span className="text-muted-foreground line-through">₹{originalSubtotal.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          <span className="font-medium">{roomTypeName}: </span>
                          <span className={originalPrice ? 'text-green-600 dark:text-green-400' : ''}>
                            ₹{effectivePrice.toLocaleString('en-IN')}
                          </span>
                          {' × '}{nights} {nights === 1 ? 'night' : 'nights'} × {rooms} {rooms === 1 ? 'room' : 'rooms'}
                        </span>
                        <span className="font-semibold">₹{roomSubtotal.toLocaleString('en-IN')}</span>
                      </div>
                      
                      {/* Discount savings line */}
                      {priceSavings > 0 && (
                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                          <span>Discount savings</span>
                          <span>-₹{priceSavings.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      
                      {/* Meal option pricing (per person) */}
                      {mealOptionPrice > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {mealOptionName}: ₹{mealOptionPrice.toLocaleString('en-IN')}/person × {guests} {guests === 1 ? 'guest' : 'guests'} × {nights} {nights === 1 ? 'night' : 'nights'}
                          </span>
                          <span className="font-semibold">₹{mealSubtotal.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {guests} guest{guests !== 1 ? 's' : ''} ({adults} adult{adults !== 1 ? 's' : ''}, {children} child{children !== 1 ? 'ren' : ''})
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
                  disabled={bookingMutation.isPending || !checkIn || !checkOut || !selectedRoomTypeId || hasDateOverlap || hasBlockedDateOverlap || isBookingDisabled}
                  data-testid="button-reserve"
                >
                  {bookingMutation.isPending ? "Processing..." : !selectedRoomTypeId ? "Select Room Type" : isBookingDisabled ? "Not Available" : "Reserve"}
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
