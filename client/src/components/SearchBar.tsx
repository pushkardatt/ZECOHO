import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface SearchBarProps {
  onSearch?: (params: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  }) => void;
  compact?: boolean;
}

export function SearchBar({ onSearch, compact = false }: SearchBarProps) {
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch all destinations for autocomplete
  const { data: allDestinations = [] } = useQuery({
    queryKey: ['/api/destinations'],
    queryFn: async () => {
      const res = await fetch('/api/destinations');
      if (!res.ok) throw new Error('Failed to fetch destinations');
      return res.json();
    },
  });

  // Filter destinations based on input
  const filteredDestinations = destination.length > 0
    ? allDestinations.filter((dest: any) =>
        dest.name.toLowerCase().includes(destination.toLowerCase())
      )
    : [];

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
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full max-w-2xl" ref={suggestionsRef}>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
          
          {/* Suggestions dropdown for compact */}
          {showSuggestions && filteredDestinations.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-md z-50 max-h-60 overflow-y-auto">
              {filteredDestinations.map((dest: any) => (
                <button
                  key={dest.id}
                  onClick={() => handleSelectDestination(dest.name)}
                  className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
                  data-testid={`suggestion-destination-compact-${dest.id}`}
                >
                  <MapPin className="inline h-3 w-3 mr-2 text-muted-foreground" />
                  {dest.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button size="lg" onClick={handleSearch} data-testid="button-search">
          <Search className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 w-full max-w-4xl" ref={suggestionsRef}>
      <div className="flex-1 px-4 py-2 border-r relative">
        <label className="text-xs font-semibold block mb-1">Destination</label>
        <div className="relative">
          <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Where are you going?"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setShowSuggestions(e.target.value.length > 0);
            }}
            onFocus={() => destination.length > 0 && setShowSuggestions(true)}
            className="w-full pl-6 bg-transparent focus:outline-none text-sm"
            data-testid="input-destination-full"
          />
          
          {/* Suggestions dropdown */}
          {showSuggestions && filteredDestinations.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-md z-50 max-h-60 overflow-y-auto">
              {filteredDestinations.map((dest: any) => (
                <button
                  key={dest.id}
                  onClick={() => handleSelectDestination(dest.name)}
                  className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
                  data-testid={`suggestion-destination-${dest.id}`}
                >
                  <MapPin className="inline h-3 w-3 mr-2 text-muted-foreground" />
                  {dest.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 px-4 py-2 border-r">
        <label className="text-xs font-semibold block mb-1">Check in</label>
        <div className="relative">
          <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full pl-6 bg-transparent focus:outline-none text-sm"
            data-testid="input-checkin"
          />
        </div>
      </div>
      
      <div className="flex-1 px-4 py-2 border-r">
        <label className="text-xs font-semibold block mb-1">Check out</label>
        <div className="relative">
          <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full pl-6 bg-transparent focus:outline-none text-sm"
            data-testid="input-checkout"
          />
        </div>
      </div>
      
      <div className="flex-1 px-4 py-2">
        <label className="text-xs font-semibold block mb-1">Guests</label>
        <div className="relative">
          <Users className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="number"
            min="1"
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full pl-6 bg-transparent focus:outline-none text-sm"
            data-testid="input-guests"
          />
        </div>
      </div>
      
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
  );
}
