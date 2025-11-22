import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, Users } from "lucide-react";
import { useState } from "react";

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

  const handleSearch = () => {
    onSearch?.({ destination, checkIn, checkOut, guests });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full max-w-2xl">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Where are you going?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="pl-10 h-12 text-base"
            data-testid="input-destination"
          />
        </div>
        <Button size="lg" onClick={handleSearch} data-testid="button-search">
          <Search className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-full shadow-lg p-2 flex items-center gap-2 w-full max-w-4xl">
      <div className="flex-1 px-4 py-2 border-r">
        <label className="text-xs font-semibold block mb-1">Destination</label>
        <div className="relative">
          <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Where are you going?"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full pl-6 bg-transparent focus:outline-none text-sm"
            data-testid="input-destination-full"
          />
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
