import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { OwnerLayout } from "@/components/OwnerLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Save,
  Eye,
  AlertTriangle,
  CheckCircle,
  Pause,
  Ban,
  Settings,
  Bed,
  Edit,
  MapPin,
  RefreshCw,
  FileX,
  IndianRupee,
  Wifi,
  Tv,
  Wind,
  Refrigerator,
  Coffee,
  ShieldCheck,
  Sunset,
  Flame,
  Users,
  ArrowUpDown,
  Clock,
  Info,
  Building2,
  Star,
  Phone,
  Mail,
  MessageSquare,
  LayoutDashboard,
  Shield,
  ClipboardList,
  Sparkles,
  Camera,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PropertyLocationPicker,
  type AddressData,
} from "@/components/PropertyLocationPicker";
import { PropertyMap } from "@/components/PropertyMap";
import {
  PropertyImageUploader,
  defaultCategorizedImages,
} from "@/components/PropertyImageUploader";
import type {
  Property,
  AvailabilityOverride,
  RoomType,
  CategorizedPropertyImages,
} from "@shared/schema";
import { PriceCalendar } from "@/components/PriceCalendar";
import { Collapsible } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function OwnerPropertyManage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("property-details");

  const {
    data: property,
    isLoading,
    isError,
  } = useQuery<Property>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  const {
    data: overrides = [],
    isLoading: overridesLoading,
    isError: overridesError,
    isFetching: overridesFetching,
    refetch: refetchOverrides,
  } = useQuery<AvailabilityOverride[]>({
    queryKey: ["/api/properties", id, "availability-overrides"],
    enabled: !!id,
  });

  const {
    data: roomTypes = [],
    isLoading: roomTypesLoading,
    isError: roomTypesError,
    isFetching: roomTypesFetching,
    refetch: refetchRoomTypes,
  } = useQuery<RoomType[]>({
    queryKey: ["/api/properties", id, "rooms"],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <OwnerLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </OwnerLayout>
    );
  }

  if (isError || !property) {
    return (
      <OwnerLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">
            {isError ? "Could not load property" : "Property not found"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {isError
              ? "Please check your connection or try again. Your session may have expired."
              : "This property could not be found."}
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Link href="/owner/properties">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Properties
              </Button>
            </Link>
          </div>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-property-manage">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/owner/properties">
              <Button
                variant="ghost"
                size="icon"
                data-testid="back-to-properties"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-xl font-semibold">{property.title}</h2>
              <p className="text-sm text-muted-foreground">
                Manage your property settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PropertyStatusBadge status={property.status} />
            <Link href={`/properties/${id}`}>
              <Button
                variant="outline"
                size="sm"
                data-testid="view-public-listing"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Listing
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:grid md:grid-cols-7 md:w-full md:max-w-5xl gap-1">
              <TabsTrigger
                value="property-details"
                data-testid="tab-property-details"
                className="flex-shrink-0 whitespace-nowrap px-3"
              >
                <Building2 className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Property Details</span>
                <span className="sm:hidden">Details</span>
              </TabsTrigger>
              <TabsTrigger
                value="room-type-pricing"
                data-testid="tab-room-type-pricing"
                className="flex-shrink-0 whitespace-nowrap px-3"
              >
                <IndianRupee className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Room Type and Pricing</span>
                <span className="sm:hidden">Rooms</span>
              </TabsTrigger>
              <TabsTrigger
                value="policy"
                data-testid="tab-policy"
                className="flex-shrink-0 whitespace-nowrap px-3"
              >
                <Shield className="h-4 w-4 mr-1 md:mr-2" />
                <span>Policy</span>
              </TabsTrigger>
              <TabsTrigger
                value="amenities"
                data-testid="tab-amenities"
                className="flex-shrink-0 whitespace-nowrap px-3"
              >
                <Sparkles className="h-4 w-4 mr-1 md:mr-2" />
                <span>Amenities</span>
              </TabsTrigger>
              <TabsTrigger
                value="availability"
                data-testid="tab-availability"
                className="flex-shrink-0 whitespace-nowrap px-3"
              >
                <CalendarIcon className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Availability</span>
                <span className="sm:hidden">Avail</span>
              </TabsTrigger>
              <TabsTrigger
                value="photos"
                data-testid="tab-photos"
                className="flex-shrink-0 whitespace-nowrap px-3"
              >
                <Camera className="h-4 w-4 mr-1 md:mr-2" />
                <span>Photos</span>
              </TabsTrigger>
              <TabsTrigger
                value="status"
                data-testid="tab-status"
                className="flex-shrink-0 whitespace-nowrap px-3"
              >
                <Settings className="h-4 w-4 mr-1 md:mr-2" />
                <span>Status</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="property-details" className="mt-6">
            <div className="space-y-6">
              <PropertyDetailsSection property={property} />
              <LocationSection property={property} />
            </div>
          </TabsContent>

          <TabsContent value="room-type-pricing" className="mt-6">
            {roomTypesError ? (
              <TabLoadError
                message="Couldn't load your room types. Please retry."
                onRetry={() => refetchRoomTypes()}
                isRetrying={roomTypesFetching}
              />
            ) : (
              <div className="space-y-6">
                <RoomsSection
                  propertyId={id!}
                  roomTypes={roomTypes}
                  isLoading={roomTypesLoading}
                />
                <PriceCalendar propertyId={id!} roomTypes={roomTypes} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="policy" className="mt-6">
            <PolicySection property={property} />
          </TabsContent>

          <TabsContent value="amenities" className="mt-6">
            {roomTypesError && (
              <TabLoadError
                message="Couldn't load your room types — room-level amenities can't be edited until you retry."
                onRetry={() => refetchRoomTypes()}
                isRetrying={roomTypesFetching}
              />
            )}
            <AmenitiesSection
              property={property}
              roomTypes={roomTypes}
              roomTypesUnavailable={roomTypesError}
            />
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            {overridesError || roomTypesError ? (
              <TabLoadError
                message="Couldn't load availability data. Please retry."
                onRetry={() => {
                  if (overridesError) refetchOverrides();
                  if (roomTypesError) refetchRoomTypes();
                }}
                isRetrying={overridesFetching || roomTypesFetching}
              />
            ) : (
              <AvailabilitySection
                propertyId={id!}
                overrides={overrides}
                isLoading={overridesLoading}
                roomTypes={roomTypes}
              />
            )}
          </TabsContent>

          <TabsContent value="photos" className="mt-6">
            {roomTypesError && (
              <TabLoadError
                message="Couldn't load your room types — room-level photos can't be edited until you retry."
                onRetry={() => refetchRoomTypes()}
                isRetrying={roomTypesFetching}
              />
            )}
            <PhotosSection
              property={property}
              roomTypes={roomTypes}
              roomTypesUnavailable={roomTypesError}
            />
          </TabsContent>

          <TabsContent value="status" className="mt-6">
            <StatusSection property={property} />
          </TabsContent>
        </Tabs>
      </div>
    </OwnerLayout>
  );
}

function TabLoadError({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying?: boolean;
}) {
  return (
    <Alert variant="destructive" className="my-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
        <span>{message}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          data-testid="button-tab-retry"
        >
          <RefreshCw
            className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`}
          />
          {isRetrying ? "Retrying…" : "Retry"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function PropertyStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    published: { variant: "default", label: "Published" },
    draft: { variant: "secondary", label: "Draft" },
    pending: { variant: "outline", label: "Pending Review" },
    paused: { variant: "outline", label: "Paused" },
    deactivated: { variant: "destructive", label: "Deactivated" },
  };
  const { variant, label } = config[status] || {
    variant: "secondary",
    label: status,
  };
  return <Badge variant={variant}>{label}</Badge>;
}

function LocationSection({ property }: { property: Property }) {
  const { toast } = useToast();
  const propertyIdStr = String(property.id);
  const [latitude, setLatitude] = useState<number | null>(
    property.latitude ? Number(property.latitude) : null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    property.longitude ? Number(property.longitude) : null,
  );
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [geoSource, setGeoSource] = useState<
    "manual_pin" | "current_location" | null
  >(null);

  const hasLocation = latitude && longitude;

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      return apiRequest("PATCH", `/api/properties/${property.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyIdStr],
      });
      toast({
        title: "Location Saved Successfully",
        description: "Your property location and address have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLocationChange = (
    lat: number,
    lng: number,
    source: "manual_pin" | "current_location",
    address?: AddressData,
  ) => {
    setLatitude(lat);
    setLongitude(lng);
    setGeoSource(source);
    if (address) {
      setAddressData(address);
    }
  };

  const handleSaveLocation = () => {
    if (!latitude || !longitude) {
      toast({
        title: "Location Required",
        description:
          "Please set the property location using the map picker, address search, or your current location.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      latitude: latitude,
      longitude: longitude,
      geoSource: geoSource || "manual_pin",
      geoVerified: true,
      address: addressData?.fullAddress || null,
      propStreetAddress: addressData?.streetAddress || null,
      propLocality: addressData?.locality || null,
      propCity: addressData?.city || null,
      propDistrict: addressData?.district || null,
      propState: addressData?.state || null,
      propPincode: addressData?.pincode || null,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              To avoid rejection, please enter the address as per the
              registration or lease document.
            </p>
          </div>
        </CardContent>
      </Card>

      {!hasLocation && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  Property Location Required
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  Your property cannot be published without GPS coordinates.
                  Please use the address search, click on the map, or use your
                  current location to set the property's exact position.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Property Location
          </CardTitle>
          <CardDescription>
            Set your property's exact location for guests to find you easily.
            You can search for an address, use your current location, or
            click/drag on the map.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <PropertyLocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
            initialAddress={{
              fullAddress: property.address || "",
              streetAddress: property.propStreetAddress || "",
              locality: property.propLocality || "",
              city: property.propCity || "",
              district: property.propDistrict || "",
              state: property.propState || "",
              pincode: property.propPincode || "",
              country: "India",
            }}
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={handleSaveLocation}
              disabled={updateMutation.isPending || !hasLocation}
              data-testid="button-save-location"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Location"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AvailabilitySection({
  propertyId,
  overrides,
  isLoading,
  roomTypes = [],
}: {
  propertyId: string;
  overrides: AvailabilityOverride[];
  isLoading: boolean;
  roomTypes?: RoomType[];
}) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [overrideType, setOverrideType] = useState<string>("hold");
  const [reason, setReason] = useState("");
  const [availableRooms, setAvailableRooms] = useState<string>("");
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: async (data: {
      overrideType: string;
      startDate: Date;
      endDate: Date;
      reason?: string;
      availableRooms?: number;
      roomTypeId?: string;
    }) => {
      return apiRequest(
        "POST",
        `/api/properties/${propertyId}/availability-overrides`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "availability-overrides"],
      });
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
      setAvailableRooms("");
      setSelectedRoomTypeId("");
      toast({
        title: "Dates Blocked",
        description: "The selected dates have been marked as unavailable.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to block dates.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      return apiRequest(
        "DELETE",
        `/api/properties/${propertyId}/availability-overrides/${overrideId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "availability-overrides"],
      });
      toast({
        title: "Block Removed",
        description: "The date block has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove date block.",
        variant: "destructive",
      });
    },
  });

  const handleAddBlock = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Select Dates",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      overrideType,
      startDate,
      endDate,
      reason: reason || undefined,
      availableRooms: availableRooms ? parseInt(availableRooms) : undefined,
      roomTypeId: selectedRoomTypeId || undefined,
    });
  };

  // Get room type name by id for display
  const getRoomTypeName = (roomTypeId: string | null | undefined) => {
    if (!roomTypeId) return "All Rooms";
    const roomType = roomTypes.find((rt) => rt.id === roomTypeId);
    return roomType ? roomType.name : "Unknown Room Type";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "hold":
        return "Temporary Hold";
      case "sold_out":
        return "Sold Out";
      case "maintenance":
        return "Maintenance";
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (
    type: string,
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "hold":
        return "outline";
      case "sold_out":
        return "destructive";
      case "maintenance":
        return "secondary";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Block Dates</CardTitle>
          <CardDescription>
            Mark dates as unavailable for bookings. Use this for maintenance,
            personal use, or when rooms are sold through other channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    data-testid="select-start-date"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    data-testid="select-end-date"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {endDate ? format(endDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < (startDate || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Block Type</Label>
              <Select value={overrideType} onValueChange={setOverrideType}>
                <SelectTrigger data-testid="select-block-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hold">Temporary Hold</SelectItem>
                  <SelectItem value="sold_out">Sold Out</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room Type (optional)</Label>
              <Select
                value={selectedRoomTypeId || "all"}
                onValueChange={(val) =>
                  setSelectedRoomTypeId(val === "all" ? "" : val)
                }
              >
                <SelectTrigger data-testid="select-room-type-block">
                  <SelectValue placeholder="All rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty to block all room types
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="availableRooms">Available Rooms (optional)</Label>
              <Input
                id="availableRooms"
                type="number"
                min="0"
                value={availableRooms}
                onChange={(e) => setAvailableRooms(e.target.value)}
                placeholder="Leave empty for full block"
                data-testid="input-available-rooms"
              />
              <p className="text-xs text-muted-foreground">
                Set to 0 to block all rooms. Leave empty for complete
                unavailability.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Rooms booked through travel agent, Personal use"
                rows={2}
                data-testid="input-block-reason"
              />
            </div>
          </div>

          <Button
            onClick={handleAddBlock}
            disabled={createMutation.isPending || !startDate || !endDate}
            data-testid="add-date-block"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createMutation.isPending ? "Adding..." : "Add Date Block"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Blocked Dates</CardTitle>
          <CardDescription>
            View and manage your blocked date ranges
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : overrides.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No blocked dates. All dates are available for booking.
            </p>
          ) : (
            <div className="space-y-2">
              {overrides.map((override) => (
                <div
                  key={override.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`override-${override.id}`}
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge variant={getTypeBadgeVariant(override.overrideType)}>
                      {getTypeLabel(override.overrideType)}
                    </Badge>
                    <Badge variant="outline">
                      {getRoomTypeName(override.roomTypeId)}
                    </Badge>
                    {override.availableRooms !== null &&
                      override.availableRooms !== undefined && (
                        <Badge variant="secondary">
                          {override.availableRooms} rooms available
                        </Badge>
                      )}
                    <div>
                      <p className="font-medium">
                        {format(new Date(override.startDate), "MMM d, yyyy")} -{" "}
                        {format(new Date(override.endDate), "MMM d, yyyy")}
                      </p>
                      {override.reason && (
                        <p className="text-sm text-muted-foreground">
                          {override.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(override.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`delete-override-${override.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusSection({ property }: { property: Property }) {
  const { toast } = useToast();
  const [showDeactivationDialog, setShowDeactivationDialog] = useState(false);
  const [showReactivationDialog, setShowReactivationDialog] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [reactivationReason, setReactivationReason] = useState("");
  const [deactivationRequestType, setDeactivationRequestType] = useState<
    "deactivate" | "delete"
  >("deactivate");

  // Check if there's a pending deactivation request
  const pendingRequestQuery = useQuery({
    queryKey: ["/api/properties", property.id, "deactivation-request"],
    queryFn: async () => {
      const res = await fetch(
        `/api/properties/${property.id}/deactivation-request`,
        { credentials: "include" },
      );
      if (!res.ok) {
        // 404 = no pending request (legitimate state). Other errors = real failure.
        if (res.status === 404) return null;
        throw new Error("Failed to load deactivation status");
      }
      return res.json();
    },
  });
  const pendingRequest = pendingRequestQuery.data;
  const isLoadingRequest = pendingRequestQuery.isLoading;

  const updateStatusMutation = useMutation({
    mutationFn: async (action: "pause" | "resume") => {
      return apiRequest(
        "PATCH",
        `/api/properties/${property.id}/${action}`,
        {},
      );
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/properties"] });
      toast({
        title: "Status Updated",
        description: `Property has been ${action === "pause" ? "paused" : action === "resume" ? "resumed" : "deactivated"}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update property status.",
        variant: "destructive",
      });
    },
  });

  const submitDeactivationRequestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        `/api/properties/${property.id}/deactivation-request`,
        {
          reason: deactivationReason,
          requestType: deactivationRequestType,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id, "deactivation-request"],
      });
      setShowDeactivationDialog(false);
      setDeactivationReason("");
      toast({
        title: "Request Submitted",
        description:
          "Your deactivation request has been submitted. An admin will review it shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit deactivation request.",
        variant: "destructive",
      });
    },
  });

  const cancelDeactivationRequestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "DELETE",
        `/api/properties/${property.id}/deactivation-request`,
        {},
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id, "deactivation-request"],
      });
      toast({
        title: "Request Cancelled",
        description: "Your request has been cancelled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel request.",
        variant: "destructive",
      });
    },
  });

  const submitReactivationRequestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "POST",
        `/api/properties/${property.id}/deactivation-request`,
        {
          reason: reactivationReason,
          requestType: "reactivate",
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id, "deactivation-request"],
      });
      setShowReactivationDialog(false);
      setReactivationReason("");
      toast({
        title: "Request Submitted",
        description:
          "Your reactivation request has been submitted. An admin will review it shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit reactivation request.",
        variant: "destructive",
      });
    },
  });

  // FIX 5: surface load failure for the deactivation-request check.
  // Showing the false-empty UI here risks the owner submitting a duplicate request.
  if (pendingRequestQuery.isError) {
    return (
      <TabLoadError
        message="Couldn't load deactivation status. Please retry."
        onRetry={() => pendingRequestQuery.refetch()}
        isRetrying={pendingRequestQuery.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property Status</CardTitle>
          <CardDescription>
            Control your property's visibility and booking availability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div
                className={`p-2 rounded-full ${
                  property.status === "published"
                    ? "bg-green-100 text-green-600"
                    : property.status === "paused"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                {property.status === "published" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : property.status === "paused" ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Ban className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  Current Status:{" "}
                  <span className="capitalize">{property.status}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {property.status === "published"
                    ? "Your property is visible and accepting bookings"
                    : property.status === "paused"
                      ? "Your property is hidden from search results"
                      : property.status === "draft"
                        ? "Complete your listing to publish"
                        : "Your property is not accepting bookings"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {property.status === "published" && (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Pause className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Pause Bookings</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Temporarily hide your property from search results.
                        Existing bookings won't be affected.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate("pause")}
                        disabled={updateStatusMutation.isPending}
                        data-testid="pause-property"
                      >
                        Pause Property
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {property.status === "paused" && (
              <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Resume Bookings</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Make your property visible again and start accepting new
                        bookings.
                      </p>
                      {!property.cancellationPolicyConfigured && (
                        <p className="text-sm text-amber-600 mb-3">
                          You must configure your cancellation policy in the
                          Cancellation tab before resuming.
                        </p>
                      )}
                      <Button
                        onClick={() => updateStatusMutation.mutate("resume")}
                        disabled={
                          updateStatusMutation.isPending ||
                          !property.cancellationPolicyConfigured
                        }
                        data-testid="resume-property"
                      >
                        Resume Property
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {property.status !== "deactivated" && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      {pendingRequest ? (
                        <>
                          <h4 className="font-medium">
                            {pendingRequest.requestType === "reactivate"
                              ? "Reactivation"
                              : "Deactivation"}{" "}
                            Request Pending
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Your request to{" "}
                            {pendingRequest.requestType === "delete"
                              ? "delete"
                              : pendingRequest.requestType === "reactivate"
                                ? "reactivate"
                                : "deactivate"}{" "}
                            this property is awaiting admin approval.
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Submitted:{" "}
                            {new Date(
                              pendingRequest.createdAt,
                            ).toLocaleDateString()}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() =>
                              cancelDeactivationRequestMutation.mutate()
                            }
                            disabled={
                              cancelDeactivationRequestMutation.isPending
                            }
                            data-testid="cancel-deactivation-request"
                          >
                            Cancel Request
                          </Button>
                        </>
                      ) : (
                        <>
                          <h4 className="font-medium">Request Deactivation</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Submit a request to deactivate or delete your
                            property. An admin will review and approve your
                            request.
                          </p>
                          <Button
                            variant="destructive"
                            onClick={() => setShowDeactivationDialog(true)}
                            disabled={isLoadingRequest}
                            data-testid="request-deactivation-property"
                          >
                            Request Deactivation
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {property.status === "deactivated" && (
              <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      {pendingRequest &&
                      pendingRequest.requestType === "reactivate" ? (
                        <>
                          <h4 className="font-medium">
                            Reactivation Request Pending
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Your request to reactivate this property is awaiting
                            admin approval.
                          </p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Submitted:{" "}
                            {new Date(
                              pendingRequest.createdAt,
                            ).toLocaleDateString()}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() =>
                              cancelDeactivationRequestMutation.mutate()
                            }
                            disabled={
                              cancelDeactivationRequestMutation.isPending
                            }
                            data-testid="cancel-reactivation-request"
                          >
                            Cancel Request
                          </Button>
                        </>
                      ) : (
                        <>
                          <h4 className="font-medium">Request Reactivation</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Your property is currently deactivated. Submit a
                            request to reactivate it and start accepting
                            bookings again.
                          </p>
                          <Button
                            onClick={() => setShowReactivationDialog(true)}
                            disabled={isLoadingRequest}
                            data-testid="request-reactivation-property"
                          >
                            Request Reactivation
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={showDeactivationDialog}
        onOpenChange={setShowDeactivationDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Property Deactivation</DialogTitle>
            <DialogDescription>
              Please provide details about why you want to deactivate or delete
              this property. An admin will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Request Type</label>
              <select
                value={deactivationRequestType}
                onChange={(e) =>
                  setDeactivationRequestType(
                    e.target.value as "deactivate" | "delete",
                  )
                }
                className="w-full p-2 border rounded-md"
                data-testid="select-deactivation-type"
              >
                <option value="deactivate">
                  Deactivate (can be reversed later)
                </option>
                <option value="delete">Delete Permanently</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason (minimum 10 characters)
              </label>
              <Textarea
                placeholder="Please explain why you want to deactivate or delete this property..."
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
                rows={4}
                data-testid="input-deactivation-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeactivationDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitDeactivationRequestMutation.mutate()}
              disabled={
                deactivationReason.trim().length < 10 ||
                submitDeactivationRequestMutation.isPending
              }
              data-testid="submit-deactivation-request"
            >
              {submitDeactivationRequestMutation.isPending
                ? "Submitting..."
                : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showReactivationDialog}
        onOpenChange={setShowReactivationDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Property Reactivation</DialogTitle>
            <DialogDescription>
              Please provide details about why you want to reactivate this
              property. An admin will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason (minimum 10 characters)
              </label>
              <Textarea
                placeholder="Please explain why you want to reactivate this property..."
                value={reactivationReason}
                onChange={(e) => setReactivationReason(e.target.value)}
                rows={4}
                data-testid="input-reactivation-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReactivationDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitReactivationRequestMutation.mutate()}
              disabled={
                reactivationReason.trim().length < 10 ||
                submitReactivationRequestMutation.isPending
              }
              data-testid="submit-reactivation-request"
            >
              {submitReactivationRequestMutation.isPending
                ? "Submitting..."
                : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CancellationSection({ property }: { property: Property }) {
  // Check if cancellation policy has been explicitly configured by the owner
  const isPolicyConfigured = property.cancellationPolicyConfigured === true;

  return (
    <div className="space-y-6">
      {!isPolicyConfigured && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 dark:text-amber-200">
                  Cancellation Policy Required
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You must configure and save your cancellation policy before
                  your property can go live. Review the settings below and click
                  "Save Cancellation Policy" to continue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CancellationPolicyCard property={property} />
    </div>
  );
}

function CancellationPolicyCard({ property }: { property: Property }) {
  const { toast } = useToast();
  type PolicyType = "flexible" | "moderate" | "strict" | "custom";
  const [policyType, setPolicyType] = useState<PolicyType>(
    (property.cancellationPolicyType as PolicyType) ?? "flexible",
  );
  const [freeCancellationHours, setFreeCancellationHours] = useState(
    String(property.freeCancellationHours ?? 24),
  );
  const [partialRefundPercent, setPartialRefundPercent] = useState(
    String(property.partialRefundPercent ?? 50),
  );
  const [hasChanges, setHasChanges] = useState(false);

  const updatePolicyMutation = useMutation({
    mutationFn: async (data: {
      cancellationPolicyType: string;
      freeCancellationHours: number;
      partialRefundPercent: number;
      cancellationPolicyConfigured: boolean;
    }) => {
      return apiRequest("PATCH", `/api/properties/${property.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", String(property.id)],
      });
      setHasChanges(false);
      toast({
        title: "Cancellation Policy Updated",
        description: "Your cancellation policy has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update cancellation policy.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const hours = parseInt(freeCancellationHours, 10);
    const percent = parseInt(partialRefundPercent, 10);

    if (isNaN(hours) || hours < 1 || hours > 168) {
      toast({
        title: "Invalid Hours",
        description:
          "Free cancellation hours must be between 1 and 168 (7 days).",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(percent) || percent < 0 || percent > 100) {
      toast({
        title: "Invalid Percentage",
        description: "Refund percentage must be between 0 and 100.",
        variant: "destructive",
      });
      return;
    }

    updatePolicyMutation.mutate({
      cancellationPolicyType: policyType,
      freeCancellationHours: hours,
      partialRefundPercent: percent,
      cancellationPolicyConfigured: true,
    });
  };

  const getPolicyDescription = () => {
    const hours = parseInt(freeCancellationHours, 10) || 24;
    const percent = parseInt(partialRefundPercent, 10) || 50;

    switch (policyType) {
      case "flexible":
        return `Guests get 100% refund if they cancel at least ${hours} hours before check-in. After that, they get ${percent}% refund.`;
      case "moderate":
        return `Guests get 100% refund if cancelled ${hours}+ hours before check-in, ${percent}% refund if cancelled between ${Math.floor(hours / 2)}-${hours} hours before, and no refund within ${Math.floor(hours / 2)} hours.`;
      case "strict":
        return `Guests get ${percent}% refund only if cancelled at least ${hours * 2} hours before check-in. No refund after that.`;
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancellation Policy</CardTitle>
        <CardDescription>
          Define how refunds work when guests cancel their bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base">Policy Type</Label>
            <Select
              value={policyType}
              onValueChange={(value: string) => {
                setPolicyType(value as PolicyType);
                setHasChanges(true);
              }}
            >
              <SelectTrigger data-testid="select-cancellation-policy-type">
                <SelectValue placeholder="Select a policy type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">
                  Flexible - Most guest-friendly
                </SelectItem>
                <SelectItem value="moderate">Moderate - Balanced</SelectItem>
                <SelectItem value="strict">
                  Strict - Most restrictive
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Free Cancellation Window (hours before check-in)</Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={freeCancellationHours}
                onChange={(e) => {
                  setFreeCancellationHours(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="24"
                data-testid="input-free-cancellation-hours"
              />
              <p className="text-xs text-muted-foreground">
                Hours before check-in when free cancellation is allowed (1-168)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Partial Refund Percentage</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={partialRefundPercent}
                onChange={(e) => {
                  setPartialRefundPercent(e.target.value);
                  setHasChanges(true);
                }}
                placeholder="50"
                data-testid="input-partial-refund-percent"
              />
              <p className="text-xs text-muted-foreground">
                Refund percentage for late cancellations (0-100%)
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-muted/50">
          <p className="text-sm font-medium mb-1">Policy Preview</p>
          <p className="text-sm text-muted-foreground">
            {getPolicyDescription()}
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updatePolicyMutation.isPending}
            data-testid="save-cancellation-policy"
          >
            <Save className="h-4 w-4 mr-2" />
            {updatePolicyMutation.isPending
              ? "Saving..."
              : "Save Cancellation Policy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GuestPoliciesCard({ property }: { property: Property }) {
  const { toast } = useToast();
  const [localIdAllowed, setLocalIdAllowed] = useState(
    property.localIdAllowed ?? false,
  );
  const [hourlyBookingAllowed, setHourlyBookingAllowed] = useState(
    property.hourlyBookingAllowed ?? false,
  );
  const [foreignGuestsAllowed, setForeignGuestsAllowed] = useState(
    property.foreignGuestsAllowed ?? false,
  );
  const [coupleFriendly, setCoupleFriendly] = useState(
    property.coupleFriendly ?? false,
  );

  const updatePoliciesMutation = useMutation({
    mutationFn: async (data: {
      localIdAllowed?: boolean;
      hourlyBookingAllowed?: boolean;
      foreignGuestsAllowed?: boolean;
      coupleFriendly?: boolean;
    }) => {
      return apiRequest("PATCH", `/api/properties/${property.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id],
      });
      toast({
        title: "Guest Policies Updated",
        description: "Your guest policy settings have been saved.",
      });
    },
    onError: (_error, variables) => {
      // Revert to original values on error
      if ("localIdAllowed" in variables)
        setLocalIdAllowed(property.localIdAllowed ?? false);
      if ("hourlyBookingAllowed" in variables)
        setHourlyBookingAllowed(property.hourlyBookingAllowed ?? false);
      if ("foreignGuestsAllowed" in variables)
        setForeignGuestsAllowed(property.foreignGuestsAllowed ?? false);
      if ("coupleFriendly" in variables)
        setCoupleFriendly(property.coupleFriendly ?? false);
      toast({
        title: "Error",
        description:
          "Failed to update guest policies. Changes have been reverted.",
        variant: "destructive",
      });
    },
  });

  const handlePolicyChange = (field: string, value: boolean) => {
    // Don't allow rapid toggles while a mutation is pending
    if (updatePoliciesMutation.isPending) return;

    const update: Record<string, boolean> = {};

    switch (field) {
      case "localIdAllowed":
        setLocalIdAllowed(value);
        update.localIdAllowed = value;
        break;
      case "hourlyBookingAllowed":
        setHourlyBookingAllowed(value);
        update.hourlyBookingAllowed = value;
        break;
      case "foreignGuestsAllowed":
        setForeignGuestsAllowed(value);
        update.foreignGuestsAllowed = value;
        break;
      case "coupleFriendly":
        setCoupleFriendly(value);
        update.coupleFriendly = value;
        break;
    }

    updatePoliciesMutation.mutate(update);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest Policies</CardTitle>
        <CardDescription>
          Define who can book your property and booking options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Couple Friendly</Label>
              <p className="text-sm text-muted-foreground">
                Allow unmarried couples to check in
              </p>
            </div>
            <Switch
              checked={coupleFriendly}
              onCheckedChange={(checked) =>
                handlePolicyChange("coupleFriendly", checked)
              }
              disabled={updatePoliciesMutation.isPending}
              data-testid="switch-couple-friendly"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Local ID Allowed</Label>
              <p className="text-sm text-muted-foreground">
                Accept guests with local ID proof
              </p>
            </div>
            <Switch
              checked={localIdAllowed}
              onCheckedChange={(checked) =>
                handlePolicyChange("localIdAllowed", checked)
              }
              disabled={updatePoliciesMutation.isPending}
              data-testid="switch-local-id"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Foreign Guests Allowed</Label>
              <p className="text-sm text-muted-foreground">
                Accept international guests with passport
              </p>
            </div>
            <Switch
              checked={foreignGuestsAllowed}
              onCheckedChange={(checked) =>
                handlePolicyChange("foreignGuestsAllowed", checked)
              }
              disabled={updatePoliciesMutation.isPending}
              data-testid="switch-foreign-guests"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Hourly Booking</Label>
              <p className="text-sm text-muted-foreground">
                Allow guests to book by the hour
              </p>
            </div>
            <Switch
              checked={hourlyBookingAllowed}
              onCheckedChange={(checked) =>
                handlePolicyChange("hourlyBookingAllowed", checked)
              }
              disabled={updatePoliciesMutation.isPending}
              data-testid="switch-hourly-booking"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RoomsSection({
  propertyId,
  roomTypes,
  isLoading,
}: {
  propertyId: string;
  roomTypes: RoomType[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  // Add room form state
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState("2");
  const [newRoomCount, setNewRoomCount] = useState("1");
  const [newRoomPrice, setNewRoomPrice] = useState("");
  const [newRoomOriginalPrice, setNewRoomOriginalPrice] = useState("");
  const [newSingleOccupancyBase, setNewSingleOccupancyBase] = useState("1");
  const [newDoubleOccupancyAdjustment, setNewDoubleOccupancyAdjustment] =
    useState("");
  const [newTripleOccupancyAdjustment, setNewTripleOccupancyAdjustment] =
    useState("");
  // New occupancy price fields
  const [newSinglePrice, setNewSinglePrice] = useState("");
  const [newDoublePrice, setNewDoublePrice] = useState("");
  const [newTriplePrice, setNewTriplePrice] = useState("");
  // New room detail fields
  const [newBedType, setNewBedType] = useState("");
  const [newViewType, setNewViewType] = useState("");
  const [newBathroomType, setNewBathroomType] = useState("");
  const [newSmokingPolicy, setNewSmokingPolicy] = useState("");
  const [newRoomSize, setNewRoomSize] = useState("");
  // New amenity fields
  const [newHasAC, setNewHasAC] = useState(true);
  const [newHasTV, setNewHasTV] = useState(false);
  const [newHasWifi, setNewHasWifi] = useState(false);
  const [newHasFridge, setNewHasFridge] = useState(false);
  const [newHasKettle, setNewHasKettle] = useState(false);
  const [newHasSafe, setNewHasSafe] = useState(false);
  const [newHasBalcony, setNewHasBalcony] = useState(false);
  const [newHasHeater, setNewHasHeater] = useState(false);

  const createRoomMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      maxGuests: number;
      totalRooms: number;
      basePrice: string;
      originalPrice?: string | null;
      singleOccupancyBase?: number;
      doubleOccupancyAdjustment?: number;
      tripleOccupancyAdjustment?: number;
    }) => {
      return apiRequest("POST", `/api/properties/${propertyId}/rooms`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "rooms"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "pricing-calendar"],
      });
      setShowAddForm(false);
      resetForm();
      toast({
        title: "Room Added",
        description: "Room type has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add room type.",
        variant: "destructive",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({
      roomId,
      data,
    }: {
      roomId: string;
      data: Partial<RoomType>;
    }) => {
      return apiRequest(
        "PATCH",
        `/api/properties/${propertyId}/rooms/${roomId}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "rooms"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "pricing-calendar"],
      });
      setEditingRoom(null);
      toast({
        title: "Room Updated",
        description: "Room type has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update room type.",
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return apiRequest(
        "DELETE",
        `/api/properties/${propertyId}/rooms/${roomId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "rooms"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Room Deleted",
        description: "Room type has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete room type.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomCapacity("2");
    setNewRoomCount("1");
    setNewRoomPrice("");
    setNewRoomOriginalPrice("");
    setNewSingleOccupancyBase("1");
    setNewDoubleOccupancyAdjustment("");
    setNewTripleOccupancyAdjustment("");
    setNewSinglePrice("");
    setNewDoublePrice("");
    setNewTriplePrice("");
    setNewBedType("");
    setNewViewType("");
    setNewBathroomType("");
    setNewSmokingPolicy("");
    setNewRoomSize("");
    setNewHasAC(true);
    setNewHasTV(false);
    setNewHasWifi(false);
    setNewHasFridge(false);
    setNewHasKettle(false);
    setNewHasSafe(false);
    setNewHasBalcony(false);
    setNewHasHeater(false);
  };

  const handleAddRoom = () => {
    if (!newRoomName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a room type name.",
        variant: "destructive",
      });
      return;
    }
    // Require at least one occupancy price OR the legacy base price
    const hasOccupancyPrice =
      newSinglePrice || newDoublePrice || newTriplePrice;
    const hasBasePrice = !!newRoomPrice;
    if (!hasOccupancyPrice && !hasBasePrice) {
      toast({
        title: "Price Required",
        description:
          "Set at least one occupancy price (Single, Double, or Triple).",
        variant: "destructive",
      });
      return;
    }

    // basePrice = single price if set, else double, else triple, else legacy
    const resolvedBasePrice =
      newSinglePrice || newDoublePrice || newTriplePrice || newRoomPrice;

    createRoomMutation.mutate({
      name: newRoomName.trim(),
      description: newRoomDescription.trim() || undefined,
      maxGuests: parseInt(newRoomCapacity),
      totalRooms: parseInt(newRoomCount),
      basePrice: resolvedBasePrice,
      originalPrice: newRoomOriginalPrice || null,
      singleOccupancyPrice: newSinglePrice || null,
      doubleOccupancyPrice: newDoublePrice || null,
      tripleOccupancyPrice: newTriplePrice || null,
      bedType: newBedType || null,
      roomSizeSqft: newRoomSize ? parseInt(newRoomSize) : null,
      viewType: newViewType || null,
      bathroomType: newBathroomType || null,
      smokingPolicy: newSmokingPolicy || null,
      hasAC: newHasAC,
      hasTV: newHasTV,
      hasWifi: newHasWifi,
      hasFridge: newHasFridge,
      hasKettle: newHasKettle,
      hasSafe: newHasSafe,
      hasBalcony: newHasBalcony,
      hasHeater: newHasHeater,
    } as any);
  };

  const toggleExpanded = (roomId: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Warning banner for properties without room types */}
      {!isLoading && roomTypes.length === 0 && (
        <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Room types required for pricing
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Add at least one room type to set pricing for your property.
                  Guests will not be able to book until room types with prices
                  are configured.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Room Types</CardTitle>
              <CardDescription>
                Manage room types and pricing for your property. Meal plan
                prices are set in the Pricing tab.
              </CardDescription>
            </div>
            {!showAddForm && (
              <Button
                onClick={() => setShowAddForm(true)}
                data-testid="add-room-type"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Room Type
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <Card className="mb-6 border-dashed border-2 border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">New Room Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Template selector */}
                <div className="space-y-1.5">
                  <Label>Quick Select Room Type</Label>
                  <Select
                    onValueChange={(val) => {
                      if (val) setNewRoomName(val);
                    }}
                  >
                    <SelectTrigger data-testid="select-room-template">
                      <SelectValue placeholder="Choose a template to prefill name…" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Standard Room",
                        "Deluxe Room",
                        "Superior Room",
                        "Premium Room",
                        "Luxury Room",
                        "Suite",
                        "Junior Suite",
                        "Executive Suite",
                        "Family Room",
                        "Double Room",
                        "Twin Room",
                        "Single Room",
                        "Triple Room",
                        "Studio",
                        "Dormitory / Dorm Bed",
                      ].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Row 1: Name + capacity */}
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="roomName">Room Type Name *</Label>
                    <Input
                      id="roomName"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g., Deluxe Room, Family Suite"
                      data-testid="input-new-room-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="roomCapacity">Max Guests</Label>
                    <Input
                      id="roomCapacity"
                      type="number"
                      min="1"
                      value={newRoomCapacity}
                      onChange={(e) => setNewRoomCapacity(e.target.value)}
                      data-testid="input-new-room-capacity"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="roomCount">Total Rooms</Label>
                    <Input
                      id="roomCount"
                      type="number"
                      min="1"
                      value={newRoomCount}
                      onChange={(e) => setNewRoomCount(e.target.value)}
                      data-testid="input-new-room-count"
                    />
                  </div>
                </div>

                {/* Row 2: Occupancy prices */}
                <div className="border rounded-lg p-4 space-y-3 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Occupancy Pricing *
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Full room rate per night — system picks the right rate
                      based on guest count
                    </span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Single (1 guest) ₹</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newSinglePrice}
                        onChange={(e) => setNewSinglePrice(e.target.value)}
                        placeholder="e.g. 1200"
                        className="border-primary"
                        data-testid="input-new-room-single-price"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Double (2 guests) ₹</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newDoublePrice}
                        onChange={(e) => setNewDoublePrice(e.target.value)}
                        placeholder="e.g. 1500"
                        data-testid="input-new-room-double-price"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Triple (3+ guests) ₹</Label>
                      <Input
                        type="number"
                        min="0"
                        value={newTriplePrice}
                        onChange={(e) => setNewTriplePrice(e.target.value)}
                        placeholder="e.g. 1800"
                        data-testid="input-new-room-triple-price"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-2">
                      Strike-off Price (₹){" "}
                      <Badge variant="secondary" className="text-xs">
                        Optional
                      </Badge>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={newRoomOriginalPrice}
                      onChange={(e) => setNewRoomOriginalPrice(e.target.value)}
                      placeholder="e.g. 2000 (shown crossed out)"
                      className="max-w-xs"
                      data-testid="input-new-room-original-price"
                    />
                  </div>
                </div>

                {/* Row 3: Room details */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bed Type</Label>
                    <Select value={newBedType} onValueChange={setNewBedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bed type" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "King",
                          "Queen",
                          "Double",
                          "Twin",
                          "Single",
                          "Bunk",
                          "Sofa Bed",
                        ].map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">View</Label>
                    <Select value={newViewType} onValueChange={setNewViewType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select view" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "Mountain View",
                          "Pool View",
                          "Garden View",
                          "City View",
                          "Sea View",
                          "Courtyard View",
                          "No View",
                        ].map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bathroom</Label>
                    <Select
                      value={newBathroomType}
                      onValueChange={setNewBathroomType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bathroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Attached", "En-suite", "Shared"].map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Smoking Policy</Label>
                    <Select
                      value={newSmokingPolicy}
                      onValueChange={setNewSmokingPolicy}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Non-smoking">Non-smoking</SelectItem>
                        <SelectItem value="Smoking">Smoking allowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Room Size (sq ft)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newRoomSize}
                      onChange={(e) => setNewRoomSize(e.target.value)}
                      placeholder="e.g. 250"
                    />
                  </div>
                </div>

                {/* Row 4: Amenities */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Amenities — click to toggle
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        label: "AC",
                        icon: Wind,
                        val: newHasAC,
                        set: setNewHasAC,
                      },
                      {
                        label: "TV",
                        icon: Tv,
                        val: newHasTV,
                        set: setNewHasTV,
                      },
                      {
                        label: "WiFi",
                        icon: Wifi,
                        val: newHasWifi,
                        set: setNewHasWifi,
                      },
                      {
                        label: "Fridge",
                        icon: Refrigerator,
                        val: newHasFridge,
                        set: setNewHasFridge,
                      },
                      {
                        label: "Kettle",
                        icon: Coffee,
                        val: newHasKettle,
                        set: setNewHasKettle,
                      },
                      {
                        label: "Safe",
                        icon: ShieldCheck,
                        val: newHasSafe,
                        set: setNewHasSafe,
                      },
                      {
                        label: "Balcony",
                        icon: Sunset,
                        val: newHasBalcony,
                        set: setNewHasBalcony,
                      },
                      {
                        label: "Heater",
                        icon: Flame,
                        val: newHasHeater,
                        set: setNewHasHeater,
                      },
                    ].map(({ label, icon: Icon, val, set }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set(!val)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${val ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50"}`}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 5: Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="roomDescription">
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="roomDescription"
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder="Describe the room features, view, amenities..."
                    rows={2}
                    data-testid="input-new-room-description"
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  After adding, set per-date prices from the{" "}
                  <strong>Pricing</strong> tab.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddRoom}
                    disabled={createRoomMutation.isPending}
                    data-testid="save-new-room"
                  >
                    {createRoomMutation.isPending
                      ? "Adding..."
                      : "Add Room Type"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    data-testid="cancel-new-room"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : roomTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bed className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No room types added yet.</p>
              <p className="text-sm">
                Add room types with pricing. Use the Pricing tab to set meal
                plan prices per date.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {roomTypes.map((room) => (
                <RoomTypeCard
                  key={room.id}
                  room={room}
                  propertyId={propertyId}
                  isExpanded={expandedRooms.has(room.id)}
                  onToggleExpand={() => toggleExpanded(room.id)}
                  isEditing={editingRoom?.id === room.id}
                  onEdit={() => setEditingRoom(room)}
                  onCancelEdit={() => setEditingRoom(null)}
                  onSave={(data) =>
                    updateRoomMutation.mutate({ roomId: room.id, data })
                  }
                  onDelete={() => deleteRoomMutation.mutate(room.id)}
                  isSaving={updateRoomMutation.isPending}
                  isDeleting={deleteRoomMutation.isPending}
                />
              ))}
              <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                <strong>Tip:</strong> Set per-date room prices and meal plan
                prices in the <strong>Pricing</strong> tab.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RoomTypeCard({
  room,
  propertyId,
  isExpanded,
  onToggleExpand,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  room: RoomType;
  propertyId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<RoomType>) => void;
  onDelete: () => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const { toast } = useToast();

  // ── Basic ──────────────────────────────────────────────────────────────────
  const [editName, setEditName] = useState(room.name);
  const [editDescription, setEditDescription] = useState(
    room.description || "",
  );
  const [editMaxGuests, setEditMaxGuests] = useState(String(room.maxGuests));
  const [editTotalRooms, setEditTotalRooms] = useState(
    String(room.totalRooms || 1),
  );
  const [editActive, setEditActive] = useState(room.isActive ?? true);
  const [editMinimumStay, setEditMinimumStay] = useState(
    String((room as any).minimumStay || 1),
  );
  const [editSortOrder, setEditSortOrder] = useState(
    String((room as any).sortOrder || 0),
  );

  // ── Room details ───────────────────────────────────────────────────────────
  const [editBedType, setEditBedType] = useState((room as any).bedType || "");
  const [editRoomSize, setEditRoomSize] = useState(
    String((room as any).roomSizeSqft || ""),
  );
  const [editViewType, setEditViewType] = useState(
    (room as any).viewType || "",
  );
  const [editBathroomType, setEditBathroomType] = useState(
    (room as any).bathroomType || "",
  );
  const [editSmokingPolicy, setEditSmokingPolicy] = useState(
    (room as any).smokingPolicy || "",
  );
  const [editFloorNumber, setEditFloorNumber] = useState(
    (room as any).floorNumber || "",
  );

  // ── Pricing ────────────────────────────────────────────────────────────────
  const [editSinglePrice, setEditSinglePrice] = useState(
    String((room as any).singleOccupancyPrice || ""),
  );
  const [editDoublePrice, setEditDoublePrice] = useState(
    String((room as any).doubleOccupancyPrice || ""),
  );
  const [editTriplePrice, setEditTriplePrice] = useState(
    String((room as any).tripleOccupancyPrice || ""),
  );
  const [editOriginalPrice, setEditOriginalPrice] = useState(
    room.originalPrice || "",
  );

  // ── Amenities ──────────────────────────────────────────────────────────────
  const [editHasAC, setEditHasAC] = useState((room as any).hasAC ?? false);
  const [editHasTV, setEditHasTV] = useState((room as any).hasTV ?? false);
  const [editHasWifi, setEditHasWifi] = useState(
    (room as any).hasWifi ?? false,
  );
  const [editHasFridge, setEditHasFridge] = useState(
    (room as any).hasFridge ?? false,
  );
  const [editHasKettle, setEditHasKettle] = useState(
    (room as any).hasKettle ?? false,
  );
  const [editHasSafe, setEditHasSafe] = useState(
    (room as any).hasSafe ?? false,
  );
  const [editHasBalcony, setEditHasBalcony] = useState(
    (room as any).hasBalcony ?? false,
  );
  const [editHasHeater, setEditHasHeater] = useState(
    (room as any).hasHeater ?? false,
  );

  // meal plans managed from Pricing tab

  const handleSave = () => {
    if (!editSinglePrice && !editDoublePrice && !editTriplePrice) {
      toast({
        title: "Price Required",
        description:
          "Set at least one occupancy price (Single, Double, or Triple).",
        variant: "destructive",
      });
      return;
    }

    // Use single price as basePrice fallback for backwards compatibility
    const basePrice =
      editSinglePrice || editDoublePrice || editTriplePrice || room.basePrice;

    onSave({
      name: editName,
      description: editDescription || null,
      maxGuests: parseInt(editMaxGuests),
      totalRooms: parseInt(editTotalRooms),
      basePrice: basePrice,
      originalPrice: editOriginalPrice || null,
      isActive: editActive,
      // New occupancy prices
      singleOccupancyPrice: editSinglePrice || null,
      doubleOccupancyPrice: editDoublePrice || null,
      tripleOccupancyPrice: editTriplePrice || null,
      // Room details
      bedType: editBedType || null,
      roomSizeSqft: editRoomSize ? parseInt(editRoomSize) : null,
      viewType: editViewType || null,
      bathroomType: editBathroomType || null,
      smokingPolicy: editSmokingPolicy || null,
      floorNumber: editFloorNumber || null,
      // Amenities
      hasAC: editHasAC,
      hasTV: editHasTV,
      hasWifi: editHasWifi,
      hasFridge: editHasFridge,
      hasKettle: editHasKettle,
      hasSafe: editHasSafe,
      hasBalcony: editHasBalcony,
      hasHeater: editHasHeater,
      // Rules
      minimumStay: parseInt(editMinimumStay) || 1,
      sortOrder: parseInt(editSortOrder) || 0,
    } as any);
  };

  const resetEditForm = () => {
    setEditName(room.name);
    setEditDescription(room.description || "");
    setEditMaxGuests(String(room.maxGuests));
    setEditTotalRooms(String(room.totalRooms || 1));
    setEditActive(room.isActive ?? true);
    setEditMinimumStay(String((room as any).minimumStay || 1));
    setEditSortOrder(String((room as any).sortOrder || 0));
    setEditBedType((room as any).bedType || "");
    setEditRoomSize(String((room as any).roomSizeSqft || ""));
    setEditViewType((room as any).viewType || "");
    setEditBathroomType((room as any).bathroomType || "");
    setEditSmokingPolicy((room as any).smokingPolicy || "");
    setEditFloorNumber((room as any).floorNumber || "");
    setEditSinglePrice(String((room as any).singleOccupancyPrice || ""));
    setEditDoublePrice(String((room as any).doubleOccupancyPrice || ""));
    setEditTriplePrice(String((room as any).tripleOccupancyPrice || ""));
    setEditOriginalPrice(room.originalPrice || "");
    setEditHasAC((room as any).hasAC ?? false);
    setEditHasTV((room as any).hasTV ?? false);
    setEditHasWifi((room as any).hasWifi ?? false);
    setEditHasFridge((room as any).hasFridge ?? false);
    setEditHasKettle((room as any).hasKettle ?? false);
    setEditHasSafe((room as any).hasSafe ?? false);
    setEditHasBalcony((room as any).hasBalcony ?? false);
    setEditHasHeater((room as any).hasHeater ?? false);
  };

  // Amenity chip helper
  const AmenityChip = ({
    label,
    icon: Icon,
    checked,
    onChange,
  }: {
    label: string;
    icon: any;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
        checked
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/50"
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );

  // Summary badges for collapsed view
  const amenityCount = [
    editHasAC,
    editHasTV,
    editHasWifi,
    editHasFridge,
    editHasKettle,
    editHasSafe,
    editHasBalcony,
    editHasHeater,
  ].filter(Boolean).length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        className="border rounded-lg overflow-hidden"
        data-testid={`room-type-${room.id}`}
      >
        {/* ── Header row ── */}
        <div className="flex items-center justify-between p-4 bg-muted/30">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bed className="h-5 w-5 text-muted-foreground" />
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-48"
                  data-testid={`edit-room-name-${room.id}`}
                />
              ) : (
                <span className="font-medium">{room.name}</span>
              )}
            </div>
            {!isEditing && (
              <>
                <Badge variant="secondary">{room.maxGuests} guests</Badge>
                <Badge variant="outline">{room.totalRooms || 1} rooms</Badge>
                {(room as any).bedType && (
                  <Badge variant="outline" className="text-xs">
                    {(room as any).bedType}
                  </Badge>
                )}
                {(room as any).singleOccupancyPrice ? (
                  <Badge variant="default" className="gap-1 text-xs">
                    {room.originalPrice &&
                      parseFloat(room.originalPrice) >
                        parseFloat((room as any).singleOccupancyPrice) && (
                        <span className="line-through opacity-70">
                          ₹{room.originalPrice}
                        </span>
                      )}
                    <span>
                      ₹{(room as any).singleOccupancyPrice}/1P · ₹
                      {(room as any).doubleOccupancyPrice || "—"}/2P · ₹
                      {(room as any).tripleOccupancyPrice || "—"}/3P
                    </span>
                  </Badge>
                ) : room.basePrice ? (
                  <Badge variant="default" className="gap-1">
                    {room.originalPrice &&
                      parseFloat(room.originalPrice) >
                        parseFloat(room.basePrice) && (
                        <span className="line-through opacity-70">
                          ₹{room.originalPrice}
                        </span>
                      )}
                    <span>₹{room.basePrice}/night</span>
                  </Badge>
                ) : null}
                {amenityCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {amenityCount} amenities
                  </Badge>
                )}
                {room.isActive === false && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  data-testid={`save-room-${room.id}`}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onCancelEdit();
                    resetEditForm();
                  }}
                  data-testid={`cancel-edit-room-${room.id}`}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                  data-testid={`edit-room-${room.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  disabled={isDeleting}
                  data-testid={`delete-room-${room.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Edit form ── */}
        {isEditing && (
          <div className="p-4 border-t space-y-5">
            {/* Section 1: Basic Info */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Basic Info
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Max Guests</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editMaxGuests}
                    onChange={(e) => setEditMaxGuests(e.target.value)}
                    data-testid={`edit-room-capacity-${room.id}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Total Rooms</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editTotalRooms}
                    onChange={(e) => setEditTotalRooms(e.target.value)}
                    data-testid={`edit-room-count-${room.id}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Min Stay (nights)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editMinimumStay}
                    onChange={(e) => setEditMinimumStay(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Room Size (sq ft)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editRoomSize}
                    onChange={(e) => setEditRoomSize(e.target.value)}
                    placeholder="e.g. 250"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Bed Type</Label>
                  <Select value={editBedType} onValueChange={setEditBedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bed type" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "King",
                        "Queen",
                        "Double",
                        "Twin",
                        "Single",
                        "Bunk",
                        "Sofa Bed",
                      ].map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">View</Label>
                  <Select value={editViewType} onValueChange={setEditViewType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Mountain View",
                        "Pool View",
                        "Garden View",
                        "City View",
                        "Sea View",
                        "Courtyard View",
                        "No View",
                      ].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bathroom</Label>
                  <Select
                    value={editBathroomType}
                    onValueChange={setEditBathroomType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bathroom" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Attached", "En-suite", "Shared"].map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Smoking Policy</Label>
                  <Select
                    value={editSmokingPolicy}
                    onValueChange={setEditSmokingPolicy}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Non-smoking">Non-smoking</SelectItem>
                      <SelectItem value="Smoking">Smoking allowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Floor / Location</Label>
                  <Input
                    value={editFloorNumber}
                    onChange={(e) => setEditFloorNumber(e.target.value)}
                    placeholder="e.g. Ground Floor, 2nd Floor"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Active</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={editActive}
                      onCheckedChange={setEditActive}
                      data-testid={`edit-room-active-${room.id}`}
                    />
                    <span className="text-sm text-muted-foreground">
                      {editActive ? "Accepting bookings" : "Not accepting"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Room description..."
                  rows={2}
                  data-testid={`edit-room-description-${room.id}`}
                />
              </div>
            </div>

            {/* Section 2: Pricing */}
            <div className="space-y-3 border rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Occupancy Pricing
                </p>
                <p className="text-xs text-muted-foreground">
                  Full room rate per night based on guest count
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" /> Single (1 guest) ₹
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={editSinglePrice}
                    onChange={(e) => setEditSinglePrice(e.target.value)}
                    placeholder="e.g. 1200"
                    className="border-primary"
                    data-testid={`edit-room-single-price-${room.id}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" /> Double (2 guests) ₹
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={editDoublePrice}
                    onChange={(e) => setEditDoublePrice(e.target.value)}
                    placeholder="e.g. 1500"
                    data-testid={`edit-room-double-price-${room.id}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" /> Triple (3+ guests) ₹
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={editTriplePrice}
                    onChange={(e) => setEditTriplePrice(e.target.value)}
                    placeholder="e.g. 1800"
                    data-testid={`edit-room-triple-price-${room.id}`}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-2">
                  Strike-off Price (₹)
                  <Badge variant="secondary" className="text-xs">
                    Optional — shown crossed out
                  </Badge>
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={editOriginalPrice}
                  onChange={(e) => setEditOriginalPrice(e.target.value)}
                  placeholder="e.g. 2000 (leave empty for no discount)"
                  className="max-w-xs"
                  data-testid={`edit-room-original-price-${room.id}`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                System picks the rate automatically based on how many adults the
                guest selects. Set at least 1 price.
              </p>
            </div>

            {/* Section 3: Amenities */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                In-Room Amenities
              </p>
              <div className="flex flex-wrap gap-2">
                <AmenityChip
                  label="AC"
                  icon={Wind}
                  checked={editHasAC}
                  onChange={setEditHasAC}
                />
                <AmenityChip
                  label="TV"
                  icon={Tv}
                  checked={editHasTV}
                  onChange={setEditHasTV}
                />
                <AmenityChip
                  label="WiFi"
                  icon={Wifi}
                  checked={editHasWifi}
                  onChange={setEditHasWifi}
                />
                <AmenityChip
                  label="Fridge"
                  icon={Refrigerator}
                  checked={editHasFridge}
                  onChange={setEditHasFridge}
                />
                <AmenityChip
                  label="Kettle"
                  icon={Coffee}
                  checked={editHasKettle}
                  onChange={setEditHasKettle}
                />
                <AmenityChip
                  label="Safe"
                  icon={ShieldCheck}
                  checked={editHasSafe}
                  onChange={setEditHasSafe}
                />
                <AmenityChip
                  label="Balcony"
                  icon={Sunset}
                  checked={editHasBalcony}
                  onChange={setEditHasBalcony}
                />
                <AmenityChip
                  label="Heater"
                  icon={Flame}
                  checked={editHasHeater}
                  onChange={setEditHasHeater}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Click to toggle. Orange = included in this room type.
              </p>
            </div>
            {/* Section 4: Meal Plans */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Meal Plans
              </p>
              <MealOptionsManager roomTypeId={room.id} />
            </div>
          </div>
        )}
      </div>
    </Collapsible>
  );
}
function MealOptionsManager({ roomTypeId }: { roomTypeId: string }) {
  const { toast } = useToast();
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const mealOptionsQuery = useQuery<any[]>({
    queryKey: ["/api/rooms", roomTypeId, "options"],
    queryFn: () =>
      apiRequest("GET", `/api/rooms/${roomTypeId}/options`).then((r) =>
        r.json(),
      ),
  });
  const mealOptions = mealOptionsQuery.data ?? [];
  const isLoading = mealOptionsQuery.isLoading;

  const updateMutation = useMutation({
    mutationFn: async ({
      optionId,
      updates,
    }: {
      optionId: string;
      updates: Record<string, any>;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/rooms/${roomTypeId}/options/${optionId}`,
        updates,
      );
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/rooms", roomTypeId, "options"],
      });
      setEditingPriceId(null);
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to update meal option.",
        variant: "destructive",
      }),
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  // FIX 5: distinguish "load failed" from "really no meal plans" — without
  // this, owners can't tell if their meal plans were lost or just unloaded.
  if (mealOptionsQuery.isError) {
    return (
      <TabLoadError
        message="Couldn't load meal plans. Please retry."
        onRetry={() => mealOptionsQuery.refetch()}
        isRetrying={mealOptionsQuery.isFetching}
      />
    );
  }
  if (mealOptions.length === 0)
    return (
      <p className="text-xs text-muted-foreground">No meal plans found.</p>
    );

  return (
    <div className="space-y-2">
      {mealOptions.map((opt: any) => (
        <div
          key={opt.id}
          className="flex items-center justify-between p-2 bg-muted/30 rounded-md gap-3 flex-wrap"
        >
          {/* Name */}
          <span className="text-sm font-medium min-w-[140px]">{opt.name}</span>

          {/* Price edit */}
          {Number(opt.priceAdjustment) === 0 &&
          opt.name === "Room Only (Best Price)" ? (
            <Badge variant="secondary" className="text-xs">
              Base price
            </Badge>
          ) : Number(opt.priceAdjustment) === 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs text-amber-600 border-amber-300"
              onClick={() => {
                setEditingPriceId(opt.id);
                setEditPrice("");
              }}
            >
              Set price/person/night
            </Button>
          ) : editingPriceId === opt.id ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">₹</span>
              <Input
                type="number"
                className="h-7 w-24 text-xs"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                autoFocus
              />
              <span className="text-xs text-muted-foreground">
                /person/night
              </span>
              <Button
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  updateMutation.mutate({
                    optionId: opt.id,
                    updates: { priceAdjustment: String(editPrice) },
                  })
                }
                disabled={updateMutation.isPending}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setEditingPriceId(null)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Badge variant="default" className="text-xs">
                +₹{Number(opt.priceAdjustment)}/person/night
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setEditingPriceId(opt.id);
                  setEditPrice(String(opt.priceAdjustment));
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">
              {opt.isActive ? "Visible" : "Hidden"}
            </span>
            <Switch
              checked={opt.isActive ?? true}
              onCheckedChange={(checked) =>
                updateMutation.mutate({
                  optionId: opt.id,
                  updates: { isActive: checked },
                })
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PropertyDetailsSection
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_MANAGERS = [
  "SiteMinder",
  "RateGain",
  "eZee Absolute",
  "STAAH",
  "Cloudbeds",
  "MakeMyTrip Connect",
  "Other",
];

const PROPERTY_TYPES = [
  "hotel",
  "villa",
  "hostel",
  "lodge",
  "resort",
  "apartment",
  "farmhouse",
  "homestay",
  "cottage",
];

function PropertyDetailsSection({ property }: { property: Property }) {
  const { toast } = useToast();

  const [title, setTitle] = useState(property.title || "");
  const [propertyType, setPropertyType] = useState<string>(
    property.propertyType || "",
  );
  const [starRating, setStarRating] = useState<number | null>(
    (property as any).starRating ?? null,
  );
  const [channelManagerEnabled, setChannelManagerEnabled] = useState(
    (property as any).channelManagerEnabled ?? false,
  );
  const [channelManagerName, setChannelManagerName] = useState(
    (property as any).channelManagerName ?? "",
  );
  const [channelManagerNameCustom, setChannelManagerNameCustom] = useState(
    (property as any).channelManagerNameCustom ?? "",
  );
  const [contactEmail, setContactEmail] = useState(
    (property as any).contactEmail ?? "",
  );
  const [contactPhone, setContactPhone] = useState(
    (property as any).contactPhone ?? "",
  );
  const [whatsappNumber, setWhatsappNumber] = useState(
    (property as any).whatsappNumber ?? "",
  );
  const [receptionNumber, setReceptionNumber] = useState(
    (property as any).receptionNumber ?? "",
  );

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) =>
      apiRequest("PATCH", `/api/properties/${property.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id],
      });
      toast({ title: "Saved", description: "Property details updated." });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to save.",
        variant: "destructive",
      }),
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({ title: "Property name is required.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      title: title.trim(),
      propertyType: propertyType || undefined,
      starRating: starRating ?? null,
      channelManagerEnabled,
      channelManagerName: channelManagerEnabled ? channelManagerName : null,
      channelManagerNameCustom:
        channelManagerEnabled && channelManagerName === "Other"
          ? channelManagerNameCustom
          : null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      whatsappNumber: whatsappNumber || null,
      receptionNumber: receptionNumber || null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Core identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pd-title">
              Property Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pd-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Grand Residency"
              data-testid="input-pd-title"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pd-type">Property Type</Label>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger id="pd-type" data-testid="select-pd-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Hotel Star Rating (optional)</Label>
              <div className="flex items-center gap-1 pt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStarRating(starRating === n ? null : n)}
                    className="focus:outline-none"
                    data-testid={`star-${n}`}
                  >
                    <Star
                      className={`h-6 w-6 transition-colors ${
                        starRating !== null && n <= starRating
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300 hover:text-amber-300"
                      }`}
                    />
                  </button>
                ))}
                {starRating !== null && (
                  <button
                    type="button"
                    onClick={() => setStarRating(null)}
                    className="ml-2 text-xs text-muted-foreground underline"
                  >
                    clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel manager */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Channel Manager
          </CardTitle>
          <CardDescription>
            Are you using a channel manager to sync inventory across OTAs?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="pd-cm-toggle">Using a channel manager?</Label>
            <Switch
              id="pd-cm-toggle"
              checked={channelManagerEnabled}
              onCheckedChange={setChannelManagerEnabled}
              data-testid="switch-channel-manager"
            />
          </div>

          {channelManagerEnabled && (
            <div className="space-y-3 pt-1">
              <div className="space-y-2">
                <Label htmlFor="pd-cm-name">Channel Manager</Label>
                <Select
                  value={channelManagerName}
                  onValueChange={setChannelManagerName}
                >
                  <SelectTrigger id="pd-cm-name" data-testid="select-cm-name">
                    <SelectValue placeholder="Select channel manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_MANAGERS.map((cm) => (
                      <SelectItem key={cm} value={cm}>
                        {cm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {channelManagerName === "Other" && (
                <div className="space-y-2">
                  <Label htmlFor="pd-cm-custom">Channel Manager Name</Label>
                  <Input
                    id="pd-cm-custom"
                    value={channelManagerNameCustom}
                    onChange={(e) =>
                      setChannelManagerNameCustom(e.target.value)
                    }
                    placeholder="Enter channel manager name"
                    data-testid="input-cm-custom"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Details
          </CardTitle>
          <CardDescription>
            These are private. Only shared with guests who have a confirmed
            booking on this property.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pd-email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email ID
              </Label>
              <Input
                id="pd-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hotel@example.com"
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pd-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Contact No.
              </Label>
              <Input
                id="pd-phone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                data-testid="input-contact-phone"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="pd-whatsapp"
                className="flex items-center gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp No.
              </Label>
              <Input
                id="pd-whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98765 43210"
                data-testid="input-whatsapp"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="pd-reception"
                className="flex items-center gap-1.5"
              >
                <Phone className="h-3.5 w-3.5" /> Reception No.
              </Label>
              <Input
                id="pd-reception"
                type="tel"
                value={receptionNumber}
                onChange={(e) => setReceptionNumber(e.target.value)}
                placeholder="+91 11 2345 6789"
                data-testid="input-reception"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          data-testid="button-save-property-details"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Details"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PolicySection
// ─────────────────────────────────────────────────────────────────────────────

const CHECK_IN_TIMES = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];
const CHECK_OUT_TIMES = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
];
const LOCAL_ID_OPTIONS = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Voter ID",
  "Driving License",
];
const FOREIGN_ID_OPTIONS = ["Passport", "Visa", "OCI Card"];

function PolicySection({ property }: { property: Property }) {
  const { toast } = useToast();

  // House rules
  const [houseRules, setHouseRules] = useState(
    (property as any).policies || "",
  );

  // Check-in / Check-out
  const [checkInTime, setCheckInTime] = useState(
    property.checkInTime || "14:00",
  );
  const [checkOutTime, setCheckOutTime] = useState(
    property.checkOutTime || "11:00",
  );

  // Cancellation
  type PolicyType = "flexible" | "moderate" | "strict" | "custom";
  const [policyType, setPolicyType] = useState<PolicyType>(
    (property.cancellationPolicyType as PolicyType) ?? "flexible",
  );
  const [freeCancellationHours, setFreeCancellationHours] = useState(
    String(property.freeCancellationHours ?? 24),
  );
  const [partialRefundPercent, setPartialRefundPercent] = useState(
    String(property.partialRefundPercent ?? 50),
  );
  const [customPolicyText, setCustomPolicyText] = useState(
    property.cancellationPolicy ?? "",
  );

  // ID types
  const [localIdTypes, setLocalIdTypes] = useState<string[]>(
    (property as any).acceptedLocalIdTypes ?? [],
  );
  const [foreignIdTypes, setForeignIdTypes] = useState<string[]>(
    (property as any).acceptedForeignIdTypes ?? [],
  );

  // Hotel rules
  const [coupleFriendly, setCoupleFriendly] = useState(
    property.coupleFriendly ?? false,
  );
  const [foreignGuestsAllowed, setForeignGuestsAllowed] = useState(
    (property as any).foreignGuestsAllowed ?? false,
  );
  const [petsAllowed, setPetsAllowed] = useState(
    (property as any).petsAllowed ?? false,
  );
  const [smokingAllowed, setSmokingAllowed] = useState(
    (property as any).smokingAllowed ?? false,
  );
  const [liquorAllowed, setLiquorAllowed] = useState(
    (property as any).liquorAllowed ?? false,
  );
  const [visitorsAllowed, setVisitorsAllowed] = useState(
    (property as any).visitorsAllowed ?? false,
  );
  const [hourlyBookingAllowed, setHourlyBookingAllowed] = useState(
    property.hourlyBookingAllowed ?? false,
  );

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) =>
      apiRequest("PATCH", `/api/properties/${property.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id],
      });
      toast({ title: "Saved", description: "Policy updated." });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to save.",
        variant: "destructive",
      }),
  });

  const toggleIdType = (
    list: string[],
    setList: (v: string[]) => void,
    value: string,
  ) => {
    setList(
      list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
    );
  };

  const handleSave = () => {
    const hours = parseInt(freeCancellationHours, 10);
    const percent = parseInt(partialRefundPercent, 10);

    if (policyType !== "custom") {
      if (isNaN(hours) || hours < 1 || hours > 168) {
        toast({
          title: "Free cancellation hours must be 1–168.",
          variant: "destructive",
        });
        return;
      }
      if (isNaN(percent) || percent < 0 || percent > 100) {
        toast({ title: "Refund % must be 0–100.", variant: "destructive" });
        return;
      }
    } else if (!customPolicyText.trim()) {
      toast({
        title: "Please enter your custom policy text.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      checkInTime: checkInTime || null,
      checkOutTime: checkOutTime || null,
      cancellationPolicyType: policyType,
      freeCancellationHours:
        policyType !== "custom" ? hours : property.freeCancellationHours,
      partialRefundPercent:
        policyType !== "custom" ? percent : property.partialRefundPercent,
      cancellationPolicy: policyType === "custom" ? customPolicyText : null,
      cancellationPolicyConfigured: true,
      acceptedLocalIdTypes: localIdTypes,
      acceptedForeignIdTypes: foreignIdTypes,
      coupleFriendly,
      foreignGuestsAllowed,
      petsAllowed,
      smokingAllowed,
      liquorAllowed,
      visitorsAllowed,
      hourlyBookingAllowed,
      policies: houseRules,
    });
  };

  const policyLabel: Record<PolicyType, string> = {
    flexible: "Free cancellation (Flexible)",
    moderate: "Partial refund (Moderate)",
    strict: "Non-refundable (Strict)",
    custom: "Custom policy",
  };

  return (
    <div className="space-y-6">
      {/* Check-in / Check-out */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Check-in &amp; Check-out Times
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Check-in Time <span className="text-destructive">*</span>
              </Label>
              <Select value={checkInTime} onValueChange={setCheckInTime}>
                <SelectTrigger data-testid="select-checkin">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {CHECK_IN_TIMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t} {parseInt(t) < 12 ? "AM" : "PM"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Check-out Time <span className="text-destructive">*</span>
              </Label>
              <Select value={checkOutTime} onValueChange={setCheckOutTime}>
                <SelectTrigger data-testid="select-checkout">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {CHECK_OUT_TIMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t} {parseInt(t) < 12 ? "AM" : "PM"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancellation policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5" />
            Cancellation Policy
          </CardTitle>
          <CardDescription>
            Define how refunds work when guests cancel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Policy Type</Label>
            <Select
              value={policyType}
              onValueChange={(v) => setPolicyType(v as PolicyType)}
            >
              <SelectTrigger data-testid="select-policy-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flexible">
                  Free cancellation (Flexible)
                </SelectItem>
                <SelectItem value="moderate">
                  Partial refund (Moderate)
                </SelectItem>
                <SelectItem value="strict">Non-refundable (Strict)</SelectItem>
                <SelectItem value="custom">Custom policy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {policyType !== "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="policy-hours">
                  Free cancellation window (hours)
                </Label>
                <Input
                  id="policy-hours"
                  type="number"
                  min="1"
                  max="168"
                  value={freeCancellationHours}
                  onChange={(e) => setFreeCancellationHours(e.target.value)}
                  data-testid="input-free-hours"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy-percent">Refund % within window</Label>
                <Input
                  id="policy-percent"
                  type="number"
                  min="0"
                  max="100"
                  value={partialRefundPercent}
                  onChange={(e) => setPartialRefundPercent(e.target.value)}
                  data-testid="input-refund-percent"
                />
              </div>
            </div>
          )}

          {policyType === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="policy-custom">Custom Policy Text</Label>
              <Textarea
                id="policy-custom"
                rows={4}
                value={customPolicyText}
                onChange={(e) => setCustomPolicyText(e.target.value)}
                placeholder="Describe your cancellation and refund terms..."
                data-testid="input-custom-policy"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ID acceptance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Acceptable ID Proof
          </CardTitle>
          <CardDescription>
            Which ID types do you accept at check-in?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-2">Local Guests</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {LOCAL_ID_OPTIONS.map((id) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox
                    id={`local-${id}`}
                    checked={localIdTypes.includes(id)}
                    onCheckedChange={() =>
                      toggleIdType(localIdTypes, setLocalIdTypes, id)
                    }
                    data-testid={`checkbox-local-${id}`}
                  />
                  <Label
                    htmlFor={`local-${id}`}
                    className="font-normal cursor-pointer"
                  >
                    {id}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Foreign Guests</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {FOREIGN_ID_OPTIONS.map((id) => (
                <div key={id} className="flex items-center gap-2">
                  <Checkbox
                    id={`foreign-${id}`}
                    checked={foreignIdTypes.includes(id)}
                    onCheckedChange={() =>
                      toggleIdType(foreignIdTypes, setForeignIdTypes, id)
                    }
                    data-testid={`checkbox-foreign-${id}`}
                  />
                  <Label
                    htmlFor={`foreign-${id}`}
                    className="font-normal cursor-pointer"
                  >
                    {id}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotel rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Hotel Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(
              [
                {
                  label: "Couple-friendly",
                  desc: "Allow unmarried couples to check in",
                  value: coupleFriendly,
                  set: setCoupleFriendly,
                  testId: "switch-couple-friendly",
                },
                {
                  label: "Foreign guests allowed",
                  desc: "Accept international guests with passport",
                  value: foreignGuestsAllowed,
                  set: setForeignGuestsAllowed,
                  testId: "switch-foreign-guests-policy",
                },
                {
                  label: "Pets allowed",
                  desc: "Guests may bring pets",
                  value: petsAllowed,
                  set: setPetsAllowed,
                  testId: "switch-pets",
                },
                {
                  label: "Smoking in room",
                  desc: "Smoking permitted inside rooms",
                  value: smokingAllowed,
                  set: setSmokingAllowed,
                  testId: "switch-smoking",
                },
                {
                  label: "Liquor in room",
                  desc: "Guests may consume liquor in room",
                  value: liquorAllowed,
                  set: setLiquorAllowed,
                  testId: "switch-liquor",
                },
                {
                  label: "Visitors allowed in room",
                  desc: "Registered guests may bring visitors to the room",
                  value: visitorsAllowed,
                  set: setVisitorsAllowed,
                  testId: "switch-visitors",
                },
                {
                  label: "Hourly booking",
                  desc: "Accept bookings by the hour",
                  value: hourlyBookingAllowed,
                  set: setHourlyBookingAllowed,
                  testId: "switch-hourly",
                },
              ] as const
            ).map(({ label, desc, value, set, testId }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={set}
                  data-testid={testId}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* House Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            House Rules
          </CardTitle>
          <CardDescription>
            Additional rules guests must follow during their stay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="house-rules-input">House Rules (Optional)</Label>
            <Textarea
              id="house-rules-input"
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
              placeholder="No smoking in rooms, No outside food, Quiet hours after 10pm, etc."
              rows={4}
              data-testid="input-policies"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          data-testid="button-save-policy"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Policy"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AmenitiesSection
// ─────────────────────────────────────────────────────────────────────────────

const ROOM_IN_AMENITIES = [
  { key: "hasAC", label: "Air Conditioning" },
  { key: "hasTV", label: "TV" },
  { key: "hasWifi", label: "WiFi" },
  { key: "hasFridge", label: "Refrigerator" },
  { key: "hasKettle", label: "Electric Kettle" },
  { key: "hasSafe", label: "In-room Safe" },
  { key: "hasBalcony", label: "Balcony" },
  { key: "hasHeater", label: "Heater" },
] as const;

function AmenitiesSection({
  property,
  roomTypes,
  roomTypesUnavailable,
}: {
  property: Property;
  roomTypes: RoomType[];
  roomTypesUnavailable?: boolean;
}) {
  const { toast } = useToast();
  const allAmenitiesQuery = useQuery<any[]>({
    queryKey: ["/api/amenities"],
  });
  const propertyAmenitiesQuery = useQuery<any[]>({
    queryKey: ["/api/properties", property.id, "amenities"],
  });
  const allAmenities = allAmenitiesQuery.data ?? [];
  const propertyAmenities = propertyAmenitiesQuery.data ?? [];
  const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>("");
  const [roomAmenityEdits, setRoomAmenityEdits] = useState<
    Record<string, Record<string, boolean>>
  >({});

  // Only initialize from server data after a successful fetch — avoids the
  // "fetch failed → empty UI → user clicks Save → overwrites with []" trap.
  useEffect(() => {
    if (propertyAmenitiesQuery.isSuccess) {
      setSelectedAmenityIds(
        propertyAmenities.map((a: any) => a.amenityId || a.id),
      );
    }
  }, [propertyAmenitiesQuery.isSuccess, propertyAmenities]);

  useEffect(() => {
    if (!selectedRoomTypeId && roomTypes.length > 0) {
      setSelectedRoomTypeId(String(roomTypes[0].id));
    }
  }, [roomTypes, selectedRoomTypeId]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Save guard: never write against unverified state. If the original
      // fetch never succeeded, refuse — user is editing in the dark.
      if (!propertyAmenitiesQuery.isSuccess) {
        throw new Error("STALE_VIEW");
      }
      // Refetch right before save to confirm we still have a connection.
      const refetchResult = await propertyAmenitiesQuery.refetch();
      if (refetchResult.isError) {
        throw new Error("STALE_VIEW");
      }
      return apiRequest("PATCH", `/api/properties/${property.id}`, {
        amenityIds: selectedAmenityIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id, "amenities"],
      });
      toast({ title: "Saved", description: "Amenities updated." });
    },
    onError: (err: Error) => {
      if (err.message === "STALE_VIEW") {
        toast({
          title: "Couldn't verify your amenities",
          description: "Please reload the page and try again.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save.",
        variant: "destructive",
      });
    },
  });

  const updateRoomAmenityMutation = useMutation({
    mutationFn: async ({
      roomId,
      data,
    }: {
      roomId: string;
      data: Record<string, boolean>;
    }) =>
      apiRequest(
        "PATCH",
        `/api/properties/${property.id}/rooms/${roomId}`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", property.id, "rooms"],
      });
      toast({ title: "Saved", description: "Room amenities updated." });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to save room amenities.",
        variant: "destructive",
      }),
  });

  const toggleAmenity = (id: string) => {
    setSelectedAmenityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedRoom = roomTypes.find(
    (r) => String(r.id) === selectedRoomTypeId,
  );
  const roomAmenityCurrent = selectedRoomTypeId
    ? (roomAmenityEdits[selectedRoomTypeId] ?? {
        hasAC: selectedRoom?.hasAC ?? true,
        hasTV: selectedRoom?.hasTV ?? false,
        hasWifi: selectedRoom?.hasWifi ?? false,
        hasFridge: selectedRoom?.hasFridge ?? false,
        hasKettle: (selectedRoom as any)?.hasKettle ?? false,
        hasSafe: (selectedRoom as any)?.hasSafe ?? false,
        hasBalcony: (selectedRoom as any)?.hasBalcony ?? false,
        hasHeater: (selectedRoom as any)?.hasHeater ?? false,
      })
    : {};

  const toggleRoomAmenity = (key: string) => {
    setRoomAmenityEdits((prev) => ({
      ...prev,
      [selectedRoomTypeId]: {
        ...roomAmenityCurrent,
        [key]: !roomAmenityCurrent[key as keyof typeof roomAmenityCurrent],
      },
    }));
  };

  // FIX 5: surface query failures instead of silently rendering empty UI.
  if (allAmenitiesQuery.isError || propertyAmenitiesQuery.isError) {
    return (
      <TabLoadError
        message="Couldn't load amenities. Please retry."
        onRetry={() => {
          if (allAmenitiesQuery.isError) allAmenitiesQuery.refetch();
          if (propertyAmenitiesQuery.isError) propertyAmenitiesQuery.refetch();
        }}
        isRetrying={
          allAmenitiesQuery.isFetching || propertyAmenitiesQuery.isFetching
        }
      />
    );
  }

  const essentialAmenities = allAmenities.filter(
    (a: any) =>
      (a.category === "essential" ||
        a.name === "Hot water" ||
        a.name === "Laundry") &&
      a.name !== "Shared Kitchen",
  );
  const otherCategories = [
    "bathroom",
    "safety",
    "services",
    "outdoor",
    "family",
    "food",
    "entertainment",
    "accessibility",
    "work",
  ];

  return (
    <div className="space-y-6">
      {/* Property-wide amenities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Property Amenities
          </CardTitle>
          <CardDescription>
            Select what your property offers to all guests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {essentialAmenities.map((amenity: any) => (
              <div key={amenity.id} className="flex items-center gap-2">
                <Checkbox
                  id={`amenity-${amenity.id}`}
                  checked={selectedAmenityIds.includes(amenity.id)}
                  onCheckedChange={() => toggleAmenity(amenity.id)}
                />
                <label
                  htmlFor={`amenity-${amenity.id}`}
                  className="text-sm cursor-pointer"
                >
                  {amenity.name}
                </label>
              </div>
            ))}
          </div>
          <details className="mt-2">
            <summary className="text-sm text-muted-foreground cursor-pointer">
              Show more amenity categories
            </summary>
            <div className="space-y-4 mt-3 border-t pt-3">
              {otherCategories.map((cat) => {
                const catAmenities = allAmenities.filter(
                  (a: any) =>
                    a.category === cat &&
                    a.name !== "Hot water" &&
                    a.name !== "Laundry" &&
                    a.name !== "Shared Kitchen",
                );
                if (!catAmenities.length) return null;
                return (
                  <div key={cat}>
                    <p className="text-xs font-medium text-muted-foreground capitalize mb-2">
                      {cat}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {catAmenities.map((amenity: any) => (
                        <div
                          key={amenity.id}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`amenity-${amenity.id}`}
                            checked={selectedAmenityIds.includes(amenity.id)}
                            onCheckedChange={() => toggleAmenity(amenity.id)}
                          />
                          <label
                            htmlFor={`amenity-${amenity.id}`}
                            className="text-sm cursor-pointer"
                          >
                            {amenity.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Room-type level amenities */}
      {roomTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bed className="h-5 w-5" />
              Room-Type Amenities
            </CardTitle>
            <CardDescription>
              Set in-room amenities for each room type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Room Type</Label>
              <Select
                value={selectedRoomTypeId}
                onValueChange={setSelectedRoomTypeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={String(rt.id)}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRoomTypeId && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {ROOM_IN_AMENITIES.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Checkbox
                        id={`room-amenity-${key}`}
                        checked={
                          !!roomAmenityCurrent[
                            key as keyof typeof roomAmenityCurrent
                          ]
                        }
                        onCheckedChange={() => toggleRoomAmenity(key)}
                      />
                      <label
                        htmlFor={`room-amenity-${key}`}
                        className="text-sm cursor-pointer"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() =>
                      updateRoomAmenityMutation.mutate({
                        roomId: selectedRoomTypeId,
                        data:
                          roomAmenityEdits[selectedRoomTypeId] ??
                          roomAmenityCurrent,
                      })
                    }
                    disabled={
                      updateRoomAmenityMutation.isPending ||
                      roomTypesUnavailable
                    }
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Room Amenities
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          data-testid="button-save-amenities"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Property Amenities"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhotosSection
// ─────────────────────────────────────────────────────────────────────────────

function PhotosSection({
  property,
  roomTypes,
  roomTypesUnavailable,
}: {
  property: Property;
  roomTypes: RoomType[];
  roomTypesUnavailable?: boolean;
}) {
  const { toast } = useToast();
  const [categorizedImages, setCategorizedImages] =
    useState<CategorizedPropertyImages>(
      (property as any).categorizedImages || defaultCategorizedImages,
    );
  const [roomTypeImages, setRoomTypeImages] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    const initial: Record<string, string[]> = {};
    roomTypes.forEach((rt) => {
      initial[String(rt.id)] = (rt as any).images || [];
    });
    setRoomTypeImages(initial);
  }, [roomTypes]);

  const updateMutation = useMutation({
    mutationFn: async () =>
      apiRequest("PATCH", `/api/properties/${property.id}`, {
        categorizedImages,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", String(property.id)],
      });
      toast({ title: "Saved", description: "Photos updated successfully." });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to save photos.",
        variant: "destructive",
      }),
  });

  // FIX 3: report per-room save success/failure together rather than spamming
  // a generic toast per failure with no indication of which rooms failed.
  const handleRoomTypeImagesChange = async (
    images: Record<string, string[]>,
  ) => {
    setRoomTypeImages(images);
    if (roomTypesUnavailable) {
      toast({
        title: "Couldn't save room photos",
        description:
          "Room data didn't load — please retry the room types tab and try again.",
        variant: "destructive",
      });
      return;
    }
    const failedRoomNames: string[] = [];
    let savedCount = 0;
    for (const [roomTypeId, imgs] of Object.entries(images)) {
      try {
        await apiRequest("PATCH", `/api/owner/room-types/${roomTypeId}`, {
          images: imgs,
        });
        savedCount++;
      } catch {
        const rt = roomTypes.find((r) => String(r.id) === roomTypeId);
        failedRoomNames.push(rt?.name || "an unnamed room");
      }
    }
    const total = savedCount + failedRoomNames.length;
    if (failedRoomNames.length > 0) {
      toast({
        title: "Some room photos didn't save",
        description: `Saved ${savedCount} of ${total}. Failed: ${failedRoomNames.join(", ")}. Please try again.`,
        variant: "destructive",
      });
    } else if (savedCount > 0) {
      toast({
        title: "Saved",
        description: `Updated photos for ${savedCount} room${savedCount === 1 ? "" : "s"}.`,
      });
    }
  };

  const rtForUploader = roomTypes.map((rt) => ({
    id: String(rt.id),
    name: rt.name,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Property Photos
          </CardTitle>
          <CardDescription>
            Upload high-quality photos (min. 100KB) to showcase your property to
            guests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyImageUploader
            value={categorizedImages}
            onChange={setCategorizedImages}
            roomTypes={rtForUploader}
            roomTypeImages={roomTypeImages}
            onRoomTypeImagesChange={handleRoomTypeImagesChange}
          />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Photos"}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SummarySection
// ─────────────────────────────────────────────────────────────────────────────

function SummarySection({
  property,
  roomTypes,
}: {
  property: Property;
  roomTypes: RoomType[];
}) {
  const p = property as any;

  const totalRooms = roomTypes.reduce(
    (sum, rt) => sum + ((rt as any).totalRooms ?? 0),
    0,
  );
  const minPrice = roomTypes.length
    ? Math.min(...roomTypes.map((rt) => parseFloat(rt.basePrice)))
    : null;

  const policyLabels: Record<string, string> = {
    flexible: "Free cancellation (Flexible)",
    moderate: "Partial refund (Moderate)",
    strict: "Non-refundable (Strict)",
    custom: "Custom policy",
  };

  const rules = [
    { label: "Couple-friendly", value: p.coupleFriendly },
    { label: "Pets allowed", value: p.petsAllowed },
    { label: "Smoking in room", value: p.smokingAllowed },
    { label: "Liquor in room", value: p.liquorAllowed },
    { label: "Visitors in room", value: p.visitorsAllowed },
    { label: "Hourly booking", value: p.hourlyBookingAllowed },
  ];

  const completeness = (() => {
    const checks = [
      !!property.title,
      !!property.description,
      !!p.starRating,
      !!p.contactEmail ||
        !!p.contactPhone ||
        !!p.whatsappNumber ||
        !!p.receptionNumber,
      !!property.checkInTime && !!property.checkOutTime,
      !!property.cancellationPolicyConfigured,
      (p.acceptedLocalIdTypes?.length ?? 0) > 0,
      !!property.latitude && !!property.longitude,
      roomTypes.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  })();

  return (
    <div className="space-y-6">
      {/* Completeness bar */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Profile completeness</span>
            <span className="text-sm font-bold text-primary">
              {completeness}%
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          {completeness < 100 && (
            <p className="text-xs text-muted-foreground mt-2">
              Fill in the missing details across the tabs above to improve your
              listing visibility.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Property */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Property
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{property.title || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="capitalize">{property.propertyType || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Star rating</span>
            <span>
              {p.starRating
                ? Array.from({ length: p.starRating }).map((_, i) => (
                    <Star
                      key={i}
                      className="inline h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    />
                  ))
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Destination</span>
            <span>{property.destination || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant={
                property.status === "published" ? "default" : "secondary"
              }
              className="capitalize"
            >
              {property.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Rooms & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bed className="h-4 w-4" /> Rooms &amp; Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room types</span>
            <span>
              {roomTypes.length > 0
                ? roomTypes.map((r) => r.name).join(", ")
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total rooms</span>
            <span>{totalRooms > 0 ? totalRooms : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Starting price</span>
            <span>
              {minPrice ? `₹${minPrice.toLocaleString("en-IN")}/night` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-in</span>
            <span>{property.checkInTime || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Check-out</span>
            <span>{property.checkOutTime || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cancellation</span>
            <span>
              {policyLabels[property.cancellationPolicyType ?? ""] ?? "Not set"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Local IDs accepted</span>
            <span>
              {(p.acceptedLocalIdTypes?.length ?? 0) > 0
                ? p.acceptedLocalIdTypes.join(", ")
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Foreign IDs accepted</span>
            <span>
              {(p.acceptedForeignIdTypes?.length ?? 0) > 0
                ? p.acceptedForeignIdTypes.join(", ")
                : "—"}
            </span>
          </div>
          <div className="pt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {rules.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${value ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span
                  className={
                    value ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Channel manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" /> Channel Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Enabled</span>
            <span>{p.channelManagerEnabled ? "Yes" : "No"}</span>
          </div>
          {p.channelManagerEnabled && (
            <div className="flex justify-between mt-2">
              <span className="text-muted-foreground">Manager</span>
              <span>
                {p.channelManagerName === "Other"
                  ? p.channelManagerNameCustom || "Other"
                  : p.channelManagerName || "—"}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact (visible to owner only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4" /> Contact Details
            <Badge variant="outline" className="text-xs ml-1">
              Owner only
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { label: "Email", value: p.contactEmail },
            { label: "Contact No.", value: p.contactPhone },
            { label: "WhatsApp", value: p.whatsappNumber },
            { label: "Reception", value: p.receptionNumber },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span>{value || "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Location
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">City / State</span>
            <span>
              {[property.propCity, property.propState]
                .filter(Boolean)
                .join(", ") || "—"}
            </span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-muted-foreground">GPS verified</span>
            {property.latitude && property.longitude ? (
              <Badge variant="default" className="text-xs bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" /> Verified
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs text-destructive border-destructive"
              >
                <AlertTriangle className="h-3 w-3 mr-1" /> Not set
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
