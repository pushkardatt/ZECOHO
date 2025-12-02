import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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
  const [destination, setDestination] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update state when initial props change (for navigation to search page with params)
  useEffect(() => {
    setDestination(initialDestination);
    setCheckIn(initialCheckIn);
    setCheckOut(initialCheckOut);
    setGuests(initialGuests);
  }, [initialDestination, initialCheckIn, initialCheckOut, initialGuests]);

  // Mutation to save search history
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

  // Fetch destinations with search - use backend filtering for better performance
  const { data: filteredDestinations = [] } = useQuery({
    queryKey: ['destination-search', destination],
    queryFn: async () => {
      const trimmed = destination.trim();
      if (trimmed.length === 0) {
        return [];
      }
      console.log('[SearchBar] Fetching destinations with search:', trimmed);
      const url = `/api/destinations?search=${encodeURIComponent(trimmed)}`;
      console.log('[SearchBar] Request URL:', url);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch destinations');
      const data = await res.json();
      console.log('[SearchBar] Received destinations:', data.length);
      return data;
    },
    staleTime: 0, // Don't cache search results
    enabled: destination.trim().length > 0, // Only run query when there's input
  });

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

  const handleSelectDestination = (name: string) => {
    setDestination(name);
    setShowSuggestions(false);
  };

  const handleSearch = () => {
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

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full max-w-2xl relative" ref={suggestionsRef}>
        <div className="flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
          <Input
            type="text"
            placeholder="Where are you going?"
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
        {showSuggestions && filteredDestinations.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
            {filteredDestinations.map((dest: any) => (
              <button
                key={dest.id}
                onClick={() => handleSelectDestination(dest.name)}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white"
                data-testid={`suggestion-destination-compact-${dest.id}`}
              >
                <MapPin className="inline h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                <span className="font-medium">{dest.name}</span>
                {dest.state && (
                  <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                    {dest.state}, {dest.country || 'India'}
                  </span>
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
              placeholder="Search any city in India..."
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
            <div className="flex-1 px-4 py-2 border-r">
              <label className="text-xs font-semibold block mb-1 text-gray-700">Check in</label>
              <div className="relative">
                <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-6 bg-transparent focus:outline-none text-sm text-gray-900"
                  data-testid="input-checkin"
                />
              </div>
            </div>
            
            <div className={`flex-1 px-4 py-2 ${showGuests ? 'border-r' : ''}`}>
              <label className="text-xs font-semibold block mb-1 text-gray-700">Check out</label>
              <div className="relative">
                <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-6 bg-transparent focus:outline-none text-sm text-gray-900"
                  data-testid="input-checkout"
                />
              </div>
            </div>
          </>
        )}
        
        {showGuests && (
          <div className="flex-1 px-4 py-2">
            <label className="text-xs font-semibold block mb-1 text-gray-700">Guests</label>
            <div className="relative">
              <Users className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
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
      {showSuggestions && filteredDestinations.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
          {filteredDestinations.map((dest: any) => (
            <button
              key={dest.id}
              onClick={() => handleSelectDestination(dest.name)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-gray-900 dark:text-white"
              data-testid={`suggestion-destination-${dest.id}`}
            >
              <MapPin className="inline h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              <span className="font-medium">{dest.name}</span>
              {dest.state && (
                <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
                  {dest.state}, {dest.country || 'India'}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
