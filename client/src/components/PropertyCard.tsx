import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Star, Users, Share2, Phone, MessageCircle, BadgeCheck, Clock } from "lucide-react";
import type { Property } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface OwnerContact {
  phone: string | null;
  name: string | null;
}

interface PropertyCardProps {
  property: Property & {
    images?: string[];
    isWishlisted?: boolean;
    ownerContact?: OwnerContact | null;
  };
  onWishlistToggle?: (propertyId: string) => void;
}

export function PropertyCard({ property, onWishlistToggle }: PropertyCardProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const mainImage = property.images?.[0] || "/placeholder-property.jpg";

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (typeof window === 'undefined') return;
    
    const shareUrl = `${window.location.origin}/properties/${property.id}`;
    
    const copyToClipboard = async () => {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast({ title: "Link copied!", description: "Property link copied to clipboard" });
        } catch {
          toast({ title: "Share", description: shareUrl });
        }
      } else {
        toast({ title: "Share link", description: shareUrl });
      }
    };
    
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: `Check out ${property.title} on ZECOHO - Zero Commission Hotel Booking`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard();
        }
      }
    } else {
      await copyToClipboard();
    }
  };

  const chatMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/conversations", { propertyId: property.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation("/messages");
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
        window.location.href = "/api/login";
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
  const hasOwnerPhone = Boolean(property.ownerContact?.phone);

  return (
    <Link href={`/properties/${property.id}`}>
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
              <Heart className={`h-5 w-5 ${property.isWishlisted ? "fill-current" : ""}`} />
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
            <Badge className="bg-blue-500/90 backdrop-blur-sm text-white border-0 shadow-sm text-xs">
              <Clock className="h-3 w-3 mr-1" />
              24hr Check-in
            </Badge>
          </div>
        </div>
        
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-1" data-testid={`text-title-${property.id}`}>
              {property.title}
            </h3>
            {property.rating && Number(property.rating) > 0 && (
              <div className="flex items-center gap-1 text-sm flex-shrink-0">
                <Star className="h-4 w-4 fill-current text-yellow-500" />
                <span className="font-semibold">{Number(property.rating).toFixed(1)}</span>
              </div>
            )}
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
            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}</span>
            <span>•</span>
            <span>{property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}</span>
          </div>
          
          <div className="pt-2 border-t">
            <div className="flex items-baseline gap-2 flex-wrap">
              {property.originalPrice && Number(property.originalPrice) > Number(property.pricePerNight) && (
                <span className="text-base text-muted-foreground line-through">
                  ₹{Number(property.originalPrice).toLocaleString('en-IN')}
                </span>
              )}
              <span className="text-xl font-semibold" data-testid={`text-price-${property.id}`}>
                ₹{Number(property.pricePerNight).toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-muted-foreground">/ night</span>
            </div>
          </div>
          
          {/* Call and Chat buttons for published properties */}
          {isPublished && (
            <div className="flex items-center gap-2 pt-2">
              {hasOwnerPhone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCall}
                  className="flex-1"
                  data-testid={`button-call-${property.id}`}
                >
                  <Phone className="h-4 w-4 mr-1.5" />
                  Call
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleChat}
                disabled={chatMutation.isPending}
                className="flex-1"
                data-testid={`button-chat-${property.id}`}
              >
                <MessageCircle className="h-4 w-4 mr-1.5" />
                {chatMutation.isPending ? "..." : "Chat"}
              </Button>
            </div>
          )}
          
          {/* Share and Save buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-muted-foreground"
              data-testid={`button-share-${property.id}`}
            >
              <Share2 className="h-4 w-4 mr-1.5" />
              Share
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
                className={property.isWishlisted ? "text-primary" : "text-muted-foreground"}
                data-testid={`button-save-${property.id}`}
              >
                <Heart className={`h-4 w-4 mr-1.5 ${property.isWishlisted ? "fill-current" : ""}`} />
                Save
              </Button>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
