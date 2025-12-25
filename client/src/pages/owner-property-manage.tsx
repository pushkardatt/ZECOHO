import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { OwnerLayout } from "@/components/OwnerLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import {
  ArrowLeft,
  IndianRupee,
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
  Utensils,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Property, AvailabilityOverride, RoomType, RoomOption } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";

export default function OwnerPropertyManage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rooms");

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  const { data: overrides = [], isLoading: overridesLoading } = useQuery<AvailabilityOverride[]>({
    queryKey: ["/api/properties", id, "availability-overrides"],
    enabled: !!id,
  });

  const { data: roomTypes = [], isLoading: roomTypesLoading } = useQuery<RoomType[]>({
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

  if (!property) {
    return (
      <OwnerLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">Property not found</h2>
          <Link href="/owner/my-property">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Properties
            </Button>
          </Link>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="space-y-6" data-testid="owner-property-manage">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/owner/my-property">
              <Button variant="ghost" size="icon" data-testid="back-to-properties">
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
              <Button variant="outline" size="sm" data-testid="view-public-listing">
                <Eye className="h-4 w-4 mr-2" />
                View Listing
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="rooms" data-testid="tab-rooms">
              <Bed className="h-4 w-4 mr-2" />
              Rooms
            </TabsTrigger>
            <TabsTrigger value="pricing" data-testid="tab-pricing">
              <IndianRupee className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="availability" data-testid="tab-availability">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Availability
            </TabsTrigger>
            <TabsTrigger value="status" data-testid="tab-status">
              <Settings className="h-4 w-4 mr-2" />
              Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rooms" className="mt-6">
            <RoomsSection 
              propertyId={id!} 
              roomTypes={roomTypes} 
              isLoading={roomTypesLoading} 
            />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <PricingSection property={property} />
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            <AvailabilitySection 
              propertyId={id!} 
              overrides={overrides} 
              isLoading={overridesLoading}
              roomTypes={roomTypes}
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

function PropertyStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    published: { variant: "default", label: "Published" },
    draft: { variant: "secondary", label: "Draft" },
    pending: { variant: "outline", label: "Pending Review" },
    paused: { variant: "outline", label: "Paused" },
    deactivated: { variant: "destructive", label: "Deactivated" },
  };
  const { variant, label } = config[status] || { variant: "secondary", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

function PricingSection({ property }: { property: Property }) {
  const { toast } = useToast();
  const [pricePerNight, setPricePerNight] = useState(property.pricePerNight || "");
  const [singleOccupancy, setSingleOccupancy] = useState(property.singleOccupancyPrice || "");
  const [doubleOccupancy, setDoubleOccupancy] = useState(property.doubleOccupancyPrice || "");
  const [tripleOccupancy, setTripleOccupancy] = useState(property.tripleOccupancyPrice || "");
  const [bulkEnabled, setBulkEnabled] = useState(property.bulkBookingEnabled || false);
  const [bulkMinRooms, setBulkMinRooms] = useState(String(property.bulkBookingMinRooms || 5));
  const [bulkDiscount, setBulkDiscount] = useState(property.bulkBookingDiscountPercent || "10");

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      return apiRequest("PATCH", `/api/properties/${property.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
      toast({
        title: "Pricing Updated",
        description: "Your property pricing has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pricing.",
        variant: "destructive",
      });
    },
  });

  const handleSavePricing = () => {
    updateMutation.mutate({
      pricePerNight: pricePerNight || property.pricePerNight,
      singleOccupancyPrice: singleOccupancy || null,
      doubleOccupancyPrice: doubleOccupancy || null,
      tripleOccupancyPrice: tripleOccupancy || null,
      bulkBookingEnabled: bulkEnabled,
      bulkBookingMinRooms: bulkEnabled ? parseInt(bulkMinRooms) : null,
      bulkBookingDiscountPercent: bulkEnabled ? bulkDiscount : null,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Base Pricing</CardTitle>
          <CardDescription>Set your standard nightly rate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pricePerNight">Price per Night (₹)</Label>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
              <Input
                id="pricePerNight"
                type="number"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                placeholder="2000"
                className="max-w-xs"
                data-testid="input-price-per-night"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Occupancy-Based Pricing</CardTitle>
          <CardDescription>Set different prices based on number of guests per room (optional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="singleOccupancy">Single Occupancy (₹)</Label>
              <Input
                id="singleOccupancy"
                type="number"
                value={singleOccupancy}
                onChange={(e) => setSingleOccupancy(e.target.value)}
                placeholder="1500"
                data-testid="input-single-occupancy"
              />
              <p className="text-xs text-muted-foreground">1 guest per room</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doubleOccupancy">Double Occupancy (₹)</Label>
              <Input
                id="doubleOccupancy"
                type="number"
                value={doubleOccupancy}
                onChange={(e) => setDoubleOccupancy(e.target.value)}
                placeholder="2000"
                data-testid="input-double-occupancy"
              />
              <p className="text-xs text-muted-foreground">2 guests per room</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tripleOccupancy">Triple Occupancy (₹)</Label>
              <Input
                id="tripleOccupancy"
                type="number"
                value={tripleOccupancy}
                onChange={(e) => setTripleOccupancy(e.target.value)}
                placeholder="2500"
                data-testid="input-triple-occupancy"
              />
              <p className="text-xs text-muted-foreground">3 guests per room</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Booking Discount</CardTitle>
          <CardDescription>Offer discounts for guests booking multiple rooms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bulkEnabled}
                onChange={(e) => setBulkEnabled(e.target.checked)}
                className="rounded border-gray-300"
                data-testid="checkbox-bulk-enabled"
              />
              <span>Enable bulk booking discount</span>
            </label>
          </div>
          
          {bulkEnabled && (
            <div className="grid gap-4 md:grid-cols-2 pt-2">
              <div className="space-y-2">
                <Label htmlFor="bulkMinRooms">Minimum Rooms for Discount</Label>
                <Input
                  id="bulkMinRooms"
                  type="number"
                  value={bulkMinRooms}
                  onChange={(e) => setBulkMinRooms(e.target.value)}
                  min="2"
                  data-testid="input-bulk-min-rooms"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkDiscount">Discount Percentage (%)</Label>
                <Input
                  id="bulkDiscount"
                  type="number"
                  value={bulkDiscount}
                  onChange={(e) => setBulkDiscount(e.target.value)}
                  min="1"
                  max="50"
                  data-testid="input-bulk-discount"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSavePricing} 
          disabled={updateMutation.isPending}
          data-testid="save-pricing"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Pricing"}
        </Button>
      </div>
    </div>
  );
}

function AvailabilitySection({ 
  propertyId, 
  overrides, 
  isLoading,
  roomTypes = []
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
    mutationFn: async (data: { overrideType: string; startDate: Date; endDate: Date; reason?: string; availableRooms?: number; roomTypeId?: string }) => {
      return apiRequest("POST", `/api/properties/${propertyId}/availability-overrides`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "availability-overrides"] });
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
      return apiRequest("DELETE", `/api/properties/${propertyId}/availability-overrides/${overrideId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "availability-overrides"] });
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
    const roomType = roomTypes.find(rt => rt.id === roomTypeId);
    return roomType ? roomType.name : "Unknown Room Type";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "hold": return "Temporary Hold";
      case "sold_out": return "Sold Out";
      case "maintenance": return "Maintenance";
      default: return type;
    }
  };

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "hold": return "outline";
      case "sold_out": return "destructive";
      case "maintenance": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Block Dates</CardTitle>
          <CardDescription>
            Mark dates as unavailable for bookings. Use this for maintenance, personal use, or when rooms are sold through other channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left" data-testid="select-start-date">
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
                  <Button variant="outline" className="w-full justify-start text-left" data-testid="select-end-date">
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
              <Select value={selectedRoomTypeId || "all"} onValueChange={(val) => setSelectedRoomTypeId(val === "all" ? "" : val)}>
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
                Set to 0 to block all rooms. Leave empty for complete unavailability.
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
          <CardDescription>View and manage your blocked date ranges</CardDescription>
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
                    {override.availableRooms !== null && override.availableRooms !== undefined && (
                      <Badge variant="secondary">
                        {override.availableRooms} rooms available
                      </Badge>
                    )}
                    <div>
                      <p className="font-medium">
                        {format(new Date(override.startDate), "MMM d, yyyy")} - {format(new Date(override.endDate), "MMM d, yyyy")}
                      </p>
                      {override.reason && (
                        <p className="text-sm text-muted-foreground">{override.reason}</p>
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

  const updateStatusMutation = useMutation({
    mutationFn: async (action: "pause" | "resume" | "deactivate") => {
      return apiRequest("PATCH", `/api/properties/${property.id}/${action}`, {});
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", property.id] });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Property Status</CardTitle>
          <CardDescription>Control your property's visibility and booking availability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-full ${
                property.status === "published" ? "bg-green-100 text-green-600" :
                property.status === "paused" ? "bg-amber-100 text-amber-600" :
                "bg-gray-100 text-gray-600"
              }`}>
                {property.status === "published" ? <CheckCircle className="h-5 w-5" /> :
                 property.status === "paused" ? <Pause className="h-5 w-5" /> :
                 <Ban className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-medium">Current Status: <span className="capitalize">{property.status}</span></p>
                <p className="text-sm text-muted-foreground">
                  {property.status === "published" ? "Your property is visible and accepting bookings" :
                   property.status === "paused" ? "Your property is hidden from search results" :
                   property.status === "draft" ? "Complete your listing to publish" :
                   "Your property is not accepting bookings"}
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
                        Temporarily hide your property from search results. Existing bookings won't be affected.
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
                        Make your property visible again and start accepting new bookings.
                      </p>
                      <Button 
                        onClick={() => updateStatusMutation.mutate("resume")}
                        disabled={updateStatusMutation.isPending}
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
                    <div>
                      <h4 className="font-medium">Deactivate Listing</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        Permanently remove your property from the platform. This action can be reversed later.
                      </p>
                      <Button 
                        variant="destructive"
                        onClick={() => updateStatusMutation.mutate("deactivate")}
                        disabled={updateStatusMutation.isPending}
                        data-testid="deactivate-property"
                      >
                        Deactivate Property
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RoomsSection({ 
  propertyId, 
  roomTypes, 
  isLoading 
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

  const createRoomMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; maxGuests: number; totalRooms: number; basePrice: string }) => {
      return apiRequest("POST", `/api/properties/${propertyId}/rooms`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "rooms"] });
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
    mutationFn: async ({ roomId, data }: { roomId: string; data: Partial<RoomType> }) => {
      return apiRequest("PATCH", `/api/properties/${propertyId}/rooms/${roomId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "rooms"] });
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
      return apiRequest("DELETE", `/api/properties/${propertyId}/rooms/${roomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "rooms"] });
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
    if (!newRoomPrice) {
      toast({
        title: "Price Required",
        description: "Please enter a base price.",
        variant: "destructive",
      });
      return;
    }

    createRoomMutation.mutate({
      name: newRoomName.trim(),
      description: newRoomDescription.trim() || undefined,
      maxGuests: parseInt(newRoomCapacity),
      totalRooms: parseInt(newRoomCount),
      basePrice: newRoomPrice,
    });
  };

  const toggleExpanded = (roomId: string) => {
    setExpandedRooms(prev => {
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Room Types</CardTitle>
              <CardDescription>
                Manage room types, pricing, and meal plans for your property
              </CardDescription>
            </div>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)} data-testid="add-room-type">
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
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="roomName">Room Type Name *</Label>
                    <Input
                      id="roomName"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g., Deluxe Room, Family Suite"
                      data-testid="input-new-room-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roomPrice">Base Price per Night (₹) *</Label>
                    <Input
                      id="roomPrice"
                      type="number"
                      min="100"
                      value={newRoomPrice}
                      onChange={(e) => setNewRoomPrice(e.target.value)}
                      placeholder="e.g., 2500"
                      data-testid="input-new-room-price"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomDescription">Description</Label>
                  <Textarea
                    id="roomDescription"
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder="Describe the room features, view, amenities..."
                    rows={3}
                    data-testid="input-new-room-description"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
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
                  <div className="space-y-2">
                    <Label htmlFor="roomCount">Total Rooms Available</Label>
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
                <p className="text-sm text-muted-foreground">
                  Default meal options (Room Only, Breakfast, Half Board, Full Board) will be added automatically. You can customize them after adding the room.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddRoom}
                    disabled={createRoomMutation.isPending}
                    data-testid="save-new-room"
                  >
                    {createRoomMutation.isPending ? "Adding..." : "Add Room Type"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { setShowAddForm(false); resetForm(); }}
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
              <p className="text-sm">Add room types to offer different accommodations with specific pricing and meal plans.</p>
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
                  onSave={(data) => updateRoomMutation.mutate({ roomId: room.id, data })}
                  onDelete={() => deleteRoomMutation.mutate(room.id)}
                  isSaving={updateRoomMutation.isPending}
                  isDeleting={deleteRoomMutation.isPending}
                />
              ))}
              <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
                <strong>Tip:</strong> Click on a room type to expand and manage its meal plans. The final price shown to customers is: Room Base Price + Meal Option Price Adjustment.
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
  const [editName, setEditName] = useState(room.name);
  const [editDescription, setEditDescription] = useState(room.description || "");
  const [editMaxGuests, setEditMaxGuests] = useState(String(room.maxGuests));
  const [editTotalRooms, setEditTotalRooms] = useState(String(room.totalRooms || 1));
  const [editPrice, setEditPrice] = useState(room.basePrice || "");
  const [editActive, setEditActive] = useState(room.isActive ?? true);
  const [editSingleOccupancyBase, setEditSingleOccupancyBase] = useState(String(room.singleOccupancyBase || 1));
  const [editDoubleOccupancy, setEditDoubleOccupancy] = useState(room.doubleOccupancyAdjustment || "");
  const [editTripleOccupancy, setEditTripleOccupancy] = useState(room.tripleOccupancyAdjustment || "");
  
  // Fetch meal plan count for this room
  const { data: mealOptions = [] } = useQuery<RoomOption[]>({
    queryKey: ["/api/rooms", room.id, "options"],
  });

  const handleSave = () => {
    onSave({
      name: editName,
      description: editDescription || null,
      maxGuests: parseInt(editMaxGuests),
      totalRooms: parseInt(editTotalRooms),
      basePrice: editPrice,
      isActive: editActive,
      singleOccupancyBase: parseInt(editSingleOccupancyBase) || 1,
      doubleOccupancyAdjustment: editDoubleOccupancy || null,
      tripleOccupancyAdjustment: editTripleOccupancy || null,
    });
  };

  // Reset edit form when room changes
  const resetEditForm = () => {
    setEditName(room.name);
    setEditDescription(room.description || "");
    setEditMaxGuests(String(room.maxGuests));
    setEditTotalRooms(String(room.totalRooms || 1));
    setEditPrice(room.basePrice || "");
    setEditActive(room.isActive ?? true);
    setEditSingleOccupancyBase(String(room.singleOccupancyBase || 1));
    setEditDoubleOccupancy(room.doubleOccupancyAdjustment || "");
    setEditTripleOccupancy(room.tripleOccupancyAdjustment || "");
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="border rounded-lg overflow-hidden" data-testid={`room-type-${room.id}`}>
        <div className="flex items-center justify-between p-4 bg-muted/30">
          <div className="flex items-center gap-4 flex-wrap">
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
                {room.basePrice && (
                  <Badge variant="default">₹{room.basePrice}/night</Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <Utensils className="h-3 w-3" />
                  {mealOptions.length} meal plans
                </Badge>
                {room.isActive === false && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave} disabled={isSaving} data-testid={`save-room-${room.id}`}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { onCancelEdit(); resetEditForm(); }} data-testid={`cancel-edit-room-${room.id}`}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={onEdit} data-testid={`edit-room-${room.id}`}>
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
                <CollapsibleTrigger asChild>
                  <Button size="sm" variant="ghost" data-testid={`expand-room-${room.id}`}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="p-4 border-t space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Room description..."
                rows={2}
                data-testid={`edit-room-description-${room.id}`}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Max Guests</Label>
                <Input
                  type="number"
                  min="1"
                  value={editMaxGuests}
                  onChange={(e) => setEditMaxGuests(e.target.value)}
                  data-testid={`edit-room-capacity-${room.id}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Rooms Available</Label>
                <Input
                  type="number"
                  min="1"
                  value={editTotalRooms}
                  onChange={(e) => setEditTotalRooms(e.target.value)}
                  data-testid={`edit-room-count-${room.id}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Base Price per Night (₹)</Label>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  data-testid={`edit-room-price-${room.id}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Active</Label>
                <div className="flex items-center gap-2 pt-2">
                  <Switch
                    checked={editActive}
                    onCheckedChange={setEditActive}
                    data-testid={`edit-room-active-${room.id}`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {editActive ? "Accepting bookings" : "Not accepting bookings"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Occupancy-Based Pricing</Label>
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Set extra charges when guest count exceeds the base occupancy. Base price applies for single occupancy.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs">Single Occupancy (Base)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="3"
                      value={editSingleOccupancyBase}
                      onChange={(e) => setEditSingleOccupancyBase(e.target.value)}
                      className="w-20"
                      data-testid={`edit-room-single-occupancy-${room.id}`}
                    />
                    <span className="text-xs text-muted-foreground">guest(s) at base price</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Double Occupancy (+₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editDoubleOccupancy}
                    onChange={(e) => setEditDoubleOccupancy(e.target.value)}
                    placeholder="e.g., 500"
                    data-testid={`edit-room-double-occupancy-${room.id}`}
                  />
                  <p className="text-xs text-muted-foreground">Extra per night for 2 guests</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Triple Occupancy (+₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editTripleOccupancy}
                    onChange={(e) => setEditTripleOccupancy(e.target.value)}
                    placeholder="e.g., 1000"
                    data-testid={`edit-room-triple-occupancy-${room.id}`}
                  />
                  <p className="text-xs text-muted-foreground">Extra per night for 3+ guests</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <CollapsibleContent>
          <div className="p-4 border-t">
            <RoomOptionsSection roomId={room.id} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const PRESET_MEAL_OPTIONS = [
  { name: "Room Only", priceAdjustment: "0", inclusions: "No meals included" },
  { name: "Breakfast Included", priceAdjustment: "300", inclusions: "Daily breakfast buffet" },
  { name: "Half Board", priceAdjustment: "600", inclusions: "Breakfast and dinner included" },
  { name: "Full Board", priceAdjustment: "900", inclusions: "All meals included (breakfast, lunch, dinner)" },
];

function RoomOptionsSection({ roomId }: { roomId: string }) {
  const { toast } = useToast();
  const [showAddOption, setShowAddOption] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("");
  const [newOptionInclusions, setNewOptionInclusions] = useState("");

  const { data: options = [], isLoading } = useQuery<RoomOption[]>({
    queryKey: ["/api/rooms", roomId, "options"],
  });

  const createOptionMutation = useMutation({
    mutationFn: async (data: { name: string; priceAdjustment: string; inclusions?: string }) => {
      return apiRequest("POST", `/api/rooms/${roomId}/options`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId, "options"] });
      setShowAddOption(false);
      setSelectedPreset("");
      setNewOptionName("");
      setNewOptionPrice("");
      setNewOptionInclusions("");
      toast({
        title: "Plan Added",
        description: "Meal plan has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add meal plan.",
        variant: "destructive",
      });
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return apiRequest("DELETE", `/api/rooms/${roomId}/options/${optionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomId, "options"] });
      toast({
        title: "Plan Removed",
        description: "Meal plan has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove meal plan.",
        variant: "destructive",
      });
    },
  });

  const handlePresetSelect = (presetName: string) => {
    setSelectedPreset(presetName);
    if (presetName === "custom") {
      setNewOptionName("");
      setNewOptionPrice("");
      setNewOptionInclusions("");
    } else {
      const preset = PRESET_MEAL_OPTIONS.find(p => p.name === presetName);
      if (preset) {
        setNewOptionName(preset.name);
        setNewOptionPrice(preset.priceAdjustment);
        setNewOptionInclusions(preset.inclusions);
      }
    }
  };

  const handleAddOption = () => {
    if (!newOptionName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a plan name.",
        variant: "destructive",
      });
      return;
    }

    createOptionMutation.mutate({
      name: newOptionName.trim(),
      priceAdjustment: newOptionPrice || "0",
      inclusions: newOptionInclusions.trim() || undefined,
    });
  };

  const handleQuickAdd = (preset: typeof PRESET_MEAL_OPTIONS[0]) => {
    createOptionMutation.mutate({
      name: preset.name,
      priceAdjustment: preset.priceAdjustment,
      inclusions: preset.inclusions,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Meal Plans & Options</span>
        </div>
        {!showAddOption && (
          <Button size="sm" variant="outline" onClick={() => setShowAddOption(true)} data-testid={`add-option-${roomId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Plan
          </Button>
        )}
      </div>

      {showAddOption && (
        <Card className="border-dashed border-primary/30">
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Quick Add Preset Plans</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {PRESET_MEAL_OPTIONS.map((preset) => {
                  const alreadyExists = options.some(o => o.name === preset.name);
                  return (
                    <Button
                      key={preset.name}
                      type="button"
                      variant={alreadyExists ? "secondary" : "outline"}
                      size="sm"
                      className="justify-start h-auto py-2 px-3"
                      onClick={() => !alreadyExists && handleQuickAdd(preset)}
                      disabled={alreadyExists || createOptionMutation.isPending}
                      data-testid={`quick-add-${preset.name.toLowerCase().replace(/\s+/g, '-')}-${roomId}`}
                    >
                      <div className="text-left">
                        <div className="font-medium text-xs">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {preset.priceAdjustment === "0" ? "Included" : `+₹${preset.priceAdjustment}`}
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or add custom plan</span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="e.g., Early Bird Breakfast"
                  data-testid={`input-option-name-${roomId}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Price Adjustment (₹)</Label>
                <Input
                  type="number"
                  value={newOptionPrice}
                  onChange={(e) => setNewOptionPrice(e.target.value)}
                  placeholder="0"
                  data-testid={`input-option-price-${roomId}`}
                />
                <p className="text-xs text-muted-foreground">Additional cost per night</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>What's Included</Label>
              <Input
                value={newOptionInclusions}
                onChange={(e) => setNewOptionInclusions(e.target.value)}
                placeholder="e.g., Continental breakfast, Tea/coffee"
                data-testid={`input-option-inclusions-${roomId}`}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm"
                onClick={handleAddOption}
                disabled={createOptionMutation.isPending || !newOptionName.trim()}
                data-testid={`save-option-${roomId}`}
              >
                {createOptionMutation.isPending ? "Adding..." : "Add Custom Plan"}
              </Button>
              <Button 
                size="sm"
                variant="outline" 
                onClick={() => {
                  setShowAddOption(false);
                  setSelectedPreset("");
                  setNewOptionName("");
                  setNewOptionPrice("");
                  setNewOptionInclusions("");
                }}
                data-testid={`cancel-option-${roomId}`}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No meal plans added. Add plans to offer different booking options.
        </p>
      ) : (
        <div className="space-y-2">
          {options.map((option) => (
            <div 
              key={option.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-background"
              data-testid={`option-${option.id}`}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium">{option.name}</span>
                {Number(option.priceAdjustment) === 0 ? (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Included
                  </Badge>
                ) : (
                  <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                    +₹{option.priceAdjustment}
                  </Badge>
                )}
                {option.isActive === false && (
                  <Badge variant="destructive">Inactive</Badge>
                )}
                {option.inclusions && (
                  <span className="text-sm text-muted-foreground">{option.inclusions}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  data-testid={`edit-option-${option.id}`}
                >
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => deleteOptionMutation.mutate(option.id)}
                  disabled={deleteOptionMutation.isPending}
                  data-testid={`delete-option-${option.id}`}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
