import React, { useState } from "react";
import { useCompare } from "@/contexts/CompareContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
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
  ShieldCheck,
  Trophy,
  TrendingDown,
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
    if (lowerAmenity.includes(key)) return Icon;
  }
  return Check;
}

// Fetch room types for a property
function usePropertyRoomTypes(propertyId: string) {
  return useQuery<any[]>({
    queryKey: [`/api/properties/${propertyId}/room-types`],
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

function RoomTypeCell({ propertyId }: { propertyId: string }) {
  const { data: roomTypes = [] } = usePropertyRoomTypes(propertyId);
  if (!roomTypes.length)
    return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="space-y-1.5">
      {roomTypes.slice(0, 3).map((rt: any) => (
        <div key={rt.id} className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{rt.name}</span>
          <span className="text-sm text-primary font-semibold whitespace-nowrap">
            ₹{Number(rt.basePrice).toLocaleString("en-IN")}
          </span>
        </div>
      ))}
      {roomTypes.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{roomTypes.length - 3} more
        </span>
      )}
    </div>
  );
}

export default function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const [, setLocation] = useLocation();

  if (compareList.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <GitCompare className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">No Properties to Compare</h1>
        <p className="text-muted-foreground mb-6">
          Add properties to compare from the search results or property
          listings.
        </p>
        <Button
          onClick={() => setLocation("/search")}
          data-testid="button-browse-properties"
        >
          Browse Properties
        </Button>
      </div>
    );
  }

  const allAmenities = new Set<string>();
  compareList.forEach((property) => {
    if (property.amenities && Array.isArray(property.amenities)) {
      property.amenities.forEach((a: string) => allAmenities.add(a));
    }
  });

  // Find best price and rating for highlighting
  const prices = compareList.map((p) =>
    p.startingRoomPrice ? Number(p.startingRoomPrice) : Number(p.pricePerNight),
  );
  const ratings = compareList.map((p) => Number(p.rating) || 0);
  const lowestPrice = Math.min(...prices);
  const highestRating = Math.max(...ratings);
  const amenityCount = compareList.map((p) => p.amenities?.length || 0);
  const mostAmenities = Math.max(...amenityCount);

  const LABEL_WIDTH = "w-36 shrink-0";
  const CELL_WIDTH = "w-64 shrink-0";

  const SectionHeader = ({ label }: { label: string }) => (
    <div className="flex gap-3 mt-2">
      <div className={`${LABEL_WIDTH}`} />
      {compareList.map((p) => (
        <div key={p.id} className={`${CELL_WIDTH} h-px bg-border`} />
      ))}
    </div>
  );

  const Row = ({
    label,
    icon,
    children,
    highlight,
  }: {
    label: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    highlight?: boolean;
  }) => (
    <div
      className={`flex gap-3 py-3 ${highlight ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""}`}
    >
      <div className={`${LABEL_WIDTH} flex items-start gap-1.5 pt-0.5`}>
        {icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}
        <span className="text-sm font-semibold text-muted-foreground leading-tight">
          {label}
        </span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
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
              <h1
                className="text-lg font-bold"
                data-testid="text-compare-heading"
              >
                Compare Properties
              </h1>
              <p className="text-xs text-muted-foreground">
                {compareList.length} properties side by side
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCompare}
            data-testid="button-clear-all"
          >
            Clear All
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="overflow-x-auto pb-6">
          <div className="min-w-max space-y-0">
            {/* Property Cards Row */}
            <div className="flex gap-3 mb-2">
              <div className={LABEL_WIDTH} />
              {compareList.map((property) => {
                const price = property.startingRoomPrice
                  ? Number(property.startingRoomPrice)
                  : Number(property.pricePerNight);
                const isCheapest = price === lowestPrice;
                const isTopRated =
                  Number(property.rating) === highestRating &&
                  highestRating > 0;

                return (
                  <div
                    key={property.id}
                    className={`${CELL_WIDTH} relative`}
                    data-testid={`compare-card-${property.id}`}
                  >
                    {/* Badges */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      {isCheapest && compareList.length > 1 && (
                        <Badge className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" /> Best Price
                        </Badge>
                      )}
                      {isTopRated && compareList.length > 1 && (
                        <Badge className="bg-amber-500 text-white text-xs px-1.5 py-0.5 flex items-center gap-1">
                          <Trophy className="h-3 w-3" /> Top Rated
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCompare(property.id)}
                      className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-destructive hover:text-white transition-colors"
                      data-testid={`button-remove-${property.id}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="rounded-xl overflow-hidden border bg-background shadow-sm">
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={
                            property.images?.[0] || "/placeholder-property.jpg"
                          }
                          alt={property.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() =>
                            setLocation(`/properties/${property.id}`)
                          }
                        />
                      </div>
                      <div className="p-3">
                        <h3
                          className="font-semibold text-sm line-clamp-2 mb-1 cursor-pointer hover:text-primary transition-colors"
                          onClick={() =>
                            setLocation(`/properties/${property.id}`)
                          }
                        >
                          {property.title}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">
                            {property.destination}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price Row */}
            <Row
              label="Price / Night"
              icon={<span className="text-xs">₹</span>}
            >
              {compareList.map((property) => {
                const price = property.startingRoomPrice
                  ? Number(property.startingRoomPrice)
                  : Number(property.pricePerNight);
                const isCheapest =
                  price === lowestPrice && compareList.length > 1;
                return (
                  <div key={property.id} className={`${CELL_WIDTH}`}>
                    <div
                      className={`rounded-lg p-3 ${isCheapest ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" : "bg-background border"}`}
                    >
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-xl font-bold ${isCheapest ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
                        >
                          ₹{price.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / night
                        </span>
                      </div>
                      <Badge className="mt-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-0 text-xs">
                        0% Commission
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </Row>

            {/* Rating Row */}
            <Row label="Rating" icon={<Star className="h-3.5 w-3.5" />}>
              {compareList.map((property) => {
                const rating = Number(property.rating) || 0;
                const isTop =
                  rating === highestRating &&
                  highestRating > 0 &&
                  compareList.length > 1;
                return (
                  <div key={property.id} className={`${CELL_WIDTH}`}>
                    <div
                      className={`rounded-lg p-3 border ${isTop ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-background"}`}
                    >
                      {rating > 0 ? (
                        <div className="flex items-center gap-2">
                          <Star
                            className={`h-4 w-4 fill-current ${isTop ? "text-amber-500" : "text-yellow-400"}`}
                          />
                          <span className="font-bold text-lg">
                            {rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            / 5
                          </span>
                          {property.reviewCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({property.reviewCount})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No ratings yet
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Row>

            {/* Location Row */}
            <Row label="Location" icon={<MapPin className="h-3.5 w-3.5" />}>
              {compareList.map((property) => (
                <div key={property.id} className={`${CELL_WIDTH}`}>
                  <div className="rounded-lg p-3 bg-background border">
                    <p className="text-sm font-medium">
                      {property.destination}
                    </p>
                    {property.address && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {property.address}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </Row>

            {/* Room Types Row */}
            <Row label="Room Types" icon={<Bed className="h-3.5 w-3.5" />}>
              {compareList.map((property) => (
                <div key={property.id} className={`${CELL_WIDTH}`}>
                  <div className="rounded-lg p-3 bg-background border">
                    <RoomTypeCell propertyId={property.id} />
                  </div>
                </div>
              ))}
            </Row>

            {/* Capacity Row */}
            <Row label="Capacity" icon={<Users className="h-3.5 w-3.5" />}>
              {compareList.map((property) => (
                <div key={property.id} className={`${CELL_WIDTH}`}>
                  <div className="rounded-lg p-3 bg-background border">
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{property.maxGuests} guests</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{property.bedrooms} beds</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{property.bathrooms} baths</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Row>

            {/* Verification Row */}
            <Row
              label="Verified"
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
            >
              {compareList.map((property) => (
                <div key={property.id} className={`${CELL_WIDTH}`}>
                  <div className="rounded-lg p-3 bg-background border">
                    {property.status === "published" ? (
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Verified by ZECOHO
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </Row>

            {/* Amenities Section */}
            {allAmenities.size > 0 && (
              <>
                {/* Section divider */}
                <div className="flex gap-3 pt-4 pb-2">
                  <div className={LABEL_WIDTH}>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Amenities
                    </span>
                  </div>
                  {compareList.map((p) => {
                    const count = p.amenities?.length || 0;
                    const isMost =
                      count === mostAmenities &&
                      mostAmenities > 0 &&
                      compareList.length > 1;
                    return (
                      <div key={p.id} className={`${CELL_WIDTH}`}>
                        <Badge
                          variant={isMost ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {count} amenities{" "}
                          {isMost && compareList.length > 1 ? "⭐ Most" : ""}
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                {Array.from(allAmenities)
                  .slice(0, 12)
                  .map((amenity) => {
                    const AmenityIcon = getAmenityIcon(amenity);
                    const anyHas = compareList.some((p) =>
                      p.amenities?.includes(amenity),
                    );
                    if (!anyHas) return null;
                    return (
                      <div
                        key={`amenity-row-${amenity}`}
                        className="flex gap-3 py-2 border-t border-dashed border-border/50"
                      >
                        <div
                          className={`${LABEL_WIDTH} flex items-center gap-1.5`}
                        >
                          <AmenityIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground capitalize">
                            {amenity}
                          </span>
                        </div>
                        {compareList.map((property) => {
                          const hasAmenity =
                            property.amenities?.includes(amenity);
                          return (
                            <div
                              key={`${property.id}-${amenity}`}
                              className={`${CELL_WIDTH} flex items-center justify-center`}
                            >
                              {hasAmenity ? (
                                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                  <XIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
              </>
            )}

            {/* Book Now Row */}
            <div className="flex gap-3 pt-6 border-t mt-4">
              <div className={LABEL_WIDTH} />
              {compareList.map((property) => (
                <div key={property.id} className={CELL_WIDTH}>
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
