import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Loader2, Search, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface AddressData {
  fullAddress: string;
  streetAddress: string;
  locality: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
}

interface PropertyLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (
    lat: number, 
    lng: number, 
    source: "manual_pin" | "current_location",
    addressData?: AddressData
  ) => void;
  initialAddress?: Partial<AddressData>;
  disabled?: boolean;
}

export function PropertyLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  initialAddress,
  disabled = false,
}: PropertyLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const initCalledRef = useRef(false);
  const geocoderRef = useRef<any>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastGeocodedRef = useRef<string | null>(null);
  const { toast } = useToast();

  const defaultLat = 20.5937;
  const defaultLng = 78.9629;

  const parseAddressComponents = useCallback((results: any[]): AddressData => {
    const data: AddressData = {
      fullAddress: "",
      streetAddress: "",
      locality: "",
      city: "",
      district: "",
      state: "",
      country: "",
      pincode: "",
    };

    if (results && results.length > 0) {
      data.fullAddress = results[0].formatted_address || "";
      
      const components = results[0].address_components || [];
      const streetParts: string[] = [];
      
      for (const component of components) {
        const types = component.types || [];
        
        if (types.includes("street_number")) {
          streetParts.unshift(component.long_name);
        }
        if (types.includes("route")) {
          streetParts.push(component.long_name);
        }
        if (types.includes("locality")) {
          data.city = component.long_name;
        }
        if (types.includes("administrative_area_level_3")) {
          data.district = component.long_name;
        }
        if (types.includes("administrative_area_level_1")) {
          data.state = component.long_name;
        }
        if (types.includes("country")) {
          data.country = component.long_name;
        }
        if (types.includes("postal_code")) {
          data.pincode = component.long_name;
        }
      }
      
      data.streetAddress = streetParts.join(" ");
    }

    return data;
  }, []);

  const reverseGeocode = useCallback((lat: number, lng: number, source: "manual_pin" | "current_location") => {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    if (lastGeocodedRef.current === cacheKey) {
      return;
    }

    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    geocodeTimeoutRef.current = setTimeout(() => {
      if (!geocoderRef.current || !(window as any).google?.maps) {
        onLocationChange(lat, lng, source);
        return;
      }

      setIsReverseGeocoding(true);
      
      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results: any[], status: string) => {
          setIsReverseGeocoding(false);
          
          if (status === "OK" && results && results.length > 0) {
            const parsedAddress = parseAddressComponents(results);
            setAddressData(parsedAddress);
            lastGeocodedRef.current = cacheKey;
            onLocationChange(lat, lng, source, parsedAddress);
          } else {
            onLocationChange(lat, lng, source);
          }
        }
      );
    }, 300);
  }, [onLocationChange, parseAddressComponents]);

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

      geocoderRef.current = new (window as any).google.maps.Geocoder();

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
          reverseGeocode(newPosition.lat(), newPosition.lng(), "manual_pin");
        }
      });

      map.addListener("click", (e: any) => {
        if (disabled) return;
        const clickedLat = e.latLng.lat();
        const clickedLng = e.latLng.lng();
        marker.setPosition(e.latLng);
        reverseGeocode(clickedLat, clickedLng, "manual_pin");
      });

      if (searchInputRef.current) {
        const autocomplete = new (window as any).google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: "in" },
          fields: ["geometry", "formatted_address", "address_components"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          if (place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            map.setCenter({ lat, lng });
            map.setZoom(15);
            marker.setPosition({ lat, lng });
            
            const parsedAddress = parseAddressComponents([{
              formatted_address: place.formatted_address,
              address_components: place.address_components
            }]);
            setAddressData(parsedAddress);
            setSearchQuery(place.formatted_address || "");
            lastGeocodedRef.current = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            onLocationChange(lat, lng, "manual_pin", parsedAddress);
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
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [disabled, onLocationChange, reverseGeocode, parseAddressComponents]);

  useEffect(() => {
    if (latitude && longitude && mapLoaded) {
      updateMarkerPosition(latitude, longitude);
    }
  }, [latitude, longitude, mapLoaded, updateMarkerPosition]);

  useEffect(() => {
    if (initialAddress && !addressData) {
      setAddressData({
        fullAddress: initialAddress.fullAddress || "",
        streetAddress: initialAddress.streetAddress || "",
        locality: initialAddress.locality || "",
        city: initialAddress.city || "",
        district: initialAddress.district || "",
        state: initialAddress.state || "",
        country: initialAddress.country || "",
        pincode: initialAddress.pincode || "",
      });
    }
  }, [initialAddress, addressData]);

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
        
        setIsLoadingLocation(false);
        reverseGeocode(lat, lng, "current_location");
        
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
        {isReverseGeocoding && (
          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md flex items-center gap-2 shadow-sm border">
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Getting address...</span>
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

      {addressData && (latitude && longitude) && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border" data-testid="address-details">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <Label className="text-sm font-medium">Address Details</Label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {addressData.fullAddress && (
              <div className="md:col-span-2">
                <span className="text-xs text-muted-foreground">Full Address</span>
                <p className="mt-0.5" data-testid="text-full-address">{addressData.fullAddress}</p>
              </div>
            )}
            {addressData.locality && (
              <div>
                <span className="text-xs text-muted-foreground">Locality / Area</span>
                <p className="mt-0.5" data-testid="text-locality">{addressData.locality}</p>
              </div>
            )}
            {addressData.city && (
              <div>
                <span className="text-xs text-muted-foreground">City</span>
                <p className="mt-0.5" data-testid="text-city">{addressData.city}</p>
              </div>
            )}
            {addressData.district && (
              <div>
                <span className="text-xs text-muted-foreground">District</span>
                <p className="mt-0.5" data-testid="text-district">{addressData.district}</p>
              </div>
            )}
            {addressData.state && (
              <div>
                <span className="text-xs text-muted-foreground">State</span>
                <p className="mt-0.5" data-testid="text-state">{addressData.state}</p>
              </div>
            )}
            {addressData.pincode && (
              <div>
                <span className="text-xs text-muted-foreground">Pincode</span>
                <p className="mt-0.5" data-testid="text-pincode">{addressData.pincode}</p>
              </div>
            )}
            {addressData.country && (
              <div>
                <span className="text-xs text-muted-foreground">Country</span>
                <p className="mt-0.5" data-testid="text-country">{addressData.country}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
