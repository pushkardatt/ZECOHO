import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal, X } from "lucide-react";
import type { Property } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function Search() {
  const { user } = useAuth();
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [minGuests, setMinGuests] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [searchDestination, setSearchDestination] = useState("");

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: user?.userRole === "guest",
  });

  const wishlistedPropertyIds = new Set(wishlists.map((w: any) => w.propertyId));

  const propertyTypes = [
    { value: "hotel", label: "Hotels" },
    { value: "villa", label: "Villas" },
    { value: "apartment", label: "Apartments" },
    { value: "cabin", label: "Cabins" },
    { value: "resort", label: "Resorts" },
    { value: "hostel", label: "Hostels" },
  ];

  const handleSearch = ({ destination }: { destination?: string; checkIn?: string; checkOut?: string; guests?: number }) => {
    if (destination !== undefined) {
      setSearchDestination(destination);
    }
  };

  const filteredProperties = properties.filter((property) => {
    if (property.status !== "published") return false;
    
    if (searchDestination && searchDestination.trim().length > 0) {
      const searchLower = searchDestination.toLowerCase().trim();
      const destinationLower = property.destination.toLowerCase();
      if (!destinationLower.includes(searchLower)) {
        return false;
      }
    }
    
    const price = Number(property.pricePerNight);
    if (price < priceRange[0] || price > priceRange[1]) return false;
    
    if (selectedTypes.length > 0 && !selectedTypes.includes(property.propertyType)) {
      return false;
    }
    
    if (property.maxGuests < minGuests) return false;
    
    return true;
  });

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40">
        <div className="container px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar compact onSearch={handleSearch} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden"
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className={`w-80 flex-shrink-0 space-y-4 ${showFilters ? "" : "hidden lg:block"}`}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Price range</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Slider
                  min={0}
                  max={1000}
                  step={10}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  data-testid="slider-price"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">${priceRange[0]}</span>
                  <span className="text-muted-foreground">${priceRange[1]}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Property type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {propertyTypes.map((type) => (
                  <div key={type.value} className="flex items-center gap-2">
                    <Checkbox
                      id={type.value}
                      checked={selectedTypes.includes(type.value)}
                      onCheckedChange={() => toggleType(type.value)}
                      data-testid={`checkbox-type-${type.value}`}
                    />
                    <Label
                      htmlFor={type.value}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {type.label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Guests</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="number"
                  min="1"
                  value={minGuests}
                  onChange={(e) => setMinGuests(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg"
                  data-testid="input-min-guests"
                />
              </CardContent>
            </Card>

            {(selectedTypes.length > 0 || priceRange[0] > 0 || priceRange[1] < 1000 || minGuests > 1 || searchDestination) && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setPriceRange([0, 1000]);
                  setSelectedTypes([]);
                  setMinGuests(1);
                  setSearchDestination("");
                }}
                data-testid="button-clear-filters"
              >
                Clear all filters
              </Button>
            )}
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold mb-2">
                {filteredProperties.length} {filteredProperties.length === 1 ? "stay" : "stays"} available
              </h1>
              {searchDestination && (
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-sm text-muted-foreground">Searching for:</span>
                  <Badge variant="secondary" className="gap-1" data-testid="badge-destination-filter">
                    {searchDestination}
                    <button
                      onClick={() => setSearchDestination("")}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                      data-testid="button-clear-destination"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[4/3] rounded-lg" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={{
                      ...property,
                      isWishlisted: wishlistedPropertyIds.has(property.id),
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-4">
                  No properties match your filters
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPriceRange([0, 1000]);
                    setSelectedTypes([]);
                    setMinGuests(1);
                    setSearchDestination("");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
