import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, MapPin, Calendar as CalendarIcon, Users, Loader2, Building2, Minus, Plus, ChevronDown, Star, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { format, addDays } from "date-fns";

interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  types?: string[];
}

interface SearchBarProps {
  onSearch?: (params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    adults?: number;
    children?: number;
    rooms?: number;
  }) => void;
  compact?: boolean;
  showDates?: boolean;
  showGuests?: boolean;
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  initialAdults?: number;
  initialChildren?: number;
  initialRooms?: number;
  ctaText?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SearchBar({ 
  onSearch, 
  compact = false,
  showDates = true,
  showGuests = true,
  initialDestination = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = 2,
  initialAdults = 2,
  initialChildren = 0,
  initialRooms = 1,
  ctaText = "Find Lowest Direct Prices →",
}: SearchBarProps) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [destination, setDestination] = useState(initialDestination);
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(
    initialCheckIn ? new Date(initialCheckIn) : undefined
  );
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(
    initialCheckOut ? new Date(initialCheckOut) : undefined
  );
  const [guests, setGuests] = useState(initialGuests);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [rooms, setRooms] = useState(initialRooms);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleCityPredictions, setGoogleCityPredictions] = useState<GooglePlacePrediction[]>([]);
  const [googleHotelPredictions, setGoogleHotelPredictions] = useState<GooglePlacePrediction[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [matchedCity, setMatchedCity] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const guestsInputRef = useRef<HTMLInputElement>(null);
  
  // Popover open states for custom calendar and guests
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  
  // Calculate total guests whenever adults/children change
  useEffect(() => {
    setGuests(adults + children);
  }, [adults, children]);
  
  // Load saved guest preferences from localStorage on mount (only if no initial values provided)
  useEffect(() => {
    if (typeof window !== 'undefined' && initialAdults === 2 && initialChildren === 0 && initialRooms === 1) {
      const savedPrefs = localStorage.getItem("guestPreferences");
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.adults) setAdults(prefs.adults);
        if (prefs.children !== undefined) setChildren(prefs.children);
        if (prefs.rooms) setRooms(prefs.rooms);
      }
    }
  }, []);
  
  // Save guest preferences to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("guestPreferences", JSON.stringify({ adults, children, rooms }));
    }
  }, [adults, children, rooms]);
  
  const debouncedDestination = useDebounce(destination.trim(), 300);

  useEffect(() => {
    setDestination(initialDestination);
    setCheckInDate(initialCheckIn ? new Date(initialCheckIn) : undefined);
    setCheckOutDate(initialCheckOut ? new Date(initialCheckOut) : undefined);
    setGuests(initialGuests);
    setAdults(initialAdults);
    setChildren(initialChildren);
    setRooms(initialRooms);
  }, [initialDestination, initialCheckIn, initialCheckOut, initialGuests, initialAdults, initialChildren, initialRooms]);

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).google) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        const checkGoogle = () => {
          if ((window as any).google?.maps?.places) {
            autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
            setGoogleMapsLoaded(true);
          } else {
            setTimeout(checkGoogle, 100);
          }
        };
        checkGoogle();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if ((window as any).google) {
          autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
          setGoogleMapsLoaded(true);
        }
      };
      document.head.appendChild(script);
    } else if ((window as any).google?.maps?.places) {
      autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
      setGoogleMapsLoaded(true);
    }
  }, []);

  const fetchGooglePredictions = useCallback(async (query: string) => {
    if (!query || query.length < 2 || !autocompleteServiceRef.current) {
      setGoogleCityPredictions([]);
      setGoogleHotelPredictions([]);
      setIsGoogleLoading(false);
      return;
    }

    setIsGoogleLoading(true);
    try {
      // Fetch both city and hotel/lodging predictions in parallel
      const [cityResults, hotelResults] = await Promise.all([
        autocompleteServiceRef.current.getPlacePredictions({
          input: query,
          componentRestrictions: { country: "in" },
          types: ["(cities)"],
        }),
        autocompleteServiceRef.current.getPlacePredictions({
          input: query,
          componentRestrictions: { country: "in" },
          types: ["lodging"],
        }),
      ]);
      setGoogleCityPredictions(cityResults.predictions || []);
      setGoogleHotelPredictions(hotelResults.predictions || []);
    } catch (error) {
      console.error("Error fetching Google predictions:", error);
      setGoogleCityPredictions([]);
      setGoogleHotelPredictions([]);
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedDestination.length >= 2 && googleMapsLoaded) {
      fetchGooglePredictions(debouncedDestination);
    } else {
      setGoogleCityPredictions([]);
      setGoogleHotelPredictions([]);
    }
  }, [debouncedDestination, googleMapsLoaded, fetchGooglePredictions]);

  const saveSearchMutation = useMutation({
    mutationFn: async (searchData: any) => {
      const res = await fetch('/api/search-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData),
      });
      if (!res.ok) throw new Error('Failed to save search');
      return res.json();
    },
  });

  const { data: filteredDestinations = [], isLoading } = useQuery({
    queryKey: ['destination-search', debouncedDestination],
    queryFn: async () => {
      if (debouncedDestination.length === 0) {
        return [];
      }
      const url = `/api/destinations/search?q=${encodeURIComponent(debouncedDestination)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch destinations');
      return res.json();
    },
    staleTime: 60000,
    enabled: debouncedDestination.length > 0,
  });

  // Detect matched city from destinations or Google predictions for Swiggy-style suggestions
  const detectedCity = useMemo(() => {
    if (debouncedDestination.length < 2) return null;
    
    const searchLower = debouncedDestination.toLowerCase();
    
    // Check database destinations for city match
    const dbCityMatch = filteredDestinations.find((d: any) => 
      !d.isProperty && d.name?.toLowerCase().startsWith(searchLower)
    );
    if (dbCityMatch) return dbCityMatch.name;
    
    // Check Google city predictions
    const googleCityMatch = googleCityPredictions.find(p => {
      const cityName = p.structured_formatting?.main_text?.toLowerCase() || p.description.split(",")[0].toLowerCase();
      return cityName.startsWith(searchLower);
    });
    if (googleCityMatch) {
      return googleCityMatch.structured_formatting?.main_text || googleCityMatch.description.split(",")[0];
    }
    
    return null;
  }, [debouncedDestination, filteredDestinations, googleCityPredictions]);
  
  // Update matchedCity state when detected city changes
  useEffect(() => {
    setMatchedCity(detectedCity);
  }, [detectedCity]);
  
  // Fetch top hotels for the matched city
  const { data: cityTopHotels = [], isLoading: isLoadingCityHotels } = useQuery({
    queryKey: ['city-top-hotels', matchedCity],
    queryFn: async () => {
      if (!matchedCity) return [];
      const res = await fetch(`/api/cities/${encodeURIComponent(matchedCity)}/top-hotels?limit=5`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60000,
    enabled: !!matchedCity,
  });

  // Group destinations into sections for Swiggy-style dropdown
  const groupedSuggestions = useMemo(() => {
    // Separate database destinations and properties
    const dbDestinations = filteredDestinations.filter((d: any) => !d.isProperty);
    const dbProperties = filteredDestinations.filter((d: any) => d.isProperty);
    const dbNames = new Set(dbDestinations.map((d: any) => d.name.toLowerCase()));
    
    // Add cities from Google Places (that aren't already in our database)
    const googleCities = googleCityPredictions
      .filter(p => !dbNames.has(p.structured_formatting?.main_text?.toLowerCase() || p.description.split(",")[0].toLowerCase()))
      .map(p => ({
        id: `google-city-${p.place_id}`,
        name: p.structured_formatting?.main_text || p.description.split(",")[0],
        state: p.structured_formatting?.secondary_text?.split(",")[0] || "",
        isGoogle: true,
        isHotel: false,
        isProperty: false,
      }));

    // Combine all city matches
    const allCities = [
      ...dbDestinations.map((d: any) => ({ ...d, isHotel: false, isProperty: false })),
      ...googleCities,
    ].slice(0, 5); // Limit to 5 city suggestions
    
    // Top hotels in matched city (from our database)
    const topHotelsInCity = cityTopHotels.map((h: any) => ({
      ...h,
      isHotel: true,
      isProperty: true,
      propertyId: h.id,
    }));
    
    // Other matching properties (not in the matched city's top hotels)
    const topHotelIds = new Set(cityTopHotels.map((h: any) => h.id));
    const otherProperties = dbProperties
      .filter((p: any) => !topHotelIds.has(p.propertyId || p.id))
      .map((d: any) => ({ ...d, isHotel: true }));

    return {
      cities: allCities,
      topHotelsInCity,
      otherProperties,
      matchedCity,
    };
  }, [filteredDestinations, googleCityPredictions, cityTopHotels, matchedCity]);
  
  // Legacy combinedDestinations for backward compatibility
  const combinedDestinations = useMemo(() => {
    const { cities, topHotelsInCity, otherProperties } = groupedSuggestions;
    return [...cities, ...topHotelsInCity, ...otherProperties];
  }, [groupedSuggestions]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleSelectDestination = (dest: any) => {
    // If it's a property from our database, navigate directly to it
    if (dest.isProperty && dest.propertyId) {
      setShowSuggestions(false);
      navigate(`/properties/${dest.propertyId}`);
      return;
    }
    
    // Otherwise, just set the destination name for search
    setDestination(dest.name);
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    const checkIn = checkInDate ? format(checkInDate, 'yyyy-MM-dd') : '';
    const checkOut = checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : '';
    
    onSearch?.({ destination, checkIn, checkOut, guests, adults, children, rooms });
    
    // Save search history if user is authenticated
    if (isAuthenticated && destination.trim()) {
      saveSearchMutation.mutate({
        destination,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        guests: guests || null,
      });
    }
  };

  // Handler for check-in date selection - auto opens check-out
  const handleCheckInSelect = (date: Date | undefined) => {
    setCheckInDate(date);
    if (date) {
      // Close check-in popover first
      setCheckInOpen(false);
      // Use requestAnimationFrame to ensure the close completes before opening check-out
      // This prevents Radix Popover's onOpenChange race condition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setCheckOutOpen(true);
        });
      });
    }
  };

  // Handler for check-out date selection
  const handleCheckOutSelect = (date: Date | undefined) => {
    setCheckOutDate(date);
    if (date) {
      setCheckOutOpen(false);
      // Focus guests input
      setTimeout(() => {
        guestsInputRef.current?.focus();
        guestsInputRef.current?.select();
      }, 50);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full max-w-2xl relative" ref={suggestionsRef}>
        <div className="flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder="Find your stay now"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => destination.length > 0 && setShowSuggestions(true)}
            className="pl-10 h-12 text-base"
            data-testid="input-destination"
          />
        </div>
        <Button size="lg" onClick={handleSearch} data-testid="button-search">
          <Search className="h-5 w-5" />
        </Button>
        
        {/* Swiggy-style grouped suggestions dropdown */}
        {showSuggestions && (groupedSuggestions.cities.length > 0 || groupedSuggestions.topHotelsInCity.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl max-h-[400px] overflow-y-auto" style={{ zIndex: 9999 }}>
            {(isLoading || isGoogleLoading || isLoadingCityHotels) && (
              <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching destinations & hotels...
              </div>
            )}
            
            {/* City Matches Section */}
            {groupedSuggestions.cities.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50">
                  Destinations
                </div>
                {groupedSuggestions.cities.map((dest: any) => (
                  <button
                    key={dest.id}
                    onClick={() => handleSelectDestination(dest)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white flex items-center gap-2"
                    data-testid={`suggestion-city-compact-${dest.id}`}
                  >
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{dest.name}</span>
                      {dest.state && (
                        <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">, {dest.state}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Top Hotels in City Section */}
            {groupedSuggestions.topHotelsInCity.length > 0 && groupedSuggestions.matchedCity && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
                  <span>Top Hotels in {groupedSuggestions.matchedCity}</span>
                </div>
                {groupedSuggestions.topHotelsInCity.map((hotel: any) => (
                  <button
                    key={hotel.id}
                    onClick={() => handleSelectDestination(hotel)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white flex items-center gap-3"
                    data-testid={`suggestion-hotel-compact-${hotel.id}`}
                  >
                    <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{hotel.name}</span>
                        {hotel.rating && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">
                            <Star className="h-3 w-3 fill-current" />
                            {hotel.rating}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Hotel</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
                {/* View all hotels CTA */}
                <button
                  onClick={() => {
                    const city = groupedSuggestions.matchedCity || '';
                    setDestination(city);
                    setShowSuggestions(false);
                    // Trigger search with the matched city directly
                    const checkIn = checkInDate ? format(checkInDate, 'yyyy-MM-dd') : '';
                    const checkOut = checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : '';
                    onSearch?.({ destination: city, checkIn, checkOut, guests, adults, children, rooms });
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-primary/5 text-sm transition-colors text-primary font-medium flex items-center justify-between"
                  data-testid="view-all-hotels-cta"
                >
                  <span>View all hotels in {groupedSuggestions.matchedCity}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {/* Other matching properties */}
            {groupedSuggestions.otherProperties.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50">
                  Matching Hotels
                </div>
                {groupedSuggestions.otherProperties.slice(0, 3).map((dest: any) => (
                  <button
                    key={dest.id || dest.propertyId}
                    onClick={() => handleSelectDestination(dest)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white flex items-center gap-3"
                    data-testid={`suggestion-property-compact-${dest.id || dest.propertyId}`}
                  >
                    <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate">{dest.name}</span>
                      {dest.city && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">{dest.city}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl relative" ref={suggestionsRef}>
      <div className="bg-white rounded-2xl md:rounded-full shadow-lg border border-gray-200 p-2 md:p-1.5 flex flex-col md:flex-row md:items-center w-full gap-2 md:gap-0">
        {/* Destination */}
        <div className="flex-1 px-4 py-2 rounded-xl md:rounded-full hover:bg-gray-50 transition-colors">
          <label className="text-xs font-semibold block mb-0.5 text-gray-700">Where</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search destinations"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => destination.length > 0 && setShowSuggestions(true)}
              className="w-full bg-transparent focus:outline-none text-sm text-gray-900 placeholder:text-gray-400"
              data-testid="input-destination-full"
            />
          </div>
        </div>
        
        {/* Subtle divider - hidden on mobile */}
        {showDates && <div className="hidden md:block h-8 w-px bg-gray-200" />}
      
        {showDates && (
          <>
            {/* Date pickers row - side by side on mobile */}
            <div className="flex flex-row gap-2 md:gap-0 md:contents">
              {/* Check-in Date Picker */}
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                <PopoverTrigger asChild>
                  <div 
                    className="flex-1 px-4 py-2 rounded-xl md:rounded-full cursor-pointer hover:bg-gray-50 transition-colors"
                    data-testid="input-checkin"
                  >
                    <label className="text-xs font-semibold block mb-0.5 text-gray-700 cursor-pointer">Check in</label>
                    <span className={`text-sm ${checkInDate ? 'text-gray-900' : 'text-gray-400'}`}>
                      {checkInDate ? format(checkInDate, 'MMM d') : 'Add dates'}
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkInDate}
                    onSelect={handleCheckInSelect}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {/* Subtle divider - hidden on mobile */}
              <div className="hidden md:block h-8 w-px bg-gray-200" />
              
              {/* Check-out Date Picker */}
              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                <PopoverTrigger asChild>
                  <div 
                    className="flex-1 px-4 py-2 rounded-xl md:rounded-full cursor-pointer hover:bg-gray-50 transition-colors"
                    data-testid="input-checkout"
                  >
                    <label className="text-xs font-semibold block mb-0.5 text-gray-700 cursor-pointer">Check out</label>
                    <span className={`text-sm ${checkOutDate ? 'text-gray-900' : 'text-gray-400'}`}>
                      {checkOutDate ? format(checkOutDate, 'MMM d') : 'Add dates'}
                    </span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOutDate}
                    onSelect={handleCheckOutSelect}
                    disabled={(date) => {
                      const minDate = checkInDate ? addDays(checkInDate, 1) : new Date(new Date().setHours(0, 0, 0, 0));
                      return date < minDate;
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}
        
        {showGuests && (
          <>
            {/* Subtle divider - hidden on mobile */}
            <div className="hidden md:block h-8 w-px bg-gray-200" />
            
            {/* Airbnb-style Guests Popover */}
            <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
              <PopoverTrigger asChild>
                <div 
                  className="flex-1 px-4 py-2 rounded-xl md:rounded-full cursor-pointer hover:bg-gray-50 transition-colors"
                  data-testid="input-guests"
                >
                  <label className="text-xs font-semibold block mb-0.5 text-gray-700 cursor-pointer">Who</label>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm ${guests > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {guests > 0 ? `${adults} Adult${adults !== 1 ? 's' : ''}, ${children} Child${children !== 1 ? 'ren' : ''}` : 'Add guests'}
                    </span>
                    <ChevronDown className="h-3 w-3 text-gray-500" />
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="end">
                <div className="space-y-4">
                  {/* Adults */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">Adults</div>
                      <div className="text-xs text-gray-500">Ages 13 or above</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAdults(Math.max(1, adults - 1))}
                        disabled={adults <= 1}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        data-testid="button-adults-minus"
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      <span className="w-6 text-center font-medium" data-testid="text-adults-count">{adults}</span>
                      <button
                        type="button"
                        onClick={() => setAdults(Math.min(10, adults + 1))}
                        disabled={adults >= 10}
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
                      <div className="font-medium text-gray-900">Children</div>
                      <div className="text-xs text-gray-500">Ages 2–12</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        disabled={children <= 0}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        data-testid="button-children-minus"
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      <span className="w-6 text-center font-medium" data-testid="text-children-count">{children}</span>
                      <button
                        type="button"
                        onClick={() => setChildren(Math.min(6, children + 1))}
                        disabled={children >= 6}
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
                      <div className="font-medium text-gray-900">Rooms</div>
                      <div className="text-xs text-gray-500">Number of rooms</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setRooms(Math.max(1, rooms - 1))}
                        disabled={rooms <= 1}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        data-testid="button-rooms-minus"
                      >
                        <Minus className="h-4 w-4 text-gray-600" />
                      </button>
                      <span className="w-6 text-center font-medium" data-testid="text-rooms-count">{rooms}</span>
                      <button
                        type="button"
                        onClick={() => setRooms(Math.min(5, rooms + 1))}
                        disabled={rooms >= 5}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        data-testid="button-rooms-plus"
                      >
                        <Plus className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
        
        <Button 
          size="lg" 
          className="w-full md:w-auto rounded-xl md:rounded-full px-6 md:ml-1 mt-1 md:mt-0" 
          onClick={handleSearch}
          data-testid="button-search-full"
        >
          {ctaText}
        </Button>
      </div>
      
      {/* Swiggy-style grouped suggestions dropdown */}
      {showSuggestions && (groupedSuggestions.cities.length > 0 || groupedSuggestions.topHotelsInCity.length > 0 || groupedSuggestions.otherProperties.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl max-h-[420px] overflow-y-auto" style={{ zIndex: 9999 }}>
          {(isLoading || isGoogleLoading || isLoadingCityHotels) && (
            <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching destinations & hotels...
            </div>
          )}
          
          {/* City Matches Section */}
          {groupedSuggestions.cities.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50">
                Destinations
              </div>
              {groupedSuggestions.cities.map((dest: any) => (
                <button
                  key={dest.id}
                  onClick={() => handleSelectDestination(dest)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white flex items-center gap-3"
                  data-testid={`suggestion-city-${dest.id}`}
                >
                  <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{dest.name}</span>
                    {dest.state && (
                      <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">, {dest.state}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* Top Hotels in City Section */}
          {groupedSuggestions.topHotelsInCity.length > 0 && groupedSuggestions.matchedCity && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50">
                Top Hotels in {groupedSuggestions.matchedCity}
              </div>
              {groupedSuggestions.topHotelsInCity.map((hotel: any) => (
                <button
                  key={hotel.id}
                  onClick={() => handleSelectDestination(hotel)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white flex items-center gap-3"
                  data-testid={`suggestion-hotel-${hotel.id}`}
                >
                  <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{hotel.name}</span>
                      {hotel.rating && (
                        <span className="flex items-center gap-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          <Star className="h-3 w-3 fill-current" />
                          {hotel.rating}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Hotel in {groupedSuggestions.matchedCity}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
              {/* View all hotels CTA */}
              <button
                onClick={() => {
                  const city = groupedSuggestions.matchedCity || '';
                  setDestination(city);
                  setShowSuggestions(false);
                  // Trigger search with the matched city directly
                  const checkIn = checkInDate ? format(checkInDate, 'yyyy-MM-dd') : '';
                  const checkOut = checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : '';
                  onSearch?.({ destination: city, checkIn, checkOut, guests, adults, children, rooms });
                }}
                className="w-full text-left px-4 py-3 hover:bg-primary/5 text-sm transition-colors text-primary font-medium flex items-center justify-between border-b border-gray-100 dark:border-gray-700"
                data-testid="view-all-hotels-cta-full"
              >
                <span>View all hotels in {groupedSuggestions.matchedCity}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          
          {/* Other matching properties */}
          {groupedSuggestions.otherProperties.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-900/50">
                Matching Hotels
              </div>
              {groupedSuggestions.otherProperties.slice(0, 5).map((dest: any) => (
                <button
                  key={dest.id || dest.propertyId}
                  onClick={() => handleSelectDestination(dest)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white flex items-center gap-3"
                  data-testid={`suggestion-property-${dest.id || dest.propertyId}`}
                >
                  <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{dest.name}</span>
                    {dest.city && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">{dest.city}, {dest.state || 'India'}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
