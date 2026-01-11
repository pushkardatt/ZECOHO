import React from "react";
import { useCompare } from "@/contexts/CompareContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Star, 
  MapPin, 
  Users, 
  Bed, 
  Bath, 
  Check, 
  X as XIcon,
  ArrowLeft,
  GitCompare,
  Wifi,
  Car,
  Utensils,
  Waves,
  Dumbbell,
  Wind,
  Tv,
  Coffee,
  ShieldCheck
} from "lucide-react";
import { useLocation } from "wouter";

const amenityIcons: Record<string, any> = {
  wifi: Wifi,
  parking: Car,
  restaurant: Utensils,
  pool: Waves,
  gym: Dumbbell,
  "air conditioning": Wind,
  ac: Wind,
  tv: Tv,
  breakfast: Coffee,
};

function getAmenityIcon(amenity: string) {
  const lowerAmenity = amenity.toLowerCase();
  for (const [key, Icon] of Object.entries(amenityIcons)) {
    if (lowerAmenity.includes(key)) {
      return Icon;
    }
  }
  return Check;
}

export default function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const [, setLocation] = useLocation();

  if (compareList.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <GitCompare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">No Properties to Compare</h1>
        <p className="text-muted-foreground mb-6">
          Add properties to compare from the search results or property listings.
        </p>
        <Button onClick={() => setLocation("/search")} data-testid="button-browse-properties">
          Browse Properties
        </Button>
      </div>
    );
  }

  const allAmenities = new Set<string>();
  compareList.forEach(property => {
    if (property.amenities && Array.isArray(property.amenities)) {
      property.amenities.forEach((a: string) => allAmenities.add(a));
    }
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/search")}
              data-testid="button-back-to-search"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-compare-heading">
                Compare Properties
              </h1>
              <p className="text-muted-foreground text-sm">
                Comparing {compareList.length} properties side by side
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={clearCompare}
            data-testid="button-clear-all"
          >
            Clear All
          </Button>
        </div>

        <div className="overflow-x-auto pb-6">
          <div className="min-w-max">
            <div 
              className="grid gap-4"
              style={{ gridTemplateColumns: `200px repeat(${compareList.length}, minmax(280px, 1fr))` }}
            >
              {/* Property Images Row */}
              <div className="font-semibold text-muted-foreground flex items-end pb-2">
                Property
              </div>
              {compareList.map((property) => (
                <Card key={property.id} className="relative overflow-hidden" data-testid={`compare-card-${property.id}`}>
                  <button
                    onClick={() => removeFromCompare(property.id)}
                    className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background"
                    data-testid={`button-remove-${property.id}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={property.images?.[0] || "/placeholder-property.jpg"}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 
                      className="font-semibold line-clamp-2 mb-1 cursor-pointer hover:text-primary"
                      onClick={() => setLocation(`/properties/${property.id}`)}
                    >
                      {property.title}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{property.destination}</span>
                    </div>
                  </div>
                </Card>
              ))}

              {/* Price Row */}
              <div className="font-semibold text-muted-foreground flex items-center">
                Price / Night
              </div>
              {compareList.map((property) => {
                const price = property.startingRoomPrice 
                  ? Number(property.startingRoomPrice) 
                  : Number(property.pricePerNight);
                return (
                  <div key={property.id} className="bg-background rounded-lg p-4 flex items-center">
                    <div>
                      <span className="text-2xl font-bold text-primary">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span className="text-muted-foreground text-sm ml-1">/ night</span>
                      <Badge className="ml-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0">
                        0% Commission
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {/* Rating Row */}
              <div className="font-semibold text-muted-foreground flex items-center">
                Rating
              </div>
              {compareList.map((property) => (
                <div key={property.id} className="bg-background rounded-lg p-4 flex items-center">
                  {property.rating && Number(property.rating) > 0 ? (
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 fill-current text-yellow-500" />
                      <span className="font-semibold text-lg">
                        {Number(property.rating).toFixed(1)}
                      </span>
                      <span className="text-muted-foreground text-sm">/ 5</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No ratings yet</span>
                  )}
                </div>
              ))}

              {/* Property Type Row */}
              <div className="font-semibold text-muted-foreground flex items-center">
                Property Type
              </div>
              {compareList.map((property) => (
                <div key={property.id} className="bg-background rounded-lg p-4 flex items-center">
                  <Badge variant="secondary" className="capitalize">
                    {property.propertyType}
                  </Badge>
                </div>
              ))}

              {/* Capacity Row */}
              <div className="font-semibold text-muted-foreground flex items-center">
                Capacity
              </div>
              {compareList.map((property) => (
                <div key={property.id} className="bg-background rounded-lg p-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{property.maxGuests} guests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      <span>{property.bedrooms} beds</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4 text-muted-foreground" />
                      <span>{property.bathrooms} baths</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Verified Row */}
              <div className="font-semibold text-muted-foreground flex items-center">
                Verification
              </div>
              {compareList.map((property) => (
                <div key={property.id} className="bg-background rounded-lg p-4 flex items-center">
                  {property.status === "published" ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="font-medium">Verified by ZECOHO</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Pending verification</span>
                  )}
                </div>
              ))}

              {/* Amenities Section */}
              {allAmenities.size > 0 && (
                <>
                  <div className="font-semibold text-muted-foreground flex items-center pt-4 border-t mt-2">
                    Amenities
                  </div>
                  {compareList.map((property) => (
                    <div key={property.id} className="pt-4 border-t mt-2" />
                  ))}

                  {Array.from(allAmenities).slice(0, 10).map((amenity) => {
                    const AmenityIcon = getAmenityIcon(amenity);
                    return (
                      <React.Fragment key={`amenity-row-${amenity}`}>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 py-2">
                          <AmenityIcon className="h-4 w-4" />
                          <span className="capitalize">{amenity}</span>
                        </div>
                        {compareList.map((property) => {
                          const amenities = property.amenities;
                          const hasAmenity = amenities?.includes(amenity);
                          return (
                            <div 
                              key={`${property.id}-${amenity}`} 
                              className="bg-background rounded-lg p-3 flex items-center justify-center"
                            >
                              {hasAmenity ? (
                                <Check className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <XIcon className="h-5 w-5 text-muted-foreground/30" />
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </>
              )}

              {/* Book Now Row */}
              <div className="font-semibold text-muted-foreground flex items-center pt-4">
                Action
              </div>
              {compareList.map((property) => (
                <div key={property.id} className="pt-4">
                  <Button
                    className="w-full"
                    onClick={() => setLocation(`/properties/${property.id}`)}
                    data-testid={`button-book-${property.id}`}
                  >
                    View & Book
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
