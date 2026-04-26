import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  ChevronLeft,
  ChevronRight,
  Info,
  X,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { NearbyPlaces } from "@/components/NearbyPlaces";
import { HowToReach } from "@/components/HowToReach";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

// Helper to parse date string as local time (avoids timezone issues)
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
};
import type { LucideIcon } from "lucide-react";
import { PropertyMap } from "@/components/PropertyMap";
import { MobileBookingBar } from "@/components/MobileBookingBar";
import { PropertyCard } from "@/components/PropertyCard";
import {
  RoomTypeSelect,
  RoomTypeCards,
  type RoomInventory,
} from "@/components/RoomTypeCard";
import {
  GuestDetailsForm,
  type GuestDetailsFormData,
} from "@/components/GuestDetailsForm";
import { BookingPriceSummary } from "@/components/BookingPriceSummary";
import { ProfileCompletionDialog } from "@/components/ProfileCompletionDialog";
import type { Property, Amenity } from "@shared/schema";
import { insertReviewSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { usePreLoginBooking } from "@/hooks/usePreLoginBooking";
import { Helmet } from "react-helmet-async";

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

export function PropertyDetailView({ propertyId }: { propertyId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { saveBookingIntent, getBookingIntent, clearBookingIntent } =
    usePreLoginBooking();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string | null>(
    null,
  );
  const [selectedMealOptionId, setSelectedMealOptionId] = useState<
    string | null
  >(null);
  const [bookingStep, setBookingStep] = useState<"select" | "details">(
    "select",
  );
  const [guestDetailsValid, setGuestDetailsValid] = useState(false);
  const [guestDetailsData, setGuestDetailsData] =
    useState<GuestDetailsFormData | null>(null);
  const travellerDetailsRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const amenitiesRef = useRef<HTMLDivElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const rulesRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const tabsBarRef = useRef<HTMLDivElement>(null);
  const galleryTouchStartX = useRef(0);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [pendingContactAction, setPendingContactAction] = useState<
    "chat" | "call" | null
  >(null);

  // Controlled popover states for date pickers and guests with auto-navigation
  const [checkInPopoverOpen, setCheckInPopoverOpen] = useState(false);
  const [checkOutPopoverOpen, setCheckOutPopoverOpen] = useState(false);
  const [guestsPopoverOpen, setGuestsPopoverOpen] = useState(false);
  const [ownerResponseDialogOpen, setOwnerResponseDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [amenitiesDialogOpen, setAmenitiesDialogOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const getHelpfulStorageKey = () =>
    user?.id ? `markedHelpfulReviews_${user.id}` : "markedHelpfulReviews";

  // Sync guests from adults + children
  useEffect(() => {
    setGuests(adults + children);
  }, [adults, children]);

  // Track property view impression (fire-and-forget, never blocks page)
  useEffect(() => {
    if (!propertyId) return;
    const source = document.referrer?.includes("/search") ? "search" : "direct";
    fetch("/api/analytics/property-view", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, source }),
    }).catch(() => {});
  }, [propertyId]);

  // Read URL query params or localStorage to initialize booking form
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const urlCheckIn = searchParams.get("checkIn");
      const urlCheckOut = searchParams.get("checkOut");
      const urlAdults = searchParams.get("adults");
      const urlChildren = searchParams.get("children");
      const urlRooms = searchParams.get("rooms");
      const urlRoomType = searchParams.get("roomType");
      const urlMealOption = searchParams.get("mealOption");

      // Load saved guest preferences from localStorage
      const savedPrefs = localStorage.getItem("guestPreferences");
      const savedGuestPrefs = savedPrefs ? JSON.parse(savedPrefs) : null;

      // Load saved dates from localStorage
      const savedDates = localStorage.getItem("searchDates");
      const savedDatePrefs = savedDates ? JSON.parse(savedDates) : null;

      // URL params take priority, then localStorage, then defaults
      // For dates: check if saved dates are still valid (check-in is today or future)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (urlCheckIn) {
        setCheckIn(urlCheckIn);
      } else if (savedDatePrefs?.checkIn) {
        const savedCheckIn = new Date(savedDatePrefs.checkIn);
        if (savedCheckIn >= today) {
          setCheckIn(savedDatePrefs.checkIn);
        }
      }

      if (urlCheckOut) {
        setCheckOut(urlCheckOut);
      } else if (savedDatePrefs?.checkOut) {
        const savedCheckOut = new Date(savedDatePrefs.checkOut);
        const currentCheckIn = urlCheckIn || savedDatePrefs?.checkIn;
        if (currentCheckIn && savedCheckOut > new Date(currentCheckIn)) {
          setCheckOut(savedDatePrefs.checkOut);
        }
      }

      setAdults(
        urlAdults ? parseInt(urlAdults) : (savedGuestPrefs?.adults ?? 2),
      );
      setChildren(
        urlChildren ? parseInt(urlChildren) : (savedGuestPrefs?.children ?? 0),
      );
      setRooms(urlRooms ? parseInt(urlRooms) : (savedGuestPrefs?.rooms ?? 1));

      if (urlRoomType) {
        setSelectedRoomTypeId(urlRoomType);
      }
      if (urlMealOption) {
        setSelectedMealOptionId(urlMealOption);
      }
    }
  }, []);

  // Restore pre-login booking intent when user logs in
  useEffect(() => {
    if (user && propertyId) {
      const savedIntent = getBookingIntent();
      if (savedIntent && savedIntent.propertyId === propertyId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (savedIntent.checkIn) {
          const savedCheckIn = new Date(savedIntent.checkIn);
          if (savedCheckIn >= today) {
            setCheckIn(savedIntent.checkIn);
          }
        }
        if (savedIntent.checkOut && savedIntent.checkIn) {
          const savedCheckOut = new Date(savedIntent.checkOut);
          if (savedCheckOut > new Date(savedIntent.checkIn)) {
            setCheckOut(savedIntent.checkOut);
          }
        }
        if (savedIntent.adults) setAdults(savedIntent.adults);
        if (savedIntent.children !== undefined)
          setChildren(savedIntent.children);
        if (savedIntent.rooms) setRooms(savedIntent.rooms);
        if (savedIntent.selectedRoomTypeId)
          setSelectedRoomTypeId(savedIntent.selectedRoomTypeId);
        if (savedIntent.selectedMealOptionId)
          setSelectedMealOptionId(savedIntent.selectedMealOptionId);

        clearBookingIntent();
      }
    }
  }, [user, propertyId, getBookingIntent, clearBookingIntent]);

  // Save guest preferences to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "guestPreferences",
        JSON.stringify({ adults, children, rooms }),
      );
    }
  }, [adults, children, rooms]);

  const [markedHelpfulReviews, setMarkedHelpfulReviews] = useState<Set<string>>(
    () => {
      if (typeof window !== "undefined" && user?.id) {
        const stored = localStorage.getItem(getHelpfulStorageKey());
        return stored ? new Set(JSON.parse(stored)) : new Set();
      }
      return new Set();
    },
  );

  useEffect(() => {
    if (typeof window !== "undefined" && user?.id) {
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

  const { data: platformSettings } = useQuery<{
    gstInclusive: boolean;
    platformFeePercent: string;
    advancePaymentPercent: string;
  }>({
    queryKey: ["/api/platform-settings"],
  });

  const { data: allProperties = [] } = useQuery<any[]>({
    queryKey: ["/api/properties"],
    staleTime: 5 * 60 * 1000,
  });

  const similarProperties = useMemo(() => {
    if (!property) return [];
    return allProperties
      .filter(
        (p) =>
          p.id !== property.id &&
          p.status === "published" &&
          p.destination === property.destination,
      )
      .slice(0, 3);
  }, [allProperties, property]);

  // Fetch per-date calendar availability (total rooms vs available rooms)
  interface CalendarAvailability {
    date: string;
    totalRooms: number;
    availableRooms: number;
    status: "available" | "partial" | "full";
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
        `/api/properties/${propertyId}/calendar-availability?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      );

      if (!response.ok) {
        console.error(
          `Failed to fetch calendar availability: ${response.status} ${response.statusText}`,
        );
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

  const { data: blockedDates = [] } = useQuery<
    { startDate: Date; endDate: Date; type: string }[]
  >({
    queryKey: ["/api/properties", propertyId, "availability-overrides"],
    queryFn: async () => {
      if (!propertyId) return [];
      const response = await fetch(
        `/api/properties/${propertyId}/availability-overrides`,
      );
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

  // Fetch price overrides for selected date range + room type (for accurate display)
  type PriceOverrideEntry = { base?: number; double?: number; triple?: number };
  const { data: priceOverridesMap } = useQuery<Map<string, PriceOverrideEntry>>({
    queryKey: [
      "/api/properties",
      propertyId,
      "pricing-calendar",
      checkIn,
      checkOut,
      selectedRoomTypeId,
    ],
    queryFn: async () => {
      if (!propertyId || !checkIn || !checkOut || !selectedRoomTypeId)
        return new Map();
      const end = new Date(checkOut);
      end.setDate(end.getDate() - 1);
      const res = await fetch(
        `/api/properties/${propertyId}/pricing-calendar?startDate=${checkIn}&endDate=${end.toISOString().split("T")[0]}`,
      );
      if (!res.ok) return new Map();
      const data = await res.json();
      const rt = (data.roomTypes || []).find(
        (r: any) => r.roomTypeId === selectedRoomTypeId,
      );
      if (!rt?.overrides) return new Map();
      return new Map<string, PriceOverrideEntry>(
        Object.entries(rt.overrides) as [string, PriceOverrideEntry][],
      );
    },
    enabled: !!propertyId && !!checkIn && !!checkOut && !!selectedRoomTypeId,
  });

  // Fetch real-time room inventory for selected dates
  const { data: roomInventory = [] } = useQuery<any[]>({
    queryKey: [
      "/api/properties",
      propertyId,
      "room-inventory",
      checkIn,
      checkOut,
    ],
    queryFn: async () => {
      if (!propertyId || !checkIn || !checkOut) return [];
      // checkIn/checkOut are stored as strings (YYYY-MM-DD format), convert to Date for API
      const checkInDate = parseLocalDate(checkIn);
      const checkOutDate = parseLocalDate(checkOut);
      if (!checkInDate || !checkOutDate) return [];
      const response = await fetch(
        `/api/properties/${propertyId}/room-inventory?startDate=${checkInDate.toISOString()}&endDate=${checkOutDate.toISOString()}`,
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
    return (
      roomInventory.find((ri: any) => ri.roomTypeId === selectedRoomTypeId) ||
      null
    );
  }, [selectedRoomTypeId, roomInventory]);

  // Calculate required rooms based on both adult and child counts
  // Each room can hold up to 2 adults AND 2 children - whichever limit is hit first determines rooms needed
  const requiredRooms = useMemo(() => {
    const maxAdultsPerRoom =
      selectedRoomType?.maxGuests || property?.maxGuests || 2;
    const maxChildrenPerRoom = 2; // Fixed: 2 children max per room

    const roomsForAdults = Math.ceil(adults / maxAdultsPerRoom);
    const roomsForChildren =
      children > 0 ? Math.ceil(children / maxChildrenPerRoom) : 0;

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

  // Total available rooms across all room types — used for low-inventory badge in sidebar
  const totalAvailableRooms = useMemo(() => {
    if (!roomInventory.length || !checkIn || !checkOut) return null;
    return roomInventory.reduce(
      (sum: number, ri: any) => sum + (ri.isSoldOut ? 0 : (ri.availableRooms ?? 0)),
      0,
    );
  }, [roomInventory, checkIn, checkOut]);

  // Auto-adjust rooms when guest count changes (both adults and children affect room count)
  useEffect(() => {
    if (adults > 0) {
      // Use room type's maxGuests if selected, otherwise fall back to property's maxGuests
      const maxAdultsPerRoom =
        selectedRoomType?.maxGuests || property?.maxGuests || 2;
      const maxChildrenPerRoom = 2; // Fixed: 2 children max per room

      const roomsForAdults = Math.ceil(adults / maxAdultsPerRoom);
      const roomsForChildren =
        children > 0 ? Math.ceil(children / maxChildrenPerRoom) : 0;
      const neededRooms = Math.max(roomsForAdults, roomsForChildren, 1);

      // Determine max available rooms - use real-time inventory when available, NEVER exceed it
      // Only fall back to totalRooms when no real-time data exists (no dates selected)
      const maxAvailable = selectedRoomType
        ? selectedRoomInventory
          ? selectedRoomInventory.availableRooms // Use real-time inventory (could be 0)
          : selectedRoomType.totalRooms || 10 // Fall back only when no dates selected
        : 10; // Default max when no room type selected

      // Only auto-adjust if needed rooms is different and within available limit
      // Clamp to available rooms to prevent overbooking - allow 0 if sold out
      if (neededRooms !== rooms && neededRooms >= 1) {
        const clampedRooms = Math.min(neededRooms, maxAvailable);
        // If maxAvailable is 0, set rooms to 0 to prevent overbooking
        setRooms(maxAvailable === 0 ? 0 : Math.max(1, clampedRooms));
      }
    }
  }, [
    adults,
    children,
    selectedRoomType,
    selectedRoomInventory,
    availableRoomsForType,
    property?.maxGuests,
  ]);

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
  }, [
    selectedRoomTypeId,
    selectedRoomInventory,
    availableRoomsForType,
    rooms,
    hasInsufficientRooms,
  ]);

  const isWishlisted = wishlists.some((w: any) => w.propertyId === propertyId);

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (isWishlisted) {
        const wishlist = wishlists.find(
          (w: any) => w.propertyId === propertyId,
        );
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
          window.location.href = "/login";
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
      const response = await apiRequest("POST", "/api/conversations", {
        propertyId,
      });
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
          window.location.href = "/login";
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
      .filter(
        (booking: any) =>
          booking.propertyId === propertyId &&
          booking.status === "completed" &&
          new Date(booking.checkOut) < new Date(),
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.checkOut).getTime() - new Date(a.checkOut).getTime(),
      );

    const reviewedBookingIds = new Set(
      reviews
        .filter((review: any) => review.guestId === user.id)
        .map((review: any) => review.bookingId),
    );

    return (
      completedBookings.find(
        (booking: any) => !reviewedBookingIds.has(booking.id),
      ) || null
    );
  }, [user, userBookings, reviews, propertyId]);

  const canReview = !!availableBookingToReview;

  const submitReviewMutation = useMutation({
    mutationFn: async (data: {
      propertyId: string;
      bookingId: string;
      rating: number;
      comment: string;
    }) => {
      return await apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "reviews"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId],
      });
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
        description:
          "No available booking to review. You may have already reviewed all your completed stays.",
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
    mutationFn: async ({
      reviewId,
      data,
    }: {
      reviewId: string;
      data: z.infer<typeof ownerResponseSchema>;
    }) => {
      return await apiRequest(
        "PATCH",
        `/api/reviews/${reviewId}/response`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "reviews"],
      });
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
        if (typeof window !== "undefined") {
          localStorage.setItem(
            getHelpfulStorageKey(),
            JSON.stringify(Array.from(updated)),
          );
        }
        return updated;
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "reviews"],
      });
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

  const handleGuestDetailsChange = useCallback(
    (isValid: boolean, data: GuestDetailsFormData | null) => {
      setGuestDetailsValid(isValid);
      setGuestDetailsData(data);
    },
    [],
  );

  // On desktop: scroll to the traveller details form when Reserve is clicked
  useEffect(() => {
    if (bookingStep === "details" && travellerDetailsRef.current) {
      setTimeout(() => {
        travellerDetailsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [bookingStep]);

  // Gallery keyboard navigation + body scroll lock
  const goGalleryNext = useCallback(() => {
    setGalleryIndex((i) => {
      const len = property?.images?.length;
      return len && len > 1 ? (i + 1) % len : 0;
    });
  }, [property?.images?.length]);

  const goGalleryPrev = useCallback(() => {
    setGalleryIndex((i) => {
      const len = property?.images?.length;
      return len && len > 1 ? (i - 1 + len) % len : 0;
    });
  }, [property?.images?.length]);

  useEffect(() => {
    if (!galleryOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGalleryOpen(false);
      else if (e.key === "ArrowRight") goGalleryNext();
      else if (e.key === "ArrowLeft") goGalleryPrev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [galleryOpen, goGalleryNext, goGalleryPrev]);

  useEffect(() => {
    if (!galleryOpen) return;
    const onTouchStart = (e: TouchEvent) => {
      galleryTouchStartX.current = e.touches[0].clientX;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const delta = e.changedTouches[0].clientX - galleryTouchStartX.current;
      if (Math.abs(delta) > 50) delta < 0 ? goGalleryNext() : goGalleryPrev();
    };
    document.addEventListener("touchstart", onTouchStart);
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [galleryOpen, goGalleryNext, goGalleryPrev]);

  const scrollToSection = (ref: { current: HTMLDivElement | null }, tab: string) => {
    setActiveTab(tab);
    const tabsBarHeight = tabsBarRef.current?.offsetHeight ?? 48;
    const top = (ref.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 64 - tabsBarHeight;
    window.scrollTo({ top, behavior: "smooth" });
  };

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
      if (!guestDetailsData) {
        throw new Error("Please fill in traveller details");
      }
      if (hasInsufficientRooms) {
        throw new Error(
          `Not enough rooms available for ${guests} guest${guests !== 1 ? "s" : ""}. Please reduce guest count or select different dates.`,
        );
      }

      const totalPrice = calculateTotalPrice();

      const bookingData: any = {
        propertyId,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        guests,
        rooms,
        totalPrice,
        guestName: guestDetailsData.guestName,
        guestMobile: `+91${guestDetailsData.guestMobile}`,
        guestEmail: guestDetailsData.guestEmail,
        gstNumber: guestDetailsData.gstNumber || null,
        specialRequests: guestDetailsData.specialRequests || null,
        adults,
        childrenCount: children,
      };

      if (selectedRoomTypeId) {
        bookingData.roomTypeId = selectedRoomTypeId;
      }
      if (selectedMealOptionId) {
        bookingData.roomOptionId = selectedMealOptionId;
      }

      const res = await apiRequest("POST", "/api/bookings", bookingData);
      return res.json();
    },
    onSuccess: (booking: any) => {
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
      setBookingStep("select");
      setGuestDetailsValid(false);
      setGuestDetailsData(null);

      // Redirect to booking confirmation page
      setLocation(`/booking-confirmed/${booking.id}`);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
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
      return (
        (selectedRoomType.totalRooms || 10) * (selectedRoomType.maxGuests || 2)
      );
    }
    // Default: allow up to 20 guests (reasonable max for most properties)
    return 20;
  }, [selectedRoomType]);

  // Calculate maximum allowed guests based on rooms selected (for display/validation)
  const maxAllowedGuests = useMemo(() => {
    return rooms * maxGuestsPerRoom;
  }, [rooms, maxGuestsPerRoom]);

  // ← ADD THE NEW FUNCTION HERE (paste starts here)
  const getPriceBreakdownComponents = () => {
    if (!checkIn || !checkOut || !selectedRoomTypeId) return null;

    const rt = roomTypes.find((rt: any) => rt.id === selectedRoomTypeId);
    if (!rt) return null;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nightCount = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (nightCount <= 0) return null;

    const adultsPerRoom = Math.ceil(adults / rooms);

    const singleBase = rt.singleOccupancyPrice
      ? Number(rt.singleOccupancyPrice)
      : Number(rt.basePrice);

    let occupancyIncrement = 0;
    let occupancyLabel = "";
    if (adultsPerRoom >= 3 && rt.tripleOccupancyPrice) {
      occupancyIncrement = Number(rt.tripleOccupancyPrice) - singleBase;
      occupancyLabel = "Triple occupancy";
    } else if (adultsPerRoom >= 2 && rt.doubleOccupancyPrice) {
      occupancyIncrement = Number(rt.doubleOccupancyPrice) - singleBase;
      occupancyLabel = "Double occupancy";
    } else {
      occupancyLabel = "Single occupancy";
    }

    // Compute per-night effective base (single-rate) for the breakdown average.
    // Tier-specific day overrides: if a day has a double/triple override,
    // back-calculate what the single base would be so the occupancyAdjustment
    // shown in the breakdown remains consistent.
    let totalBaseRoomCost = 0;
    const cursor = new Date(start);
    while (cursor < end) {
      const dateKey = cursor.toISOString().split("T")[0];
      const ov = priceOverridesMap?.get(dateKey);
      let base: number;
      if (ov !== undefined) {
        if (adultsPerRoom >= 3 && ov.triple !== undefined) {
          // Back out occupancy increment so the breakdown shows base + adj
          base = ov.triple - occupancyIncrement;
        } else if (adultsPerRoom >= 2 && ov.double !== undefined) {
          base = ov.double - occupancyIncrement;
        } else {
          base = ov.base !== undefined ? ov.base : singleBase;
        }
      } else {
        base = singleBase;
      }
      totalBaseRoomCost += base;
      cursor.setDate(cursor.getDate() + 1);
    }
    const avgNightlyBase = totalBaseRoomCost / nightCount;

    let mealOptionName = "";
    let mealOptionPrice = 0;
    if (selectedMealOptionId && rt.mealOptions) {
      const sel = rt.mealOptions.find(
        (opt: any) => opt.id === selectedMealOptionId,
      );
      if (sel) {
        mealOptionName = sel.name;
        mealOptionPrice = Number(sel.priceAdjustment);
      }
    }

    let originalPrice: number | null = null;
    if (
      rt.originalPrice &&
      parseFloat(rt.originalPrice) > parseFloat(rt.basePrice)
    ) {
      originalPrice = Number(rt.originalPrice);
    }

    return {
      roomTypeName: rt.name,
      basePrice: avgNightlyBase,
      occupancyAdjustment: occupancyIncrement,
      occupancyLabel,
      mealOptionName,
      mealOptionPrice,
      nights: nightCount,
      rooms,
      guests,
      adults,
      children,
      originalPrice,
      bulkDiscountPercent: 0,
    };
  };
  // ← PASTE ENDS HERE

  // ↓ THIS LINE WAS ALREADY THERE — do not touch it
  const calculateTotalPrice = () => {
    if (!checkIn || !checkOut || !property) return 0;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (nights <= 0 || !selectedRoomTypeId) return 0;

    const rt = roomTypes.find((rt: any) => rt.id === selectedRoomTypeId);
    if (!rt) return 0;

    const adultsPerRoom = Math.ceil(adults / rooms);

    // Occupancy increment above single/base rate (same logic as backend)
    const singleBase = rt.singleOccupancyPrice
      ? Number(rt.singleOccupancyPrice)
      : Number(rt.basePrice);
    let occupancyIncrement = 0;
    if (adultsPerRoom >= 3 && rt.tripleOccupancyPrice) {
      occupancyIncrement = Number(rt.tripleOccupancyPrice) - singleBase;
    } else if (adultsPerRoom >= 2 && rt.doubleOccupancyPrice) {
      occupancyIncrement = Number(rt.doubleOccupancyPrice) - singleBase;
    } else {
      // Legacy adjustments
      const singleOccupancyBase = rt.singleOccupancyBase || 1;
      const guestsOverBase = adultsPerRoom - singleOccupancyBase;
      if (guestsOverBase >= 2 && rt.tripleOccupancyAdjustment) {
        occupancyIncrement = Number(rt.tripleOccupancyAdjustment);
      } else if (guestsOverBase >= 1 && rt.doubleOccupancyAdjustment) {
        occupancyIncrement = Number(rt.doubleOccupancyAdjustment);
      }
    }

    // Sum nightly room costs: mirror backend resolveOccupancyPrice logic
    // (tier-specific day overrides take precedence; otherwise base+increment)
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

    if (roomCost <= 0) return 0;

    let mealOptionPrice = 0;
    if (selectedMealOptionId && rt.mealOptions) {
      const selectedMealOption = rt.mealOptions.find(
        (opt: any) => opt.id === selectedMealOptionId,
      );
      if (selectedMealOption)
        mealOptionPrice = Number(selectedMealOption.priceAdjustment);
    }

    const mealCost = nights * mealOptionPrice * guests;
    return Math.round(roomCost + mealCost);
  };

  const totalPrice = useMemo(
    () => calculateTotalPrice(),
    [
      checkIn,
      checkOut,
      property,
      rooms,
      guests,
      adults,
      selectedRoomTypeId,
      selectedMealOptionId,
      roomTypes,
      priceOverridesMap,
    ],
  );
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  // Check if any date in selected range has 0 available rooms
  const hasDateOverlap = useMemo(() => {
    if (!checkIn || !checkOut || calendarAvailability.length === 0)
      return false;

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

      return selectedStart < blockEnd && selectedEnd > blockStart;
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
      if (availability && availability.status === "partial") {
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
      if (propertyId) {
        saveBookingIntent({
          propertyId,
          propertyTitle: property?.title,
          checkIn: checkIn || undefined,
          checkOut: checkOut || undefined,
          adults,
          children,
          rooms,
          selectedRoomTypeId,
          selectedMealOptionId,
        });
      }
      toast({
        title: "Login Required",
        description:
          "Please login to book this property. Your booking details will be saved.",
        variant: "destructive",
      });
      setTimeout(() => {
        const returnUrl = encodeURIComponent(`/properties/${propertyId}`);
        window.location.href = `/login?returnTo=${encodeURIComponent(returnUrl)}`;
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

    if (!checkIn || !checkOut) {
      toast({
        title: "Dates Required",
        description: "Please select check-in and check-out dates",
        variant: "destructive",
      });
      return;
    }

    // Navigate to the dedicated checkout page (MMT-style)
    const params = new URLSearchParams({
      propertyId: propertyId || "",
      roomTypeId: selectedRoomTypeId,
      checkIn,
      checkOut,
      adults: adults.toString(),
      children: children.toString(),
      rooms: rooms.toString(),
    });
    if (selectedMealOptionId) params.set("mealOptionId", selectedMealOptionId);
    setLocation(`/checkout?${params.toString()}`);
  };

  // Get minimum price from room types for mobile booking bar (moved before early returns)
  const minPrice = useMemo(() => {
    if (roomTypes.length > 0) {
      const prices = roomTypes.map((rt: any) => Number(rt.basePrice));
      return Math.min(...prices);
    }
    return Number(property?.pricePerNight) || 0;
  }, [roomTypes, property?.pricePerNight]);

  // Prepare booked dates for calendar (moved before early returns)
  const bookedDatesForCalendar = useMemo(() => {
    if (!calendarAvailability.length) return [];
    return calendarAvailability
      .filter((day) => day.availableRooms === 0)
      .map((day) => parseLocalDate(day.date));
  }, [calendarAvailability]);

  // Prepare blocked dates for calendar (moved before early returns)
  const blockedDatesForCalendar = useMemo(() => {
    if (!blockedDates.length) return [];
    const dates: Date[] = [];
    blockedDates.forEach((range) => {
      const current = new Date(range.startDate);
      while (current <= range.endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    });
    return dates;
  }, [blockedDates]);

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
          <p className="text-muted-foreground">
            This property may have been removed
          </p>
        </div>
      </div>
    );
  }

  const mainImage = property.images?.[0] || "/placeholder-property.jpg";
  const sideImages = property.images?.slice(1, 3) ?? [];
  const allImages = (property.images?.length ?? 0) > 0 ? property.images! : [mainImage];

  return (
    <>
      <div className="min-h-screen pb-24 md:pb-16">
        <Helmet>
          <title>
            {property.title}, {property.propCity || property.destination} - Book Direct at Best Price | ZECOHO
          </title>
          <meta
            name="description"
            content={
              property.description
                ? property.description.slice(0, 155)
                : `Book ${property.title} directly on ZECOHO. No commission, no hidden fees.`
            }
          />
          <meta
            property="og:title"
            content={`${property.title}, ${property.propCity || property.destination} | ZECOHO`}
          />
          <meta
            property="og:description"
            content={
              property.description
                ? property.description.slice(0, 155)
                : `Book ${property.title} directly on ZECOHO.`
            }
          />
          <link
            rel="canonical"
            href={`https://www.zecoho.com/properties/${property.id}`}
          />
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Hotel",
              name: property.title,
              description: property.description,
              address: {
                "@type": "PostalAddress",
                streetAddress: property.propStreetAddress || undefined,
                addressLocality: property.propCity || property.destination,
                addressRegion: property.propState || undefined,
                postalCode: property.propPincode || undefined,
                addressCountry: "IN",
              },
              ...((property as any).starRating
                ? { starRating: { "@type": "Rating", ratingValue: (property as any).starRating } }
                : {}),
              ...(minPrice ? { priceRange: `₹${minPrice}+` } : {}),
              amenityFeature: propertyAmenities.map((a) => ({
                "@type": "LocationFeatureSpecification",
                name: a.name,
                value: true,
              })),
              url: `https://www.zecoho.com/properties/${property.id}`,
            })}
          </script>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.zecoho.com/" },
                { "@type": "ListItem", position: 2, name: "Search", item: "https://www.zecoho.com/search" },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: property.propCity || property.destination,
                  item: `https://www.zecoho.com/search?city=${encodeURIComponent(property.propCity || property.destination || "")}`,
                },
                {
                  "@type": "ListItem",
                  position: 4,
                  name: property.title,
                  item: `https://www.zecoho.com/properties/${property.id}`,
                },
              ],
            })}
          </script>
        </Helmet>
        <div className="container px-4 md:px-6 py-6">
          {/* Title and Actions */}
          <div className="mb-6">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h1
                  className="text-3xl font-semibold mb-2"
                  data-testid="text-property-title"
                >
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
                        <span className="font-semibold">
                          {Number(property.rating).toFixed(1)}
                        </span>
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
                  <Heart
                    className={`h-4 w-4 mr-2 ${isWishlisted ? "fill-current" : ""}`}
                  />
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
              <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0">
                <Handshake className="h-3 w-3 mr-1" />
                Direct Negotiation
              </Badge>
              <Badge
                className="text-white border-0"
                style={{ backgroundColor: "#1D9E75" }}
                data-testid="badge-zero-commission-top"
              >
                0% Commission
              </Badge>
            </div>
          </div>

          {/* Image Gallery — 1 large + 2 stacked side images (MMT style) */}
          <div className="mb-6">
            {sideImages.length > 0 ? (
              <div
                className="relative rounded-xl overflow-hidden flex gap-2"
                style={{ height: "420px" }}
              >
                {/* Main image */}
                <div
                  className="flex-[2] overflow-hidden cursor-pointer"
                  onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}
                  data-testid="button-image-main"
                >
                  <img
                    src={mainImage}
                    alt={property.title}
                    className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                {/* Side images */}
                <div className="flex-1 flex flex-col gap-2">
                  {sideImages[0] && (
                    <div
                      className="flex-1 overflow-hidden cursor-pointer rounded-tr-xl"
                      onClick={() => { setGalleryIndex(1); setGalleryOpen(true); }}
                      data-testid="button-image-1"
                    >
                      <img
                        src={sideImages[0]}
                        alt={`${property.title} 2`}
                        className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  )}
                  {sideImages[1] && (
                    <div
                      className="flex-1 overflow-hidden cursor-pointer rounded-br-xl"
                      onClick={() => { setGalleryIndex(2); setGalleryOpen(true); }}
                      data-testid="button-image-2"
                    >
                      <img
                        src={sideImages[1]}
                        alt={`${property.title} 3`}
                        className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  )}
                </div>
                {/* View all photos */}
                {allImages.length > 1 && (
                  <button
                    className="absolute bottom-4 right-4 bg-white/95 text-foreground rounded-lg px-3 py-2 text-sm font-medium shadow-md flex items-center gap-2 hover:bg-white transition-colors border border-border/50"
                    onClick={(e) => { e.stopPropagation(); setGalleryIndex(0); setGalleryOpen(true); }}
                    data-testid="button-view-all-photos"
                  >
                    <span className="text-base leading-none">⊞</span>
                    View all {allImages.length} photos
                  </button>
                )}
              </div>
            ) : (
              /* Single image or placeholder */
              <div
                className="relative rounded-xl overflow-hidden cursor-pointer group"
                style={{ height: "420px" }}
                onClick={() => { setGalleryIndex(0); setGalleryOpen(true); }}
                data-testid="button-image-single"
              >
                <img
                  src={mainImage}
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                />
                {allImages.length > 1 && (
                  <button
                    className="absolute bottom-4 right-4 bg-white/95 text-foreground rounded-lg px-3 py-2 text-sm font-medium shadow-md flex items-center gap-2 hover:bg-white transition-colors border border-border/50"
                    onClick={(e) => { e.stopPropagation(); setGalleryIndex(0); setGalleryOpen(true); }}
                    data-testid="button-view-all-photos-single"
                  >
                    <span className="text-base leading-none">⊞</span>
                    View all {allImages.length} photos
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div
            ref={tabsBarRef}
            className="sticky top-16 z-20 bg-background border-b mb-8 -mx-4 md:-mx-6 px-4 md:px-6"
          >
            <nav
              className="flex overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
              aria-label="Property sections"
            >
              {(
                [
                  { id: "overview", label: "Overview", ref: overviewRef },
                  { id: "rooms", label: "Rooms", ref: roomsRef },
                  { id: "amenities", label: "Amenities", ref: amenitiesRef },
                  { id: "location", label: "Location", ref: locationRef },
                  { id: "rules", label: "Rules", ref: rulesRef },
                  { id: "reviews", label: "Reviews", ref: reviewsRef },
                ] as { id: string; label: string; ref: { current: HTMLDivElement | null } }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => scrollToSection(tab.ref, tab.id)}
                  className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                  }`}
                  aria-current={activeTab === tab.id ? "true" : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-8">
              {/* Quick Info */}
              <div ref={overviewRef} className="scroll-mt-36">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Property details
                  </h2>
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
                        <p className="text-sm text-muted-foreground">
                          Bedrooms
                        </p>
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
                        <p className="text-sm text-muted-foreground">
                          Bathrooms
                        </p>
                        <p className="font-semibold">{property.bathrooms}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  About this property
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {property.description}
                </p>
              </div>

              {/* Rooms */}
              <div ref={roomsRef} className="scroll-mt-36">
                <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>
                {roomTypes.length > 0 ? (
                  <RoomTypeCards
                    roomTypes={roomTypes.filter((rt: any) => rt.isActive !== false)}
                    propertyImages={property?.images || []}
                    selectedRoomTypeId={selectedRoomTypeId}
                    selectedMealOptionId={selectedMealOptionId}
                    onRoomTypeSelect={(id) => {
                      setSelectedRoomTypeId(id);
                      setSelectedMealOptionId(null);
                    }}
                    onMealOptionSelect={setSelectedMealOptionId}
                    inventoryMap={Object.fromEntries(
                      roomInventory.map((ri: any) => [
                        ri.roomTypeId,
                        {
                          roomTypeId: ri.roomTypeId,
                          availableRooms: ri.availableRooms,
                          isSoldOut: ri.isSoldOut || false,
                          isLowStock: ri.isLowStock || false,
                        },
                      ]),
                    )}
                    showDatesContext={!!(checkIn && checkOut)}
                    adults={adults}
                    guests={guests}
                    nights={nights}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No room types have been configured for this property.
                  </p>
                )}
              </div>

              {/* Amenities */}
              <div ref={amenitiesRef} className="scroll-mt-36">
                <h2 className="text-xl font-semibold mb-6">
                  What this place offers
                </h2>
                {propertyAmenities.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      {propertyAmenities.slice(0, 8).map((amenity) => {
                        const IconComponent = getAmenityIcon(amenity.icon);
                        return (
                          <div
                            key={amenity.id}
                            className="flex items-center gap-4 py-2"
                            data-testid={`amenity-item-${amenity.id}`}
                          >
                            <IconComponent className="h-6 w-6 text-foreground flex-shrink-0" />
                            <span className="text-foreground">
                              {amenity.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {propertyAmenities.length > 8 && (
                      <Dialog
                        open={amenitiesDialogOpen}
                        onOpenChange={setAmenitiesDialogOpen}
                      >
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
                              const IconComponent = getAmenityIcon(
                                amenity.icon,
                              );
                              return (
                                <div
                                  key={amenity.id}
                                  className="flex items-center gap-4 py-2"
                                >
                                  <IconComponent className="h-6 w-6 text-foreground flex-shrink-0" />
                                  <span className="text-foreground">
                                    {amenity.name}
                                  </span>
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
              <div ref={locationRef} className="scroll-mt-36">
                <h2 className="text-xl font-semibold mb-2">Where you'll be</h2>
                {property.latitude && property.longitude ? (
                  <>
                    <div className="mb-4 space-y-1">
                      {(property.propStreetAddress ||
                        property.propLocality ||
                        property.propCity) && (
                        <p
                          className="text-foreground"
                          data-testid="text-property-address"
                        >
                          {[
                            property.propStreetAddress,
                            property.propLocality,
                            property.propCity,
                            property.propState,
                            property.propPincode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      <p
                        className="text-muted-foreground"
                        data-testid="text-property-destination"
                      >
                        {property.destination}
                      </p>
                    </div>
                    <div
                      className="rounded-xl overflow-hidden border"
                      data-testid="property-map-container"
                    >
                      <PropertyMap
                        latitude={Number(property.latitude)}
                        longitude={Number(property.longitude)}
                        title={property.title}
                      />
                    </div>
                  </>
                ) : (
                  <div
                    className="p-6 bg-muted/50 rounded-lg border text-center"
                    data-testid="location-unavailable"
                  >
                    <p className="text-muted-foreground">
                      Exact location will be provided after booking
                      confirmation.
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
              {(property.policies ||
                property.checkInTime ||
                property.checkOutTime ||
                (property.safetyFeatures &&
                  property.safetyFeatures.length > 0) ||
                property.cancellationPolicy ||
                property.maxGuests) && (
                <div ref={rulesRef} className="scroll-mt-36">
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
                          <p className="text-sm mt-2">
                            {property.policies.length > 100
                              ? property.policies.substring(0, 100) + "..."
                              : property.policies}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Safety & Property */}
                    <div>
                      <h3 className="font-semibold mb-3">Safety & property</h3>
                      <div className="space-y-2 text-muted-foreground">
                        {property.safetyFeatures &&
                        property.safetyFeatures.length > 0 ? (
                          property.safetyFeatures
                            .slice(0, 4)
                            .map((feature, idx) => <p key={idx}>{feature}</p>)
                        ) : (
                          <p className="text-sm">
                            Contact host for safety information
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div>
                      <h3 className="font-semibold mb-3">
                        Cancellation policy
                      </h3>
                      <div className="space-y-2 text-muted-foreground">
                        {/* Policy Type Badge */}
                        {property.cancellationPolicyType && (
                          <div className="mb-3">
                            <Badge
                              variant={
                                property.cancellationPolicyType === "flexible"
                                  ? "default"
                                  : property.cancellationPolicyType ===
                                      "moderate"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="capitalize"
                            >
                              {property.cancellationPolicyType}
                            </Badge>
                          </div>
                        )}

                        {/* Policy Details - Using actual owner-configured values */}
                        {property.cancellationPolicyType === "flexible" &&
                          (() => {
                            const hours = property.freeCancellationHours || 24;
                            const partialPercent =
                              property.partialRefundPercent || 50;
                            return (
                              <div className="text-sm space-y-1">
                                <p className="text-green-600 dark:text-green-400 font-medium">
                                  Free cancellation until {hours} hours before
                                  check-in
                                </p>
                                <p>
                                  100% refund if cancelled {hours}+ hours before
                                </p>
                                <p>
                                  {partialPercent}% refund if cancelled less
                                  than {hours} hours before
                                </p>
                              </div>
                            );
                          })()}

                        {property.cancellationPolicyType === "moderate" &&
                          (() => {
                            const hours = property.freeCancellationHours || 48;
                            const halfHours = hours / 2;
                            const partialPercent =
                              property.partialRefundPercent || 50;
                            const halfHoursDisplay = Number.isInteger(halfHours)
                              ? halfHours
                              : halfHours.toFixed(1);
                            return (
                              <div className="text-sm space-y-1">
                                <p className="text-amber-600 dark:text-amber-400 font-medium">
                                  Free cancellation until {hours} hours before
                                  check-in
                                </p>
                                <p>
                                  100% refund if cancelled {hours}+ hours before
                                </p>
                                <p>
                                  {partialPercent}% refund if cancelled{" "}
                                  {halfHoursDisplay}+ to {hours} hours before
                                </p>
                                <p>
                                  No refund if cancelled less than{" "}
                                  {halfHoursDisplay} hours before
                                </p>
                              </div>
                            );
                          })()}

                        {property.cancellationPolicyType === "strict" &&
                          (() => {
                            const hours = property.freeCancellationHours || 168;
                            const doubleHours = hours * 2;
                            const partialPercent =
                              property.partialRefundPercent || 50;
                            const daysDisplay =
                              doubleHours >= 24
                                ? ` (${(doubleHours / 24).toFixed(0)} days)`
                                : "";
                            return (
                              <div className="text-sm space-y-1">
                                <p className="text-red-600 dark:text-red-400 font-medium">
                                  Limited refund available
                                </p>
                                <p>
                                  {partialPercent}% refund if cancelled{" "}
                                  {doubleHours}+ hours{daysDisplay} before
                                </p>
                                <p>
                                  No refund if cancelled less than {doubleHours}{" "}
                                  hours before
                                </p>
                              </div>
                            );
                          })()}

                        {/* Custom Policy Text if available */}
                        {property.cancellationPolicy && (
                          <p className="text-xs mt-2 italic">
                            {property.cancellationPolicy.length > 100
                              ? property.cancellationPolicy.substring(0, 100) +
                                "..."
                              : property.cancellationPolicy}
                          </p>
                        )}

                        {!property.cancellationPolicyType &&
                          !property.cancellationPolicy && (
                            <p className="text-sm">
                              Contact host for cancellation details
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews Section */}
              <div ref={reviewsRef} className="scroll-mt-36">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">
                      Reviews {reviews.length > 0 && `(${reviews.length})`}
                    </h2>
                    {property.rating && Number(property.rating) > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-current text-yellow-500" />
                        <span className="text-lg font-semibold">
                          {Number(property.rating).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          • {property.reviewCount} reviews
                        </span>
                      </div>
                    )}
                  </div>

                  {canReview && (
                    <Dialog
                      open={reviewDialogOpen}
                      onOpenChange={setReviewDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button data-testid="button-write-review">
                          Write a Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>Write a Review</DialogTitle>
                          <DialogDescription>
                            Share your experience with other travelers
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...reviewForm}>
                          <form
                            onSubmit={reviewForm.handleSubmit(
                              handleReviewSubmit,
                            )}
                            className="space-y-4"
                          >
                            <FormField
                              control={reviewForm.control}
                              name="rating"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rating</FormLabel>
                                  <FormControl>
                                    <RadioGroup
                                      value={String(field.value ?? 5)}
                                      onValueChange={(value) =>
                                        field.onChange(Number(value))
                                      }
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
                                {submitReviewMutation.isPending
                                  ? "Submitting..."
                                  : "Submit Review"}
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
                      <Card
                        key={review.id}
                        data-testid={`card-review-${review.id}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <Avatar>
                              <AvatarImage src={review.guestProfileImageUrl} />
                              <AvatarFallback>
                                {review.guestFirstName?.[0]}
                                {review.guestLastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-3">
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h4
                                    className="font-semibold"
                                    data-testid={`text-reviewer-name-${review.id}`}
                                  >
                                    {review.guestFirstName}{" "}
                                    {review.guestLastName}
                                  </h4>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(
                                      review.createdAt,
                                    ).toLocaleDateString()}
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

                              <p
                                className="text-muted-foreground leading-relaxed"
                                data-testid={`text-review-comment-${review.id}`}
                              >
                                {review.comment}
                              </p>

                              {review.ownerResponse && (
                                <div className="mt-4 pl-4 border-l-2 border-muted">
                                  <p className="text-sm font-semibold mb-1">
                                    Response from owner
                                  </p>
                                  <p
                                    className="text-sm text-muted-foreground"
                                    data-testid={`text-owner-response-${review.id}`}
                                  >
                                    {review.ownerResponse}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center gap-3 pt-2">
                                <Button
                                  variant={
                                    markedHelpfulReviews.has(review.id)
                                      ? "default"
                                      : "ghost"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    helpfulMutation.mutate(review.id)
                                  }
                                  disabled={
                                    helpfulMutation.isPending ||
                                    markedHelpfulReviews.has(review.id)
                                  }
                                  data-testid={`button-helpful-${review.id}`}
                                >
                                  <ThumbsUp
                                    className={`h-4 w-4 mr-1 ${markedHelpfulReviews.has(review.id) ? "fill-current" : ""}`}
                                  />
                                  {markedHelpfulReviews.has(review.id)
                                    ? "Marked Helpful"
                                    : "Helpful"}{" "}
                                  {review.helpful > 0 && `(${review.helpful})`}
                                </Button>

                                {user?.id === property.ownerId &&
                                  !review.ownerResponse && (
                                    <Dialog
                                      open={
                                        ownerResponseDialogOpen &&
                                        selectedReviewId === review.id
                                      }
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
                                          <DialogTitle>
                                            Respond to Review
                                          </DialogTitle>
                                          <DialogDescription>
                                            Share your response with{" "}
                                            {review.guestFirstName}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <Form {...ownerResponseForm}>
                                          <form
                                            onSubmit={ownerResponseForm.handleSubmit(
                                              createOwnerResponseSubmitHandler(
                                                review.id,
                                              ),
                                            )}
                                            className="space-y-4"
                                          >
                                            <FormField
                                              control={
                                                ownerResponseForm.control
                                              }
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
                                                  setOwnerResponseDialogOpen(
                                                    false,
                                                  );
                                                  setSelectedReviewId(null);
                                                  ownerResponseForm.reset();
                                                }}
                                                data-testid="button-cancel-response"
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                type="submit"
                                                disabled={
                                                  ownerResponseMutation.isPending
                                                }
                                                data-testid="button-submit-response"
                                              >
                                                {ownerResponseMutation.isPending
                                                  ? "Posting..."
                                                  : "Post Response"}
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

            {/* Booking Card - Hidden on mobile, shown on desktop */}
            <div className="hidden md:block md:sticky md:top-20 h-fit">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-6">
                    {roomTypes.length > 0 ? (
                      <>
                        {(() => {
                          const lowestPrice = Math.min(
                            ...roomTypes.map((rt: any) => Number(rt.basePrice)),
                          );
                          const roomWithLowestPrice = roomTypes.find(
                            (rt: any) => Number(rt.basePrice) === lowestPrice,
                          );
                          const hasDiscount =
                            roomWithLowestPrice?.originalPrice &&
                            parseFloat(roomWithLowestPrice.originalPrice) >
                              parseFloat(roomWithLowestPrice.basePrice);

                          return (
                            <>
                              <div className="flex items-baseline gap-1 mb-2 flex-wrap">
                                {hasDiscount && (
                                  <span className="text-xl text-muted-foreground line-through">
                                    ₹
                                    {Number(
                                      roomWithLowestPrice.originalPrice,
                                    ).toLocaleString("en-IN")}
                                  </span>
                                )}
                                <span
                                  className={`text-3xl font-semibold ${hasDiscount ? "text-green-600 dark:text-green-400" : ""}`}
                                  data-testid="text-price-detail"
                                >
                                  ₹{lowestPrice.toLocaleString("en-IN")}
                                </span>
                                <span className="text-muted-foreground">
                                  / night
                                </span>
                              </div>
                              {hasDiscount && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs mb-2"
                                >
                                  {Math.round(
                                    (1 -
                                      lowestPrice /
                                        Number(
                                          roomWithLowestPrice.originalPrice,
                                        )) *
                                      100,
                                  )}
                                  % OFF
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Starting from
                              </p>
                              <Badge
                                className="text-white border-0 mt-2"
                                style={{ backgroundColor: "#1D9E75" }}
                                data-testid="badge-zero-commission-sidebar"
                              >
                                0% Commission
                              </Badge>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">
                          No rooms available
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Please check back later
                        </p>
                      </div>
                    )}
                    {property.rating && Number(property.rating) > 0 && (
                      <div className="flex items-center gap-1 text-sm mt-2">
                        <Star className="h-4 w-4 fill-current text-yellow-500" />
                        <span className="font-semibold">
                          {Number(property.rating).toFixed(1)}
                        </span>
                        <span className="text-muted-foreground">
                          ({property.reviewCount} reviews)
                        </span>
                      </div>
                    )}
                    {totalAvailableRooms !== null && totalAvailableRooms > 0 && totalAvailableRooms < 3 && (
                      <p
                        className="text-sm font-semibold text-red-600 dark:text-red-400 mt-2"
                        data-testid="text-low-inventory-warning"
                      >
                        Only {totalAvailableRooms} room{totalAvailableRooms !== 1 ? "s" : ""} left!
                      </p>
                    )}
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-sm font-semibold block mb-2">
                        Check-in
                      </label>
                      <Popover
                        open={checkInPopoverOpen}
                        onOpenChange={setCheckInPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="input-checkin-booking"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkIn ? (
                              format(parseLocalDate(checkIn), "PPP")
                            ) : (
                              <span className="text-muted-foreground">
                                Select date
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              checkIn ? parseLocalDate(checkIn) : undefined
                            }
                            onSelect={(date) => {
                              // Use format() to preserve local timezone instead of toISOString() which shifts to UTC
                              const dateStr = date
                                ? format(date, "yyyy-MM-dd")
                                : "";
                              setCheckIn(dateStr);
                              if (
                                checkOut &&
                                date &&
                                parseLocalDate(checkOut) <= date
                              ) {
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
                              const today = new Date(
                                new Date().setHours(0, 0, 0, 0),
                              );
                              if (date < today) return true;

                              // Check availability using the new calendar availability data
                              // Only disable if availableRooms === 0
                              const dateStr = format(date, "yyyy-MM-dd");
                              const availability =
                                availabilityByDate.get(dateStr);
                              if (
                                availability &&
                                availability.availableRooms === 0
                              ) {
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
                                return (
                                  currentDate >= blockStart &&
                                  currentDate < blockEnd
                                );
                              });
                              return isBlocked;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-2">
                        Check-out
                      </label>
                      <Popover
                        open={checkOutPopoverOpen}
                        onOpenChange={setCheckOutPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="input-checkout-booking"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkOut ? (
                              format(parseLocalDate(checkOut), "PPP")
                            ) : (
                              <span className="text-muted-foreground">
                                Select date
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              checkOut ? parseLocalDate(checkOut) : undefined
                            }
                            onSelect={(date) => {
                              // Use format() to preserve local timezone instead of toISOString() which shifts to UTC
                              setCheckOut(
                                date ? format(date, "yyyy-MM-dd") : "",
                              );
                              if (date) {
                                setCheckOutPopoverOpen(false);
                              }
                            }}
                            disabled={(date) => {
                              const today = new Date(
                                new Date().setHours(0, 0, 0, 0),
                              );
                              if (date <= today) return true;
                              if (checkIn && date <= parseLocalDate(checkIn))
                                return true;

                              // Check availability using the new calendar availability data
                              // Only disable if availableRooms === 0
                              const dateStr = format(date, "yyyy-MM-dd");
                              const availability =
                                availabilityByDate.get(dateStr);
                              if (
                                availability &&
                                availability.availableRooms === 0
                              ) {
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
                                return (
                                  currentDate >= blockStart &&
                                  currentDate < blockEnd
                                );
                              });
                              return isBlocked;
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-2">
                        Guests
                      </label>
                      <Popover
                        open={guestsPopoverOpen}
                        onOpenChange={setGuestsPopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between text-left font-normal"
                            data-testid="input-guests-booking"
                          >
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>
                                {adults} Adult{adults !== 1 ? "s" : ""},{" "}
                                {children} Child{children !== 1 ? "ren" : ""}
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
                                <div className="text-xs text-muted-foreground">
                                  Ages 13 or above
                                </div>
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
                                <span
                                  className="w-6 text-center font-medium"
                                  data-testid="text-adults-count"
                                >
                                  {adults}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (adults + children < absoluteMaxGuests) {
                                      setAdults(adults + 1);
                                    }
                                  }}
                                  disabled={
                                    adults + children >= absoluteMaxGuests
                                  }
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
                                <div className="text-xs text-muted-foreground">
                                  Ages 2–12
                                </div>
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
                                <span
                                  className="w-6 text-center font-medium"
                                  data-testid="text-children-count"
                                >
                                  {children}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (adults + children < absoluteMaxGuests) {
                                      setChildren(children + 1);
                                    }
                                  }}
                                  disabled={
                                    adults + children >= absoluteMaxGuests
                                  }
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
                                    : "Number of rooms"}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Cannot reduce below requiredRooms
                                    setRooms(
                                      Math.max(requiredRooms, rooms - 1),
                                    );
                                  }}
                                  disabled={rooms <= requiredRooms}
                                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  data-testid="button-rooms-minus"
                                >
                                  <Minus className="h-4 w-4 text-gray-600" />
                                </button>
                                <span
                                  className="w-6 text-center font-medium"
                                  data-testid="text-rooms-count"
                                >
                                  {rooms}
                                </span>
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
                              Max {maxGuestsPerRoom} guests per room (
                              {maxAllowedGuests} total for {rooms} room
                              {rooms > 1 ? "s" : ""})
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Room Type Selection — MMT-style cards */}
                    {roomTypes.length > 0 && (
                      <RoomTypeCards
                        roomTypes={roomTypes.filter(
                          (rt: any) => rt.isActive !== false,
                        )}
                        propertyImages={property?.images || []}
                        selectedRoomTypeId={selectedRoomTypeId}
                        selectedMealOptionId={selectedMealOptionId}
                        onRoomTypeSelect={(id) => {
                          setSelectedRoomTypeId(id);
                          setSelectedMealOptionId(null);
                        }}
                        onMealOptionSelect={setSelectedMealOptionId}
                        inventoryMap={Object.fromEntries(
                          roomInventory.map((ri: any) => [
                            ri.roomTypeId,
                            {
                              roomTypeId: ri.roomTypeId,
                              availableRooms: ri.availableRooms,
                              isSoldOut: ri.isSoldOut || false,
                              isLowStock: ri.isLowStock || false,
                            },
                          ]),
                        )}
                        showDatesContext={!!(checkIn && checkOut)}
                        adults={adults}
                        guests={guests}
                        nights={nights}
                      />
                    )}

                    {/* Guest/Room calculation helper and warnings */}
                    {selectedRoomType && (
                      <div className="space-y-2">
                        {/* Helper text showing auto-calculated rooms */}
                        <div
                          className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                          data-testid="room-calculation-helper"
                        >
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <span className="font-medium">
                              {guests} guest{guests !== 1 ? "s" : ""} · {rooms}{" "}
                              room{rooms !== 1 ? "s" : ""}
                            </span>
                            {requiredRooms !== rooms && (
                              <span className="ml-2 text-blue-600 dark:text-blue-300">
                                ({requiredRooms} room
                                {requiredRooms !== 1 ? "s" : ""} needed for{" "}
                                {adults} adult{adults !== 1 ? "s" : ""})
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Low inventory warning */}
                        {isLowInventory && !hasInsufficientRooms && (
                          <div
                            className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
                            data-testid="low-inventory-warning"
                          >
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                              Only {availableRoomsForType} room
                              {availableRoomsForType !== 1 ? "s" : ""} left for
                              this room type!
                            </p>
                          </div>
                        )}

                        {/* Insufficient rooms error */}
                        {hasInsufficientRooms && (
                          <div
                            className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                            data-testid="insufficient-rooms-error"
                          >
                            <p className="text-sm text-destructive font-medium">
                              Only {availableRoomsForType} room
                              {availableRoomsForType !== 1 ? "s" : ""} available
                              for selected dates.
                            </p>
                            <p className="text-xs text-destructive/80 mt-1">
                              Please reduce the number of guests or select a
                              different room type.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {hasDateOverlap && (
                    <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">
                        Selected dates are not available. Please choose
                        different dates.
                      </p>
                    </div>
                  )}

                  {hasBlockedDateOverlap && !hasDateOverlap && (
                    <div
                      className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg"
                      data-testid="blocked-dates-warning"
                    >
                      <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                        {blockedDateInfo?.type === "hold" &&
                          "This property is temporarily not accepting bookings for these dates."}
                        {blockedDateInfo?.type === "sold_out" &&
                          "This property is fully booked for these dates."}
                        {blockedDateInfo?.type === "maintenance" &&
                          "This property is under maintenance during these dates."}
                      </p>
                      {blockedDateInfo?.type === "hold" && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                          The owner has placed a temporary hold on bookings.
                          Please select different dates or contact the owner.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Limited availability info label - shown when selected room type has low stock */}
                  {selectedRoomTypeId &&
                    selectedRoomInventory?.isLowStock &&
                    !selectedRoomInventory?.isSoldOut &&
                    !hasDateOverlap &&
                    !hasBlockedDateOverlap && (
                      <div
                        className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
                        data-testid="limited-availability-info"
                      >
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                          Limited availability for selected dates
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                          Only {selectedRoomInventory.availableRooms} room
                          {selectedRoomInventory.availableRooms !== 1
                            ? "s"
                            : ""}{" "}
                          available for this room type. Book now to secure your
                          stay!
                        </p>
                      </div>
                    )}

                  {nights > 0 &&
                    totalPrice > 0 &&
                    !hasDateOverlap &&
                    !hasBlockedDateOverlap &&
                    selectedRoomTypeId &&
                    bookingStep === "select" &&
                    (() => {
                      const rt = roomTypes.find(
                        (rt: any) => rt.id === selectedRoomTypeId,
                      );
                      if (!rt) return null;

                      const adultsPerRoom = Math.ceil(adults / rooms);
                      let occupancyLabel = "Single occupancy";
                      if (adultsPerRoom >= 3 && rt.tripleOccupancyPrice) {
                        occupancyLabel = "Triple occupancy";
                      } else if (
                        adultsPerRoom >= 2 &&
                        rt.doubleOccupancyPrice
                      ) {
                        occupancyLabel = "Double occupancy";
                      }

                      let mealOptionName = "";
                      let mealOptionPrice = 0;
                      if (selectedMealOptionId && rt.mealOptions) {
                        const sel = rt.mealOptions.find(
                          (opt: any) => opt.id === selectedMealOptionId,
                        );
                        if (sel) {
                          mealOptionName = sel.name;
                          mealOptionPrice = Number(sel.priceAdjustment);
                        }
                      }

                      const mealSubtotal = nights * mealOptionPrice * guests;
                      // roomSubtotal derived from override-aware totalPrice
                      const roomSubtotal = Math.max(
                        totalPrice - mealSubtotal,
                        0,
                      );
                      const effectivePricePerNight =
                        nights > 0 && rooms > 0
                          ? roomSubtotal / nights / rooms
                          : 0;

                      // Mirror server slabs: 0/12/18% based on nightly rate.
                      const slabRate =
                        effectivePricePerNight < 1000
                          ? 0
                          : effectivePricePerNight < 7500
                            ? 12
                            : 18;
                      const gstInclusive =
                        platformSettings?.gstInclusive ?? true;
                      const gstAmount =
                        gstInclusive && slabRate > 0
                          ? Math.round(
                              (roomSubtotal * slabRate) / (100 + slabRate),
                            )
                          : 0;

                      return (
                        <div className="mb-4">
                          <BookingPriceSummary
                            breakdown={{
                              roomTypeName: `${rt.name} (${occupancyLabel})`,
                              basePrice: effectivePricePerNight,
                              occupancyAdjustment: 0,
                              occupancyLabel,
                              mealOptionName,
                              mealOptionPrice,
                              nights,
                              rooms,
                              guests,
                              adults,
                              children,
                              originalPrice: rt.originalPrice
                                ? Number(rt.originalPrice)
                                : null,
                              bulkDiscountPercent: 0,
                            }}
                            gstAmount={gstAmount}
                            gstRate={slabRate}
                            gstInclusive={gstInclusive}
                          />
                        </div>
                      );
                    })()}


                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    size="lg"
                    onClick={handleBooking}
                    disabled={
                      !checkIn ||
                      !checkOut ||
                      !selectedRoomTypeId ||
                      hasDateOverlap ||
                      hasBlockedDateOverlap ||
                      isBookingDisabled
                    }
                    data-testid="button-reserve"
                  >
                    {!selectedRoomTypeId
                      ? "Select Room Type"
                      : isBookingDisabled
                        ? "Not Available"
                        : "Book Now"}
                  </Button>

                  <div className="text-center mt-2 space-y-1">
                    <p
                      className="text-sm text-muted-foreground"
                      data-testid="text-no-payment-now"
                    >
                      No payment required now
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pay directly at the hotel
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
                              description:
                                "Please login to chat with the owner",
                              variant: "destructive",
                            });
                            setTimeout(() => {
                              window.location.href = "/login";
                            }, 500);
                            return;
                          }
                          if (
                            property &&
                            (property as any).ownerId === (user as any).id
                          ) {
                            toast({
                              title: "Cannot Chat With Yourself",
                              description:
                                "You cannot start a conversation with yourself",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!(user as any).phone) {
                            setPendingContactAction("chat");
                            setProfileDialogOpen(true);
                            return;
                          }
                          contactOwnerMutation.mutate();
                        }}
                        disabled={contactOwnerMutation.isPending}
                        data-testid="button-contact-owner"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        {contactOwnerMutation.isPending
                          ? "Loading..."
                          : "Chat with Owner"}
                      </Button>
                      {(property as any).ownerContact?.canCall && (
                        <Button
                          className="w-full"
                          variant="outline"
                          size="lg"
                          onClick={() => {
                            if (!(user as any)?.phone) {
                              setPendingContactAction("call");
                              setProfileDialogOpen(true);
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

          {/* Similar Properties */}
          {similarProperties.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-4">
                Similar stays in {property.destination}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similarProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} variant="grid" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Booking Bar - Airbnb style */}
        <MobileBookingBar
          property={{
            id: property.id,
            name: property.title,
            rating: property.rating ? Number(property.rating) : undefined,
            reviewCount: property.reviewCount || undefined,
            minPrice: minPrice,
          }}
          roomTypes={roomTypes}
          roomInventory={roomInventory.map((ri: any) => ({
            roomTypeId: ri.roomTypeId,
            availableRooms: ri.availableRooms,
            isSoldOut: ri.isSoldOut || false,
            isLowStock: ri.isLowStock || false,
          }))}
          checkIn={checkIn}
          checkOut={checkOut}
          adults={adults}
          children={children}
          rooms={rooms}
          selectedRoomTypeId={selectedRoomTypeId}
          selectedMealOptionId={selectedMealOptionId}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
          onAdultsChange={setAdults}
          onChildrenChange={setChildren}
          onRoomsChange={setRooms}
          onRoomTypeSelect={setSelectedRoomTypeId}
          onMealOptionSelect={setSelectedMealOptionId}
          onReserve={handleBooking}
          isReserving={false}
          isDisabled={
            isBookingDisabled ||
            !checkIn ||
            !checkOut ||
            !selectedRoomTypeId ||
            hasDateOverlap ||
            hasBlockedDateOverlap
          }
          disabledReason={
            !selectedRoomTypeId
              ? "Select Room Type"
              : isBookingDisabled
                ? "Not Available"
                : undefined
          }
          totalPrice={totalPrice}
          nights={nights}
          hasDateOverlap={hasDateOverlap}
          hasBlockedDateOverlap={hasBlockedDateOverlap}
          bookedDates={bookedDatesForCalendar}
          blockedDates={blockedDatesForCalendar}
        />
      </div>

      {/* Full-screen gallery modal — keyboard (arrows/esc), swipe, click-outside */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
          onClick={() => setGalleryOpen(false)}
          data-testid="gallery-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Property photo gallery"
        >
          <button
            onClick={(e) => { e.stopPropagation(); setGalleryOpen(false); }}
            className="absolute top-4 right-4 z-10 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close gallery"
            data-testid="button-gallery-close"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
            <span className="text-white text-sm bg-black/50 px-3 py-1 rounded-full" data-testid="text-gallery-counter">
              {galleryIndex + 1} / {allImages.length}
            </span>
          </div>

          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goGalleryPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
                aria-label="Previous photo"
                data-testid="button-gallery-prev"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goGalleryNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors"
                aria-label="Next photo"
                data-testid="button-gallery-next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="flex-1 flex items-center justify-center p-4 md:p-12">
            <img
              src={allImages[galleryIndex]}
              alt={`${property.title} photo ${galleryIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
              data-testid="gallery-image"
            />
          </div>

          {allImages.length > 1 && (
            <div
              className="flex gap-2 p-4 overflow-x-auto justify-center bg-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setGalleryIndex(idx)}
                  className={`flex-shrink-0 w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                    idx === galleryIndex
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  aria-label={`Go to photo ${idx + 1}`}
                  data-testid={`button-gallery-thumb-${idx}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ProfileCompletionDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        user={user as any}
        actionLabel={
          pendingContactAction === "call" ? "Save & Call Owner" : "Save & Chat"
        }
        onComplete={() => {
          if (pendingContactAction === "chat") {
            contactOwnerMutation.mutate();
          } else if (pendingContactAction === "call") {
            window.location.href = `tel:${(property as any)?.ownerContact?.phone}`;
          }
          setPendingContactAction(null);
        }}
      />
    </>
  );
}
