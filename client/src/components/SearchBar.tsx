import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, MapPin, Calendar as CalendarIcon, Users, Loader2, Building2 } from "lucide-react";
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
  }) => void;
  compact?: boolean;
  showDates?: boolean;
  showGuests?: boolean;
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleCityPredictions, setGoogleCityPredictions] = useState<GooglePlacePrediction[]>([]);
  const [googleHotelPredictions, setGoogleHotelPredictions] = useState<GooglePlacePrediction[]>([]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const guestsInputRef = useRef<HTMLInputElement>(null);
  
  // Popover open states for custom calendar
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  
  const debouncedDestination = useDebounce(destination.trim(), 300);

  useEffect(() => {
    setDestination(initialDestination);
    setCheckInDate(initialCheckIn ? new Date(initialCheckIn) : undefined);
    setCheckOutDate(initialCheckOut ? new Date(initialCheckOut) : undefined);
    setGuests(initialGuests);
  }, [initialDestination, initialCheckIn, initialCheckOut, initialGuests]);

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

  const combinedDestinations = useMemo(() => {
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

    // Add hotels/lodging from Google Places (only if not already in our DB properties)
    const dbPropertyNames = new Set(dbProperties.map((p: any) => p.name.toLowerCase()));
    const googleHotels = googleHotelPredictions
      .filter(p => !dbPropertyNames.has(p.structured_formatting?.main_text?.toLowerCase() || ""))
      .slice(0, 3) // Limit to top 3 Google hotels since we have our own
      .map(p => ({
        id: `google-hotel-${p.place_id}`,
        name: p.structured_formatting?.main_text || p.description.split(",")[0],
        state: p.structured_formatting?.secondary_text || "",
        isGoogle: true,
        isHotel: true,
        isProperty: false,
      }));

    // Combine: DB properties first (hotels from our system), then destinations, then Google cities, then Google hotels
    return [
      ...dbProperties.map((d: any) => ({ ...d, isHotel: true })),
      ...dbDestinations.map((d: any) => ({ ...d, isHotel: false, isProperty: false })),
      ...googleCities,
      ...googleHotels,
    ];
  }, [filteredDestinations, googleCityPredictions, googleHotelPredictions]);

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
    
    onSearch?.({ destination, checkIn, checkOut, guests });
    
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
      // Close check-in popover and open check-out
      setCheckInOpen(false);
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setCheckOutOpen(true);
      }, 50);
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
        
        {/* Suggestions dropdown - positioned absolutely relative to outer container */}
        {showSuggestions && combinedDestinations.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
            {(isLoading || isGoogleLoading) && (
              <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching destinations & hotels...
              </div>
            )}
            {combinedDestinations.map((dest: any) => (
              <button
                key={dest.id}
                onClick={() => handleSelectDestination(dest)}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white"
                data-testid={`suggestion-destination-compact-${dest.id}`}
              >
                {dest.isHotel ? (
                  <Building2 className="inline h-4 w-4 mr-2 text-primary" />
                ) : (
                  <MapPin className="inline h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                )}
                <span className="font-medium">{dest.name}</span>
                {dest.state && (
                  <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                    {dest.state}{dest.isGoogle && !dest.isHotel ? '' : dest.isHotel ? '' : `, ${dest.country || 'India'}`}
                  </span>
                )}
                {dest.isHotel && (
                  <span className="ml-2 text-xs text-primary font-medium">Hotel</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl relative" ref={suggestionsRef}>
      <div className="bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 w-full">
        <div className={`flex-1 px-4 py-2 ${(showDates || showGuests) ? 'border-r' : ''}`}>
          <label className="text-xs font-semibold block mb-1 text-gray-700">Destination</label>
          <div className="relative">
            <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Find your stay now"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => destination.length > 0 && setShowSuggestions(true)}
              className="w-full pl-6 bg-transparent focus:outline-none text-sm text-gray-900"
              data-testid="input-destination-full"
            />
          </div>
        </div>
      
        {showDates && (
          <>
            {/* Check-in Date Picker */}
            <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
              <PopoverTrigger asChild>
                <div 
                  className="flex-1 px-4 py-2 border-r cursor-pointer hover:bg-gray-50 transition-colors"
                  data-testid="input-checkin"
                >
                  <label className="text-xs font-semibold block mb-1 text-gray-700 cursor-pointer">Check in</label>
                  <div className="relative flex items-center">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className={`text-sm ${checkInDate ? 'text-gray-900' : 'text-gray-500'}`}>
                      {checkInDate ? format(checkInDate, 'MMM d, yyyy') : 'Add date'}
                    </span>
                  </div>
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
            
            {/* Check-out Date Picker */}
            <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
              <PopoverTrigger asChild>
                <div 
                  className={`flex-1 px-4 py-2 ${showGuests ? 'border-r' : ''} cursor-pointer hover:bg-gray-50 transition-colors`}
                  data-testid="input-checkout"
                >
                  <label className="text-xs font-semibold block mb-1 text-gray-700 cursor-pointer">Check out</label>
                  <div className="relative flex items-center">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className={`text-sm ${checkOutDate ? 'text-gray-900' : 'text-gray-500'}`}>
                      {checkOutDate ? format(checkOutDate, 'MMM d, yyyy') : 'Add date'}
                    </span>
                  </div>
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
          </>
        )}
        
        {showGuests && (
          <div className="flex-1 px-4 py-2">
            <label className="text-xs font-semibold block mb-1 text-gray-700">Guests</label>
            <div className="relative">
              <Users className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={guestsInputRef}
                type="number"
                min="1"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full pl-6 bg-transparent focus:outline-none text-sm text-gray-900"
                data-testid="input-guests"
              />
            </div>
          </div>
        )}
        
        <Button 
          size="lg" 
          className="rounded-full px-8" 
          onClick={handleSearch}
          data-testid="button-search-full"
        >
          <Search className="h-5 w-5 mr-2" />
          Search
        </Button>
      </div>
      
      {/* Suggestions dropdown - positioned absolutely relative to outer container */}
      {showSuggestions && combinedDestinations.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
          {(isLoading || isGoogleLoading) && (
            <div className="px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching destinations & hotels...
            </div>
          )}
          {combinedDestinations.map((dest: any) => (
            <button
              key={dest.id}
              onClick={() => handleSelectDestination(dest)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white"
              data-testid={`suggestion-destination-${dest.id}`}
            >
              {dest.isHotel ? (
                <Building2 className="inline h-4 w-4 mr-2 text-primary" />
              ) : (
                <MapPin className="inline h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              )}
              <span className="font-medium">{dest.name}</span>
              {dest.state && (
                <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                  {dest.state}{dest.isGoogle && !dest.isHotel ? '' : dest.isHotel ? '' : `, ${dest.country || 'India'}`}
                </span>
              )}
              {dest.isHotel && (
                <span className="ml-2 text-xs text-primary font-medium">Hotel</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
