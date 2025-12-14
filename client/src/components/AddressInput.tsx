import { useRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Edit3, MapPinned, Building2, Home, Navigation, Crosshair, X } from "lucide-react";

export interface AddressDetails {
  fullAddress: string;
  plotNo?: string;
  flatNo?: string;
  houseNo?: string;
  streetAddress?: string;
  landmark?: string;
  locality?: string;
  district?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface AddressInputProps {
  value: AddressDetails;
  onChange: (address: AddressDetails) => void;
  placeholder?: string;
  testIdPrefix?: string;
}

export function AddressInput({
  value,
  onChange,
  placeholder = "Search for your property address...",
  testIdPrefix = "address",
}: AddressInputProps) {
  const [searchValue, setSearchValue] = useState(value.fullAddress || "");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tempMarkerPosition, setTempMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchValue(value.fullAddress || "");
    if (value.fullAddress && (value.city || value.state || value.locality)) {
      setShowManualEntry(true);
    }
  }, [value.fullAddress, value.city, value.state, value.locality]);

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).google) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn("Google Maps API key not found, enabling manual entry only");
        setShowManualEntry(true);
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
      script.onerror = () => {
        console.warn("Failed to load Google Maps, enabling manual entry only");
        setShowManualEntry(true);
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

  const handleInputChange = async (inputValue: string) => {
    setSearchValue(inputValue);
    
    if (!inputValue || inputValue.length < 2) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    if (!autocompleteServiceRef.current) {
      return;
    }

    try {
      const results = await autocompleteServiceRef.current.getPlacePredictions({
        input: inputValue,
        componentRestrictions: { country: "in" },
        types: ["address", "establishment", "geocode"],
      });
      setPredictions(results.predictions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setPredictions([]);
    }
  };

  const parseAddressComponents = (addressComponents: any[]): Partial<AddressDetails> => {
    const result: Partial<AddressDetails> = {};
    
    addressComponents.forEach((component: any) => {
      const types = component.types;
      
      if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
        result.locality = component.long_name;
      }
      if (types.includes("locality")) {
        result.city = component.long_name;
      }
      if (types.includes("administrative_area_level_3")) {
        result.district = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        result.state = component.long_name;
      }
      if (types.includes("postal_code")) {
        result.pincode = component.long_name;
      }
      if (types.includes("country")) {
        result.country = component.long_name;
      }
      if (types.includes("route")) {
        result.streetAddress = component.long_name;
      }
      if (types.includes("street_number") || types.includes("premise")) {
        result.houseNo = component.long_name;
      }
    });
    
    return result;
  };

  const handleSelectPlace = async (placeId: string, description: string) => {
    setSearchValue(description);
    setShowSuggestions(false);

    if (!placesServiceRef.current) {
      return;
    }

    try {
      placesServiceRef.current.getDetails(
        { placeId, fields: ["address_components", "formatted_address", "geometry", "name"] },
        (place: any, status: string) => {
          if (status === "OK" && place) {
            const parsedAddress = parseAddressComponents(place.address_components || []);
            
            const newAddress: AddressDetails = {
              ...value,
              fullAddress: place.formatted_address || description,
              ...parsedAddress,
              latitude: place.geometry?.location?.lat() || undefined,
              longitude: place.geometry?.location?.lng() || undefined,
            };
            
            onChange(newAddress);
            setShowManualEntry(true);
          }
        }
      );
    } catch (error) {
      console.error("Error getting place details:", error);
    }
  };

  const buildFullAddress = (address: AddressDetails): string => {
    const addressParts = [
      address.plotNo,
      address.flatNo,
      address.houseNo,
      address.streetAddress,
      address.landmark,
      address.locality,
      address.district,
      address.city,
      address.state,
      address.pincode,
    ].filter(Boolean);
    
    return addressParts.join(", ");
  };

  const handleManualFieldChange = (field: keyof AddressDetails, fieldValue: string) => {
    const newAddress = { ...value, [field]: fieldValue };
    newAddress.fullAddress = buildFullAddress(newAddress);
    setSearchValue(newAddress.fullAddress);
    onChange(newAddress);
  };

  const toggleManualEntry = () => {
    setShowManualEntry(!showManualEntry);
  };

  const handleOpenMapPicker = useCallback(() => {
    setShowMapPicker(true);
    if (value.latitude && value.longitude) {
      setTempMarkerPosition({ lat: value.latitude, lng: value.longitude });
    } else {
      setTempMarkerPosition(null);
    }
  }, [value.latitude, value.longitude]);

  const initializeMap = useCallback(() => {
    if (!mapContainerRef.current || !(window as any).google?.maps) return;

    const defaultCenter = { lat: 20.5937, lng: 78.9629 };
    const initialCenter = value.latitude && value.longitude 
      ? { lat: value.latitude, lng: value.longitude } 
      : defaultCenter;
    const initialZoom = value.latitude && value.longitude ? 15 : 5;

    mapRef.current = new (window as any).google.maps.Map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: false,
    });

    if (value.latitude && value.longitude) {
      markerRef.current = new (window as any).google.maps.Marker({
        position: initialCenter,
        map: mapRef.current,
        draggable: true,
      });
      setTempMarkerPosition(initialCenter);

      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current.getPosition();
        setTempMarkerPosition({ lat: pos.lat(), lng: pos.lng() });
      });
    }

    mapRef.current.addListener('click', (e: any) => {
      const clickedPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setTempMarkerPosition(clickedPos);

      if (markerRef.current) {
        markerRef.current.setPosition(clickedPos);
      } else {
        markerRef.current = new (window as any).google.maps.Marker({
          position: clickedPos,
          map: mapRef.current,
          draggable: true,
        });

        markerRef.current.addListener('dragend', () => {
          const pos = markerRef.current.getPosition();
          setTempMarkerPosition({ lat: pos.lat(), lng: pos.lng() });
        });
      }
    });
  }, [value.latitude, value.longitude]);

  useEffect(() => {
    if (showMapPicker && googleMapsLoaded) {
      setTimeout(initializeMap, 100);
    }
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapRef.current = null;
    };
  }, [showMapPicker, googleMapsLoaded, initializeMap]);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<Partial<AddressDetails>> => {
    return new Promise((resolve) => {
      if (!(window as any).google?.maps?.Geocoder) {
        resolve({});
        return;
      }

      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        if (status === "OK" && results[0]) {
          const parsedAddress = parseAddressComponents(results[0].address_components || []);
          resolve({
            ...parsedAddress,
            fullAddress: results[0].formatted_address,
          });
        } else {
          resolve({});
        }
      });
    });
  }, []);

  const handleConfirmLocation = async () => {
    if (!tempMarkerPosition) return;

    setIsReverseGeocoding(true);
    try {
      const geocodedAddress = await reverseGeocode(tempMarkerPosition.lat, tempMarkerPosition.lng);
      
      const newAddress: AddressDetails = {
        ...value,
        ...geocodedAddress,
        latitude: tempMarkerPosition.lat,
        longitude: tempMarkerPosition.lng,
      };
      
      onChange(newAddress);
      setSearchValue(newAddress.fullAddress || "");
      setShowManualEntry(true);
      setShowMapPicker(false);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleCloseMapPicker = () => {
    setShowMapPicker(false);
    setTempMarkerPosition(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={googleMapsLoaded ? placeholder : "Enter your address manually..."}
              value={searchValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => searchValue && predictions.length > 0 && setShowSuggestions(true)}
              data-testid={`${testIdPrefix}-search`}
              className="pl-10"
            />
          </div>
          {googleMapsLoaded && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleOpenMapPicker}
              title="Pick location on map"
              data-testid={`${testIdPrefix}-pick-on-map`}
            >
              <Crosshair className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleManualEntry}
            title={showManualEntry ? "Hide manual entry" : "Enter address manually"}
            data-testid={`${testIdPrefix}-toggle-manual`}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        </div>

        {predictions.length > 0 && showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
            {predictions.map((prediction) => (
              <button
                key={prediction.place_id}
                type="button"
                onClick={() => handleSelectPlace(prediction.place_id, prediction.description)}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-start gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                data-testid={`${testIdPrefix}-suggestion-${prediction.place_id}`}
              >
                <MapPinned className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
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
            <button
              type="button"
              onClick={() => {
                setShowSuggestions(false);
                setShowManualEntry(true);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-primary transition-colors"
              data-testid={`${testIdPrefix}-enter-manually`}
            >
              <Edit3 className="h-4 w-4" />
              <span className="text-sm font-medium">Enter address manually</span>
            </button>
          </div>
        )}
      </div>

      {showManualEntry && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Building2 className="h-4 w-4" />
              <span>Complete or edit your address details</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-plotNo`} className="text-sm">
                  Plot No.
                </Label>
                <Input
                  id={`${testIdPrefix}-plotNo`}
                  placeholder="e.g., 123"
                  value={value.plotNo || ""}
                  onChange={(e) => handleManualFieldChange("plotNo", e.target.value)}
                  data-testid={`${testIdPrefix}-plotNo`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-flatNo`} className="text-sm">
                  Flat / Apartment No.
                </Label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={`${testIdPrefix}-flatNo`}
                    placeholder="e.g., A-101"
                    value={value.flatNo || ""}
                    onChange={(e) => handleManualFieldChange("flatNo", e.target.value)}
                    className="pl-10"
                    data-testid={`${testIdPrefix}-flatNo`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-houseNo`} className="text-sm">
                  House / Building No.
                </Label>
                <Input
                  id={`${testIdPrefix}-houseNo`}
                  placeholder="e.g., 123"
                  value={value.houseNo || ""}
                  onChange={(e) => handleManualFieldChange("houseNo", e.target.value)}
                  data-testid={`${testIdPrefix}-houseNo`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${testIdPrefix}-streetAddress`} className="text-sm">
                Street Address
              </Label>
              <Input
                id={`${testIdPrefix}-streetAddress`}
                placeholder="e.g., MG Road, Sector 18"
                value={value.streetAddress || ""}
                onChange={(e) => handleManualFieldChange("streetAddress", e.target.value)}
                data-testid={`${testIdPrefix}-streetAddress`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${testIdPrefix}-landmark`} className="text-sm">
                Landmark (Optional)
              </Label>
              <div className="relative">
                <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id={`${testIdPrefix}-landmark`}
                  placeholder="e.g., Near City Mall, Opposite Metro Station"
                  value={value.landmark || ""}
                  onChange={(e) => handleManualFieldChange("landmark", e.target.value)}
                  className="pl-10"
                  data-testid={`${testIdPrefix}-landmark`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-locality`} className="text-sm">
                  Locality / Area
                </Label>
                <Input
                  id={`${testIdPrefix}-locality`}
                  placeholder="e.g., Koramangala, Bandra West"
                  value={value.locality || ""}
                  onChange={(e) => handleManualFieldChange("locality", e.target.value)}
                  data-testid={`${testIdPrefix}-locality`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-city`} className="text-sm">
                  City *
                </Label>
                <Input
                  id={`${testIdPrefix}-city`}
                  placeholder="e.g., Mumbai, Delhi"
                  value={value.city || ""}
                  onChange={(e) => handleManualFieldChange("city", e.target.value)}
                  data-testid={`${testIdPrefix}-city`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-district`} className="text-sm">
                  District
                </Label>
                <Input
                  id={`${testIdPrefix}-district`}
                  placeholder="e.g., South Mumbai"
                  value={value.district || ""}
                  onChange={(e) => handleManualFieldChange("district", e.target.value)}
                  data-testid={`${testIdPrefix}-district`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-state`} className="text-sm">
                  State *
                </Label>
                <Input
                  id={`${testIdPrefix}-state`}
                  placeholder="e.g., Maharashtra"
                  value={value.state || ""}
                  onChange={(e) => handleManualFieldChange("state", e.target.value)}
                  data-testid={`${testIdPrefix}-state`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${testIdPrefix}-pincode`} className="text-sm">
                  PIN Code *
                </Label>
                <Input
                  id={`${testIdPrefix}-pincode`}
                  placeholder="e.g., 400001"
                  value={value.pincode || ""}
                  onChange={(e) => handleManualFieldChange("pincode", e.target.value)}
                  data-testid={`${testIdPrefix}-pincode`}
                  maxLength={6}
                />
              </div>
            </div>

            {value.fullAddress && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Full Address Preview:</p>
                <p className="text-sm font-medium">{value.fullAddress}</p>
                {value.latitude && value.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    GPS: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!showManualEntry && !googleMapsLoaded && (
        <p className="text-sm text-muted-foreground">
          Google Maps not available. Click the edit button to enter your address manually.
        </p>
      )}

      <Dialog open={showMapPicker} onOpenChange={(open) => !open && handleCloseMapPicker()}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crosshair className="h-5 w-5" />
              Pick Your Property Location
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Click on the map to set your property location. You can also drag the marker to adjust.
            </p>
            
            <div 
              ref={mapContainerRef} 
              className="flex-1 rounded-lg border bg-muted min-h-[300px]"
              data-testid={`${testIdPrefix}-map-container`}
            />
            
            {tempMarkerPosition && (
              <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Selected Location</p>
                  <p className="text-xs text-muted-foreground">
                    {tempMarkerPosition.lat.toFixed(6)}, {tempMarkerPosition.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseMapPicker}
              data-testid={`${testIdPrefix}-map-cancel`}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmLocation}
              disabled={!tempMarkerPosition || isReverseGeocoding}
              data-testid={`${testIdPrefix}-map-confirm`}
            >
              {isReverseGeocoding ? (
                <>
                  <span className="animate-spin mr-2">&#9696;</span>
                  Getting Address...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Confirm Location
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
