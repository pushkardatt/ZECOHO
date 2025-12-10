import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import type { Property, Amenity } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

export default function Search() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  // Filter states
  const [selectedType, setSelectedType] = useState<string>(""); // No default - show all property types
  const [selectedBudget, setSelectedBudget] = useState<string>("");
  const [selectedRating, setSelectedRating] = useState<string>("");
  const [selectedAmenity, setSelectedAmenity] = useState<string>("");
  const [coupleFriendly, setCoupleFriendly] = useState<string>("");
  const [hourlyAvailability, setHourlyAvailability] = useState<string>("");
  const [localIdAllowed, setLocalIdAllowed] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedStarRating, setSelectedStarRating] = useState<string>("");
  const [selectedLocality, setSelectedLocality] = useState<string>("");
  
  const [showFilters, setShowFilters] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [searchDestination, setSearchDestination] = useState("");
  const [initialSearchValues, setInitialSearchValues] = useState({
    destination: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
  });

  // Parse URL query parameters on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const destination = searchParams.get("destination") || "";
    const checkIn = searchParams.get("checkIn") || "";
    const checkOut = searchParams.get("checkOut") || "";
    const guests = searchParams.get("guests");
    
    setSearchDestination(destination);
    setInitialSearchValues({
      destination,
      checkIn,
      checkOut,
      guests: guests ? parseInt(guests) : 2,
    });
  }, [location]);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: amenities = [] } = useQuery<Amenity[]>({
    queryKey: ["/api/amenities"],
  });

  const { data: wishlists = [] } = useQuery<any[]>({
    queryKey: ["/api/wishlists"],
    enabled: user?.userRole === "guest",
  });

  const wishlistedPropertyIds = new Set(wishlists.map((w: any) => w.propertyId));

  // Filter options
  const propertyTypes = [
    { value: "hotel", label: "Hotels" },
    { value: "villa", label: "Villas" },
    { value: "apartment", label: "Apartments" },
    { value: "resort", label: "Resorts" },
    { value: "hostel", label: "Hostels" },
    { value: "lodge", label: "Lodges" },
    { value: "farmhouse", label: "Farmhouses" },
    { value: "homestay", label: "Homestays" },
  ];

  const budgetOptions = [
    { value: "0-1000", label: "Under ₹1,000" },
    { value: "1000-2500", label: "₹1,000 - ₹2,500" },
    { value: "2500-5000", label: "₹2,500 - ₹5,000" },
    { value: "5000-10000", label: "₹5,000 - ₹10,000" },
    { value: "10000-25000", label: "₹10,000 - ₹25,000" },
    { value: "25000-50000", label: "₹25,000 - ₹50,000" },
    { value: "50000-0", label: "₹50,000+" },
  ];

  const ratingOptions = [
    { value: "4.5", label: "4.5+ Excellent" },
    { value: "4", label: "4+ Very Good" },
    { value: "3.5", label: "3.5+ Good" },
    { value: "3", label: "3+ Average" },
  ];

  const starRatingOptions = [
    { value: "5", label: "5 Star" },
    { value: "4", label: "4 Star" },
    { value: "3", label: "3 Star" },
    { value: "2", label: "2 Star" },
    { value: "1", label: "1 Star" },
  ];

  const hotelBrands = [
    { value: "taj", label: "Taj Hotels" },
    { value: "oberoi", label: "The Oberoi Group" },
    { value: "itc", label: "ITC Hotels" },
    { value: "marriott", label: "Marriott" },
    { value: "hyatt", label: "Hyatt" },
    { value: "radisson", label: "Radisson" },
    { value: "oyo", label: "OYO" },
    { value: "treebo", label: "Treebo" },
    { value: "fabhotels", label: "FabHotels" },
    { value: "lemon_tree", label: "Lemon Tree" },
  ];

  const booleanOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];

  // Get unique localities from properties
  const localities = Array.from(new Set(
    properties
      .filter(p => p.propLocality)
      .map(p => p.propLocality as string)
  )).sort();

  const handleSearch = ({ destination }: { destination?: string; checkIn?: string; checkOut?: string; guests?: number }) => {
    if (destination !== undefined) {
      setSearchDestination(destination);
    }
  };

  const filteredProperties = properties.filter((property) => {
    if (property.status !== "published") return false;
    
    // Destination and property name filter
    if (searchDestination && searchDestination.trim().length > 0) {
      const searchLower = searchDestination.toLowerCase().trim();
      const destinationLower = (property.destination || "").toLowerCase();
      const titleLower = (property.title || "").toLowerCase();
      const cityLower = (property.propCity || "").toLowerCase();
      const stateLower = (property.propState || "").toLowerCase();
      // Match destination, property title, city, or state
      if (!destinationLower.includes(searchLower) && 
          !titleLower.includes(searchLower) &&
          !cityLower.includes(searchLower) &&
          !stateLower.includes(searchLower)) {
        return false;
      }
    }
    
    // Property type filter
    if (selectedType && property.propertyType !== selectedType) {
      return false;
    }
    
    // Budget filter
    if (selectedBudget) {
      const price = Number(property.pricePerNight);
      const [min, max] = selectedBudget.split("-").map(Number);
      if (price < min) return false;
      if (max > 0 && price > max) return false;
    }
    
    // Rating filter
    if (selectedRating) {
      const rating = Number(property.rating) || 0;
      if (rating < Number(selectedRating)) {
        return false;
      }
    }
    
    // Locality filter
    if (selectedLocality && property.propLocality !== selectedLocality) {
      return false;
    }
    
    return true;
  });

  const clearAllFilters = () => {
    setSelectedType("");
    setSelectedBudget("");
    setSelectedRating("");
    setSelectedAmenity("");
    setCoupleFriendly("");
    setHourlyAvailability("");
    setLocalIdAllowed("");
    setSelectedBrand("");
    setSelectedStarRating("");
    setSelectedLocality("");
    setSearchDestination("");
  };

  const hasActiveFilters = selectedType || selectedBudget || selectedRating || 
    selectedAmenity || coupleFriendly || hourlyAvailability || localIdAllowed || 
    selectedBrand || selectedStarRating || selectedLocality || searchDestination;

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <SearchBar 
                onSearch={handleSearch}
                showDates={true}
                showGuests={true}
                initialDestination={initialSearchValues.destination}
                initialCheckIn={initialSearchValues.checkIn}
                initialCheckOut={initialSearchValues.checkOut}
                initialGuests={initialSearchValues.guests}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </div>
      </div>

      {/* Horizontal Filters Bar */}
      {showFilters && (
        <div className="border-b bg-muted/30">
          <div className="container px-4 md:px-6 py-4">
            {/* Primary Filters Row */}
            <div className="flex flex-wrap items-end gap-4 mb-4">
              {/* Property Type Filter */}
              <div className="min-w-[160px]">
                <Label className="text-sm font-medium mb-2 block">Property Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger data-testid="select-property-type" className="w-full">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} data-testid={`select-type-${type.value}`}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Budget Filter */}
              <div className="min-w-[160px]">
                <Label className="text-sm font-medium mb-2 block">Budget</Label>
                <Select value={selectedBudget} onValueChange={setSelectedBudget}>
                  <SelectTrigger data-testid="select-budget" className="w-full">
                    <SelectValue placeholder="Any budget" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`select-budget-${option.value}`}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Rating Filter */}
              <div className="min-w-[160px]">
                <Label className="text-sm font-medium mb-2 block">User Rating</Label>
                <Select value={selectedRating} onValueChange={setSelectedRating}>
                  <SelectTrigger data-testid="select-rating" className="w-full">
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`select-rating-${option.value}`}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amenities Filter */}
              <div className="min-w-[180px]">
                <Label className="text-sm font-medium mb-2 block">Amenities</Label>
                <Select value={selectedAmenity} onValueChange={setSelectedAmenity}>
                  <SelectTrigger data-testid="select-amenity" className="w-full">
                    <SelectValue placeholder="All amenities" />
                  </SelectTrigger>
                  <SelectContent>
                    {amenities.length > 0 ? (
                      amenities.map((amenity) => (
                        <SelectItem key={amenity.id} value={amenity.id} data-testid={`select-amenity-${amenity.id}`}>
                          {amenity.name} {amenity.category ? `(${amenity.category})` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="wifi">WiFi</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Hotel Star Rating Filter */}
              <div className="min-w-[140px]">
                <Label className="text-sm font-medium mb-2 block">Hotel Star Rating</Label>
                <Select value={selectedStarRating} onValueChange={setSelectedStarRating}>
                  <SelectTrigger data-testid="select-star-rating" className="w-full">
                    <SelectValue placeholder="Any stars" />
                  </SelectTrigger>
                  <SelectContent>
                    {starRatingOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`select-star-${option.value}`}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show More Filters Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                data-testid="button-more-filters"
                className="mb-0.5"
              >
                {showMoreFilters ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Less Filters
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    More Filters
                  </>
                )}
              </Button>
            </div>

            {/* Secondary Filters Row (Expandable) */}
            {showMoreFilters && (
              <div className="flex flex-wrap items-end gap-4 pt-4 border-t">
                {/* Couple Friendly Filter */}
                <div className="min-w-[140px]">
                  <Label className="text-sm font-medium mb-2 block">Couple Friendly</Label>
                  <Select value={coupleFriendly} onValueChange={setCoupleFriendly}>
                    <SelectTrigger data-testid="select-couple-friendly" className="w-full">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {booleanOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} data-testid={`select-couple-${option.value}`}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hourly Availability Filter */}
                <div className="min-w-[160px]">
                  <Label className="text-sm font-medium mb-2 block">Hourly Availability</Label>
                  <Select value={hourlyAvailability} onValueChange={setHourlyAvailability}>
                    <SelectTrigger data-testid="select-hourly" className="w-full">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {booleanOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} data-testid={`select-hourly-${option.value}`}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Local ID Allowed Filter */}
                <div className="min-w-[140px]">
                  <Label className="text-sm font-medium mb-2 block">Local ID Allowed</Label>
                  <Select value={localIdAllowed} onValueChange={setLocalIdAllowed}>
                    <SelectTrigger data-testid="select-local-id" className="w-full">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      {booleanOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} data-testid={`select-localid-${option.value}`}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hotel Brands Filter */}
                <div className="min-w-[160px]">
                  <Label className="text-sm font-medium mb-2 block">Hotel Brands</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger data-testid="select-brand" className="w-full">
                      <SelectValue placeholder="All brands" />
                    </SelectTrigger>
                    <SelectContent>
                      {hotelBrands.map((brand) => (
                        <SelectItem key={brand.value} value={brand.value} data-testid={`select-brand-${brand.value}`}>
                          {brand.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Localities and Landmarks Filter */}
                <div className="min-w-[180px]">
                  <Label className="text-sm font-medium mb-2 block">Localities & Landmarks</Label>
                  <Select value={selectedLocality} onValueChange={setSelectedLocality}>
                    <SelectTrigger data-testid="select-locality" className="w-full">
                      <SelectValue placeholder="All localities" />
                    </SelectTrigger>
                    <SelectContent>
                      {localities.length > 0 ? (
                        localities.map((locality) => (
                          <SelectItem key={locality} value={locality} data-testid={`select-locality-${locality}`}>
                            {locality}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="all" disabled>No localities available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="flex justify-end mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="container px-4 md:px-6 py-6">
        {/* Results */}
        <div className="w-full">
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
                  onClick={clearAllFilters}
                >
                  Clear filters
                </Button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
