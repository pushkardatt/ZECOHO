import { useRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitySearchInputProps {
  value: string;
  onChange: (city: string, state?: string, district?: string) => void;
  placeholder?: string;
  testId?: string;
  className?: string;
  disabled?: boolean;
}

interface CityPrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export function CitySearchInput({
  value,
  onChange,
  placeholder = "Search for any city in India...",
  testId = "city-search",
  className,
  disabled = false,
}: CitySearchInputProps) {
  const [searchValue, setSearchValue] = useState(value || "");
  const [predictions, setPredictions] = useState<CityPrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchValue(value || "");
  }, [value]);

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).google) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn("Google Maps API key not found for city search");
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        const checkGoogle = () => {
          if ((window as any).google?.maps?.places) {
            autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
            placesServiceRef.current = new (window as any).google.maps.places.PlacesService(
              document.createElement("div")
            );
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
          placesServiceRef.current = new (window as any).google.maps.places.PlacesService(
            document.createElement("div")
          );
          setGoogleMapsLoaded(true);
        }
      };
      document.head.appendChild(script);
    } else if ((window as any).google?.maps?.places) {
      autocompleteServiceRef.current = new (window as any).google.maps.places.AutocompleteService();
      placesServiceRef.current = new (window as any).google.maps.places.PlacesService(
        document.createElement("div")
      );
      setGoogleMapsLoaded(true);
    }
  }, []);

  const fetchPredictions = useCallback(async (inputValue: string) => {
    if (!inputValue || inputValue.length < 2) {
      setPredictions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    if (!autocompleteServiceRef.current) {
      setIsLoading(false);
      return;
    }

    try {
      const results = await autocompleteServiceRef.current.getPlacePredictions({
        input: inputValue,
        componentRestrictions: { country: "in" },
        types: ["(cities)"],
      });
      setPredictions(results.predictions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching city predictions:", error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (inputValue: string) => {
    setSearchValue(inputValue);
    setIsLoading(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(inputValue);
    }, 300);
  };

  const handleSelectCity = async (placeId: string, description: string) => {
    const cityName = description.split(",")[0].trim();
    setSearchValue(cityName);
    setShowSuggestions(false);

    if (!placesServiceRef.current) {
      onChange(cityName);
      return;
    }

    try {
      placesServiceRef.current.getDetails(
        { placeId, fields: ["address_components", "name"] },
        (place: any, status: string) => {
          if (status === "OK" && place) {
            let state = "";
            let district = "";
            let city = place.name || cityName;

            place.address_components?.forEach((component: any) => {
              const types = component.types;
              if (types.includes("administrative_area_level_1")) {
                state = component.long_name;
              }
              if (types.includes("administrative_area_level_2") && !district) {
                district = component.long_name;
              }
              if (types.includes("administrative_area_level_3") && !district) {
                district = component.long_name;
              }
              if (types.includes("locality")) {
                city = component.long_name;
              }
            });

            onChange(city, state, district);
          } else {
            onChange(cityName);
          }
        }
      );
    } catch (error) {
      console.error("Error getting city details:", error);
      onChange(cityName);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchValue) {
      e.preventDefault();
      if (predictions.length > 0) {
        handleSelectCity(predictions[0].place_id, predictions[0].description);
      } else {
        onChange(searchValue);
        setShowSuggestions(false);
      }
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={googleMapsLoaded ? placeholder : "Type city name..."}
          value={searchValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => searchValue && predictions.length > 0 && setShowSuggestions(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          data-testid={testId}
          className={cn("pl-10 pr-10", className)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {predictions.length > 0 && showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectCity(prediction.place_id, prediction.description)}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
              data-testid={`${testId}-suggestion-${index}`}
            >
              <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-gray-900 dark:text-white">
                  {prediction.structured_formatting?.main_text || prediction.description.split(",")[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {prediction.structured_formatting?.secondary_text || prediction.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {!googleMapsLoaded && searchValue.length >= 2 && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading city search...
        </p>
      )}
    </div>
  );
}
