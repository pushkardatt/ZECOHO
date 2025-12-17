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
} from "lucide-react";
import type { Property, AvailabilityOverride } from "@shared/schema";

export default function OwnerPropertyManage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pricing");

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ["/api/properties", id],
    enabled: !!id,
  });

  const { data: overrides = [], isLoading: overridesLoading } = useQuery<AvailabilityOverride[]>({
    queryKey: ["/api/properties", id, "availability-overrides"],
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
          <TabsList className="grid grid-cols-3 w-full max-w-md">
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

          <TabsContent value="pricing" className="mt-6">
            <PricingSection property={property} />
          </TabsContent>

          <TabsContent value="availability" className="mt-6">
            <AvailabilitySection 
              propertyId={id!} 
              overrides={overrides} 
              isLoading={overridesLoading} 
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
  isLoading 
}: { 
  propertyId: string; 
  overrides: AvailabilityOverride[]; 
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [overrideType, setOverrideType] = useState<string>("hold");
  const [reason, setReason] = useState("");
  const [availableRooms, setAvailableRooms] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: async (data: { overrideType: string; startDate: Date; endDate: Date; reason?: string; availableRooms?: number }) => {
      return apiRequest("POST", `/api/properties/${propertyId}/availability-overrides`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "availability-overrides"] });
      setStartDate(undefined);
      setEndDate(undefined);
      setReason("");
      setAvailableRooms("");
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
    });
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
