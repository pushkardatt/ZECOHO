import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Loader2, Search, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PropertyLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number, source: "manual_pin" | "current_location") => void;
  disabled?: boolean;
}

export function PropertyLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  disabled = false,
}: PropertyLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const initCalledRef = useRef(false);
  const { toast } = useToast();

  const defaultLat = 20.5937;
  const defaultLng = 78.9629;

  const updateMarkerPosition = useCallback((lat: number, lng: number) => {
    if (markerRef.current && mapInstanceRef.current) {
      const position = { lat, lng };
      markerRef.current.setPosition(position);
      mapInstanceRef.current.panTo(position);
    }
  }, []);

  useEffect(() => {
    if (initCalledRef.current) return;

    const initMap = () => {
      if (!mapContainerRef.current || !(window as any).google?.maps || initCalledRef.current) return;

      initCalledRef.current = true;

      const initialLat = latitude || defaultLat;
      const initialLng = longitude || defaultLng;
      const position = { lat: initialLat, lng: initialLng };

      const map = new (window as any).google.maps.Map(mapContainerRef.current, {
        center: position,
        zoom: latitude && longitude ? 15 : 5,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      mapInstanceRef.current = map;

      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="#ef4444" stroke="white" stroke-width="3"/>
          <path d="M24 14 L32 22 L32 32 L16 32 L16 22 Z" fill="white"/>
          <rect x="21" y="26" width="6" height="6" fill="#ef4444"/>
        </svg>
      `;

      const marker = new (window as any).google.maps.Marker({
        position: position,
        map: map,
        draggable: !disabled,
        title: "Drag to set property location",
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgIcon),
          scaledSize: new (window as any).google.maps.Size(48, 48),
          anchor: new (window as any).google.maps.Point(24, 24),
        },
      });

      markerRef.current = marker;

      marker.addListener("dragend", () => {
        const newPosition = marker.getPosition();
        if (newPosition) {
          onLocationChange(newPosition.lat(), newPosition.lng(), "manual_pin");
        }
      });

      map.addListener("click", (e: any) => {
        if (disabled) return;
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        marker.setPosition(e.latLng);
        onLocationChange(clickedLat, clickedLng, "manual_pin");
      });

      if (searchInputRef.current) {
        const autocomplete = new (window as any).google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: "in" },
          fields: ["geometry", "formatted_address"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            map.setCenter({ lat, lng });
            map.setZoom(15);
            marker.setPosition({ lat, lng });
            onLocationChange(lat, lng, "manual_pin");
            setSearchQuery(place.formatted_address || "");
          }
        });

        autocompleteRef.current = autocomplete;
      }

      setMapLoaded(true);
    };

    const checkAndLoadGoogleMaps = () => {
      if ((window as any).google?.maps) {
        initMap();
        return;
      }

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        const checkLoaded = setInterval(() => {
          if ((window as any).google?.maps) {
            initMap();
            clearInterval(checkLoaded);
          }
        }, 100);
        setTimeout(() => clearInterval(checkLoaded), 10000);
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    };

    checkAndLoadGoogleMaps();

    return () => {
      if (markerRef.current) {
        try {
          markerRef.current.setMap(null);
        } catch (e) {
        }
      }
    };
  }, [disabled, onLocationChange]);

  useEffect(() => {
    if (latitude && longitude && mapLoaded) {
      updateMarkerPosition(latitude, longitude);
    }
  }, [latitude, longitude, mapLoaded, updateMarkerPosition]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      toast({
        title: "Location Not Supported",
        description: "Your browser does not support geolocation",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (mapInstanceRef.current && markerRef.current) {
          const newPosition = { lat, lng };
          mapInstanceRef.current.setCenter(newPosition);
          mapInstanceRef.current.setZoom(17);
          markerRef.current.setPosition(newPosition);
        }
        
        onLocationChange(lat, lng, "current_location");
        setIsLoadingLocation(false);
        
        toast({
          title: "Location Set",
          description: "Your current location has been set as the property location",
        });
      },
      (error) => {
        setIsLoadingLocation(false);
        let errorMessage = "Unable to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Please allow location access in your browser settings";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        
        setLocationError(errorMessage);
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            disabled={disabled}
            data-testid="input-location-search"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={disabled || isLoadingLocation}
          className="whitespace-nowrap"
          data-testid="button-use-current-location"
        >
          {isLoadingLocation ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          Use My Current Location
        </Button>
      </div>

      {locationError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{locationError}</p>
        </div>
      )}

      <div className="w-full h-[350px] rounded-xl relative border" data-testid="location-picker-map">
        <div ref={mapContainerRef} className="w-full h-full rounded-xl" />
        {!mapLoaded && (
          <div className="absolute inset-0 bg-muted rounded-xl flex items-center justify-center">
            <div className="text-muted-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5 animate-pulse" />
              Loading map...
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Latitude</Label>
          <div className="mt-1 p-2 bg-muted rounded-md text-sm font-mono" data-testid="text-latitude">
            {latitude ? latitude.toFixed(6) : "Not set"}
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Longitude</Label>
          <div className="mt-1 p-2 bg-muted rounded-md text-sm font-mono" data-testid="text-longitude">
            {longitude ? longitude.toFixed(6) : "Not set"}
          </div>
        </div>
      </div>

      {!latitude || !longitude ? (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Property location is required. Use the search box, click on the map, or use your current location.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
          <MapPin className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Location set successfully. You can adjust by dragging the marker or searching for a new address.
          </p>
        </div>
      )}
    </div>
  );
}
