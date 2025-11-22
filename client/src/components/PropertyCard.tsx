import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Star, Users } from "lucide-react";
import type { Property } from "@shared/schema";
import { Link } from "wouter";

interface PropertyCardProps {
  property: Property & {
    images?: string[];
    isWishlisted?: boolean;
  };
  onWishlistToggle?: (propertyId: string) => void;
}

export function PropertyCard({ property, onWishlistToggle }: PropertyCardProps) {
  const mainImage = property.images?.[0] || "/placeholder-property.jpg";

  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="group overflow-hidden hover-elevate active-elevate-2 cursor-pointer h-full">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img 
            src={mainImage} 
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            data-testid={`img-property-${property.id}`}
          />
          {onWishlistToggle && (
            <Button
              size="icon"
              variant="ghost"
              className={`absolute top-3 right-3 h-9 w-9 rounded-full backdrop-blur-md ${
                property.isWishlisted 
                  ? "bg-white/90 text-primary hover:bg-white" 
                  : "bg-white/70 text-foreground/70 hover:bg-white/90 hover:text-foreground"
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onWishlistToggle(property.id);
              }}
              data-testid={`button-wishlist-${property.id}`}
            >
              <Heart className={`h-4 w-4 ${property.isWishlisted ? "fill-current" : ""}`} />
            </Button>
          )}
          <Badge className="absolute bottom-3 left-3 bg-white/90 text-foreground border-0">
            {property.propertyType}
          </Badge>
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
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-semibold" data-testid={`text-price-${property.id}`}>
                ${Number(property.pricePerNight).toFixed(0)}
              </span>
              <span className="text-sm text-muted-foreground">/ night</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
