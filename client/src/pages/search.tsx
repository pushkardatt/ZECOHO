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
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Property, Amenity } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useKycGuard } from "@/hooks/useKycGuard";
import { RestrictedAccess } from "@/components/RestrictedAccess";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";

export default function Search() {
  const { user, isOwner } = useAuth();
  const [location] = useLocation();
  const { shouldBlockAccess } = useKycGuard();

  // Block access for rejected owners
  if (isOwner && shouldBlockAccess) {
    return <RestrictedAccess description="Your KYC has been rejected. Please fix your KYC to access search." />;
  }
  
  // Filter states - multi-select arrays
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedStarRatings, setSelectedStarRatings] = useState<string[]>([]);
  // Single select filters (boolean options)
  const [coupleFriendly, setCoupleFriendly] = useState<string>("");
  const [hourlyAvailability, setHourlyAvailability] = useState<string>("");
  const [localIdAllowed, setLocalIdAllowed] = useState<string>("");
  const [foreignGuestsAllowed, setForeignGuestsAllowed] = useState<string>("");
  const [selectedLocality, setSelectedLocality] = useState<string>("");
  // More filters toggle for mobile
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  
  const [searchDestination, setSearchDestination] = useState("");
  const [initialSearchValues, setInitialSearchValues] = useState({
    destination: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
    adults: 2,
    children: 0,
    rooms: 1,
  });

  // Parse URL query parameters on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const destination = searchParams.get("destination") || "";
    const checkIn = searchParams.get("checkIn") || "";
    const checkOut = searchParams.get("checkOut") || "";
    const guests = searchParams.get("guests");
    const adults = searchParams.get("adults");
    const children = searchParams.get("children");
    const rooms = searchParams.get("rooms");
    
    setSearchDestination(destination);
    setInitialSearchValues({
      destination,
      checkIn,
      checkOut,
      guests: guests ? parseInt(guests) : 2,
      adults: adults ? parseInt(adults) : 2,
      children: children ? parseInt(children) : 0,
      rooms: rooms ? parseInt(rooms) : 1,
    });
  }, [location]);

  const { data: properties = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
    refetchInterval: 60000, // Refresh every 60 seconds for price/availability updates
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

  const booleanOptions = [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ];

  // Get unique localities from properties that match the search destination (city)
  // Only show localities when a city/destination is selected
  const hasSearchDestination = searchDestination && searchDestination.trim().length > 0;
  
  const localities = hasSearchDestination ? Array.from(new Set(
    properties
      .filter(p => {
        if (!p.propLocality) return false;
        // Only include localities from properties matching the search destination
        const searchLower = searchDestination.toLowerCase().trim();
        const destinationLower = (p.destination || "").toLowerCase();
        const cityLower = (p.propCity || "").toLowerCase();
        const stateLower = (p.propState || "").toLowerCase();
        return destinationLower.includes(searchLower) || 
               cityLower.includes(searchLower) || 
               stateLower.includes(searchLower);
      })
      .map(p => p.propLocality as string)
  )).sort() : [];
  
  // Clear selected locality when search destination changes
  useEffect(() => {
    setSelectedLocality("");
  }, [searchDestination]);

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
      if (!destinationLower.includes(searchLower) && 
          !titleLower.includes(searchLower) &&
          !cityLower.includes(searchLower) &&
          !stateLower.includes(searchLower)) {
        return false;
      }
    }
    
    // Property type filter (multi-select - match ANY selected type)
    if (selectedTypes.length > 0 && !selectedTypes.includes(property.propertyType || "")) {
      return false;
    }
    
    // Budget filter (multi-select - match ANY selected budget range)
    if (selectedBudgets.length > 0) {
      const price = Number(property.pricePerNight);
      const matchesBudget = selectedBudgets.some((budget) => {
        const [min, max] = budget.split("-").map(Number);
        if (price < min) return false;
        if (max > 0 && price > max) return false;
        return true;
      });
      if (!matchesBudget) return false;
    }
    
    // Rating filter (multi-select - match ANY selected minimum rating)
    if (selectedRatings.length > 0) {
      const rating = Number(property.rating) || 0;
      const matchesRating = selectedRatings.some((minRating) => rating >= Number(minRating));
      if (!matchesRating) return false;
    }
    
    // Star rating filter - currently not implemented as property doesn't have starRating field
    // TODO: Add starRating field to properties schema when hotel brands feature is ready
    
    // Amenities filter - currently not implemented as requires junction table lookup
    // TODO: Implement amenities filtering with property amenities relationship
    
    // Locality filter
    if (selectedLocality && property.propLocality !== selectedLocality) {
      return false;
    }
    
    // Guest policy filters
    if (coupleFriendly === "yes" && property.coupleFriendly !== true) {
      return false;
    }
    if (coupleFriendly === "no" && property.coupleFriendly !== false) {
      return false;
    }
    
    if (hourlyAvailability === "yes" && property.hourlyBookingAllowed !== true) {
      return false;
    }
    if (hourlyAvailability === "no" && property.hourlyBookingAllowed !== false) {
      return false;
    }
    
    if (localIdAllowed === "yes" && property.localIdAllowed !== true) {
      return false;
    }
    if (localIdAllowed === "no" && property.localIdAllowed !== false) {
      return false;
    }
    
    if (foreignGuestsAllowed === "yes" && property.foreignGuestsAllowed !== true) {
      return false;
    }
    if (foreignGuestsAllowed === "no" && property.foreignGuestsAllowed !== false) {
      return false;
    }
    
    return true;
  });

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedBudgets([]);
    setSelectedRatings([]);
    setSelectedAmenities([]);
    setSelectedStarRatings([]);
    setCoupleFriendly("");
    setHourlyAvailability("");
    setLocalIdAllowed("");
    setForeignGuestsAllowed("");
    setSelectedLocality("");
    setSearchDestination("");
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedBudgets.length > 0 || 
    selectedRatings.length > 0 || selectedAmenities.length > 0 || selectedStarRatings.length > 0 ||
    coupleFriendly || hourlyAvailability || localIdAllowed || foreignGuestsAllowed ||
    selectedLocality || searchDestination;

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header - Sticky to remain visible on scroll */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                initialAdults={initialSearchValues.adults}
                initialChildren={initialSearchValues.children}
                initialRooms={initialSearchValues.rooms}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Filters Bar - All filters in one scrollable row on desktop */}
      <div className="border-b bg-muted/30">
          <div className="container px-4 md:px-6 py-4">
            {/* Single Row of All Filters - horizontal scroll on mobile, single line on desktop */}
            <div className="flex items-end gap-3 overflow-x-auto pb-2 lg:overflow-x-visible lg:flex-nowrap scrollbar-thin">
              {/* Property Type Filter */}
              <div className="flex-shrink-0">
                <MultiSelectFilter
                  label="Property Type"
                  options={propertyTypes}
                  selectedValues={selectedTypes}
                  onSelectionChange={setSelectedTypes}
                  placeholder="All types"
                  testId="filter-property-type"
                />
              </div>

              {/* Budget Filter */}
              <div className="flex-shrink-0">
                <MultiSelectFilter
                  label="Budget"
                  options={budgetOptions}
                  selectedValues={selectedBudgets}
                  onSelectionChange={setSelectedBudgets}
                  placeholder="Any budget"
                  testId="filter-budget"
                />
              </div>

              {/* User Rating Filter */}
              <div className="flex-shrink-0">
                <MultiSelectFilter
                  label="User Rating"
                  options={ratingOptions}
                  selectedValues={selectedRatings}
                  onSelectionChange={setSelectedRatings}
                  placeholder="Any rating"
                  testId="filter-rating"
                />
              </div>

              {/* Amenities Filter */}
              <div className="flex-shrink-0">
                <MultiSelectFilter
                  label="Amenities"
                  options={amenities.length > 0 
                    ? amenities.map((a) => ({ value: a.id, label: `${a.name}${a.category ? ` (${a.category})` : ""}` }))
                    : [{ value: "wifi", label: "WiFi" }]
                  }
                  selectedValues={selectedAmenities}
                  onSelectionChange={setSelectedAmenities}
                  placeholder="All amenities"
                  testId="filter-amenity"
                />
              </div>

              {/* Hotel Star Rating Filter */}
              <div className="flex-shrink-0">
                <MultiSelectFilter
                  label="Star Rating"
                  options={starRatingOptions}
                  selectedValues={selectedStarRatings}
                  onSelectionChange={setSelectedStarRatings}
                  placeholder="Any stars"
                  testId="filter-star-rating"
                />
              </div>

              {/* Couple Friendly Filter */}
              <div className="flex-shrink-0 min-w-[120px]">
                <Label className="text-sm font-medium mb-2 block whitespace-nowrap">Couple Friendly</Label>
                <Select value={coupleFriendly} onValueChange={setCoupleFriendly}>
                  <SelectTrigger data-testid="select-couple-friendly" className="w-full h-9">
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
              <div className="flex-shrink-0 min-w-[120px]">
                <Label className="text-sm font-medium mb-2 block whitespace-nowrap">Hourly</Label>
                <Select value={hourlyAvailability} onValueChange={setHourlyAvailability}>
                  <SelectTrigger data-testid="select-hourly" className="w-full h-9">
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
              <div className="flex-shrink-0 min-w-[110px]">
                <Label className="text-sm font-medium mb-2 block whitespace-nowrap">Local ID</Label>
                <Select value={localIdAllowed} onValueChange={setLocalIdAllowed}>
                  <SelectTrigger data-testid="select-local-id" className="w-full h-9">
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

              {/* Foreign Guests Allowed Filter */}
              <div className="flex-shrink-0 min-w-[120px]">
                <Label className="text-sm font-medium mb-2 block whitespace-nowrap">Foreign Guests</Label>
                <Select value={foreignGuestsAllowed} onValueChange={setForeignGuestsAllowed}>
                  <SelectTrigger data-testid="select-foreign-guests" className="w-full h-9">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    {booleanOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} data-testid={`select-foreign-${option.value}`}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Localities Filter - Only enabled when city/destination is selected */}
              <div className="flex-shrink-0 min-w-[140px]">
                <Label className="text-sm font-medium mb-2 block whitespace-nowrap">Localities</Label>
                <Select 
                  value={selectedLocality} 
                  onValueChange={setSelectedLocality}
                  disabled={!hasSearchDestination}
                >
                  <SelectTrigger data-testid="select-locality" className="w-full h-9">
                    <SelectValue placeholder={hasSearchDestination ? "All localities" : "Search city first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {localities.length > 0 ? (
                      localities.map((locality) => (
                        <SelectItem key={locality} value={locality} data-testid={`select-locality-${locality}`}>
                          {locality}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-localities" disabled>No localities in this area</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear Filters Button - inline with filters */}
              {hasActiveFilters && (
                <div className="flex-shrink-0 self-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    data-testid="button-clear-filters"
                    className="h-9 whitespace-nowrap"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

      <div className="container px-4 md:px-6 py-6">
        {/* Results */}
        <div className="w-full">
            <div className="mb-6">
              <h1 className="text-3xl font-semibold mb-2">
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
                    searchParams={{
                      checkIn: initialSearchValues.checkIn,
                      checkOut: initialSearchValues.checkOut,
                      guests: initialSearchValues.guests,
                      adults: initialSearchValues.adults,
                      children: initialSearchValues.children,
                      rooms: initialSearchValues.rooms,
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
