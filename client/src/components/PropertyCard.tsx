import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  MapPin,
  Star,
  Users,
  Share2,
  Phone,
  MessageCircle,
  BadgeCheck,
  ArrowRight,
  Check,
  GitCompare,
} from "lucide-react";
import type { Property } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useCompare } from "@/contexts/CompareContext";

interface OwnerContact {
  name: string | null;
  canCall: boolean;
  phone?: string | null;
}

interface SearchParams {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  adults?: number;
  children?: number;
  rooms?: number;
}

interface PropertyCardProps {
  property: Property & {
    images?: string[];
    isWishlisted?: boolean;
    ownerContact?: OwnerContact | null;
    startingRoomPrice?: string | null;
    startingRoomOriginalPrice?: string | null;
    amenities?: string[];
  };
  onWishlistToggle?: (propertyId: string) => void;
  searchParams?: SearchParams;
}

export function PropertyCard({
  property,
  onWishlistToggle,
  searchParams,
}: PropertyCardProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { addToCompare, removeFromCompare, isInCompare, maxCompareItems } =
    useCompare();
  const mainImage = property.images?.[0] || "/placeholder-property.jpg";
  const inCompare = isInCompare(property.id);

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCompare) {
      removeFromCompare(property.id);
      toast({ title: "Removed from compare" });
    } else {
      const added = addToCompare(property);
      if (added) {
        toast({
          title: "Added to compare",
          description: "You can compare up to 4 properties",
        });
      } else {
        toast({
          title: "Compare limit reached",
          description: `You can only compare ${maxCompareItems} properties at once`,
          variant: "destructive",
        });
      }
    }
  };

  // Build property URL with search params
  const buildPropertyUrl = () => {
    const params = new URLSearchParams();
    if (searchParams?.checkIn) params.set("checkIn", searchParams.checkIn);
    if (searchParams?.checkOut) params.set("checkOut", searchParams.checkOut);
    if (searchParams?.guests)
      params.set("guests", searchParams.guests.toString());
    if (searchParams?.adults)
      params.set("adults", searchParams.adults.toString());
    if (searchParams?.children !== undefined)
      params.set("children", searchParams.children.toString());
    if (searchParams?.rooms) params.set("rooms", searchParams.rooms.toString());

    const queryString = params.toString();
    return `/properties/${property.id}${queryString ? `?${queryString}` : ""}`;
  };

  const propertyUrl = buildPropertyUrl();

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof window === "undefined") return;

    const shareUrl = `${window.location.origin}/properties/${property.id}`;

    const copyToClipboard = async () => {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Link copied!",
            description: "Property link copied to clipboard",
          });
        } catch {
          toast({ title: "Share", description: shareUrl });
        }
      } else {
        toast({ title: "Share link", description: shareUrl });
      }
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out ${property.title} on ZECOHO - Zero Commission Hotel Booking`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  const chatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/conversations", {
        propertyId: property.id,
      });
      return await response.json();
    },
    onSuccess: (conversation: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation(`/messages?conversationId=${conversation.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  const handleChat = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to chat with the property owner",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }

    chatMutation.mutate();
  };

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (property.ownerContact?.phone) {
      window.location.href = `tel:${property.ownerContact.phone}`;
    } else {
      toast({
        title: "Phone not available",
        description: "The property owner's phone number is not available",
        variant: "destructive",
      });
    }
  };

  const isPublished = property.status === "published";
  const hasOwnerPhone = Boolean(property.ownerContact?.canCall);

  return (
    <Link href={propertyUrl}>
      <Card className="group overflow-visible border-0 shadow-md hover:shadow-xl cursor-pointer h-full transition-all duration-300 rounded-2xl">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl">
          <img
            src={mainImage}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            data-testid={`img-property-${property.id}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          {onWishlistToggle && (
            <Button
              size="icon"
              variant="ghost"
              className={`absolute top-3 right-3 h-10 w-10 rounded-full backdrop-blur-md shadow-lg transition-all duration-200 ${
                property.isWishlisted
                  ? "bg-white text-rose-500 hover:bg-white hover:scale-110"
                  : "bg-white/80 text-foreground/70 hover:bg-white hover:text-rose-500 hover:scale-110"
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWishlistToggle(property.id);
              }}
              data-testid={`button-wishlist-${property.id}`}
            >
              <Heart
                className={`h-5 w-5 ${property.isWishlisted ? "fill-current" : ""}`}
              />
            </Button>
          )}
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-white/95 backdrop-blur-sm text-foreground border-0 shadow-sm font-medium">
              {property.propertyType}
            </Badge>
            <Badge className="bg-emerald-500/90 backdrop-blur-sm text-white border-0 shadow-sm text-xs">
              <BadgeCheck className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-semibold text-lg line-clamp-1"
              data-testid={`text-title-${property.id}`}
            >
              {property.title}
            </h3>
            {property.rating && Number(property.rating) > 0 && (
              <div className="flex items-center gap-1 text-sm flex-shrink-0">
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                <span className="font-semibold">
                  {Number(property.rating).toFixed(1)}
                </span>
                {property.reviewCount > 0 && (
                  <span className="text-muted-foreground">
                    ({property.reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Trust Micro-Text */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              Verified by ZECOHO
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-500" />
              Real Guest Ratings
            </span>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{property.destination}</span>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{property.maxGuests} guests</span>
            </div>
            <span>•</span>
            <span>
              {property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}
            </span>
            <span>•</span>
            <span>
              {property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}
            </span>
          </div>

          {/* OTA Price Comparison Ribbon - uses room-type pricing */}
          {(() => {
            // Use room-type starting price, fall back to legacy pricePerNight only if no room types
            const zecohoPrice = property.startingRoomPrice
              ? Number(property.startingRoomPrice)
              : Number(property.pricePerNight);
            const otaPrice = Math.round(zecohoPrice * 1.15);
            const savings = otaPrice - zecohoPrice;

            // Only show if we have a valid price
            if (!zecohoPrice || zecohoPrice <= 0) return null;

            return (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      ZECOHO ₹{zecohoPrice.toLocaleString("en-IN")}
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-muted-foreground line-through">
                      OTA ₹{otaPrice.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Save ₹{savings.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="pt-2 border-t">
            {/* Price display - uses room-type pricing with strike-off */}
            {(() => {
              const displayPrice = property.startingRoomPrice
                ? Number(property.startingRoomPrice)
                : Number(property.pricePerNight);
              const originalPrice = property.startingRoomOriginalPrice
                ? Number(property.startingRoomOriginalPrice)
                : property.originalPrice
                  ? Number(property.originalPrice)
                  : null;
              const hasDiscount = originalPrice && originalPrice > displayPrice;

              if (!displayPrice || displayPrice <= 0) {
                return (
                  <span className="text-sm text-muted-foreground">
                    Price not available
                  </span>
                );
              }

              return (
                <div className="flex items-baseline gap-2 flex-wrap">
                  {hasDiscount && (
                    <span className="text-base text-muted-foreground line-through">
                      ₹{originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  <span
                    className="text-xl font-semibold"
                    data-testid={`text-price-${property.id}`}
                  >
                    ₹{displayPrice.toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm text-muted-foreground">/ night</span>
                </div>
              );
            })()}
          </div>

          {/* Book Direct CTA Button */}
          <Button
            variant="default"
            size="sm"
            className="w-full group"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLocation(`/properties/${property.id}`);
            }}
            data-testid={`button-book-direct-${property.id}`}
          >
            Book Direct
            <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
          </Button>

          {/* Card Footer - Chat, Call, Share, Save buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            {isPublished && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleChat}
                  disabled={chatMutation.isPending}
                  className="text-muted-foreground"
                  data-testid={`button-chat-${property.id}`}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {chatMutation.isPending ? "..." : "Chat"}
                </Button>
                {isAuthenticated && hasOwnerPhone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCall}
                    className="text-muted-foreground"
                    data-testid={`button-call-${property.id}`}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCompareToggle}
                className={inCompare ? "text-primary" : "text-muted-foreground"}
                data-testid={`button-compare-${property.id}`}
              >
                <GitCompare
                  className={`h-4 w-4 ${inCompare ? "text-primary" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="text-muted-foreground"
                data-testid={`button-share-${property.id}`}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              {onWishlistToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onWishlistToggle(property.id);
                  }}
                  className={
                    property.isWishlisted
                      ? "text-primary"
                      : "text-muted-foreground"
                  }
                  data-testid={`button-save-${property.id}`}
                >
                  <Heart
                    className={`h-4 w-4 ${property.isWishlisted ? "fill-current" : ""}`}
                  />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
