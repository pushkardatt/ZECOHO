import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Edit,
  Bed,
  UtensilsCrossed,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Tag,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface WizardRoomType {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  originalPrice?: number; // Strike-off price (if set and > basePrice, shows discount)
  singleOccupancyBase?: number; // Number of guests included in base price (default 1)
  doubleOccupancyAdjustment?: number; // Extra charge for 2 guests
  tripleOccupancyAdjustment?: number; // Extra charge for 3+ guests
  maxGuests: number;
  totalRooms: number;
  mealOptions: WizardMealOption[];
}

export interface WizardMealOption {
  id: string;
  name: string;
  inclusions?: string;
  isActive?: boolean;
  priceAdjustment: number;
}

interface RoomTypeBuilderProps {
  value: WizardRoomType[];
  onChange: (roomTypes: WizardRoomType[]) => void;
  propertyType?: string;
}

const generateId = () =>
  `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_MEAL_OPTIONS: Omit<WizardMealOption, "id">[] = [
  {
    name: "Room Only (Best Price)",
    priceAdjustment: 0,
    inclusions: "No meals included",
  },
  {
    name: "Breakfast Included",
    priceAdjustment: 300,
    inclusions: "Daily breakfast buffet",
  },
  {
    name: "Breakfast + Dinner/Lunch",
    priceAdjustment: 600,
    inclusions: "Breakfast and dinner or lunch included",
  },
  {
    name: "All Meals Included",
    priceAdjustment: 900,
    inclusions: "All meals included (breakfast, lunch, dinner)",
  },
];

export function RoomTypeBuilder({
  value,
  onChange,
  propertyType,
}: RoomTypeBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomPrice, setNewRoomPrice] = useState("");
  const [newRoomOriginalPrice, setNewRoomOriginalPrice] = useState("");
  const [showStrikeOffPrice, setShowStrikeOffPrice] = useState(false);
  const [newRoomMaxGuests, setNewRoomMaxGuests] = useState("2");
  const [newRoomTotalRooms, setNewRoomTotalRooms] = useState("1");
  const [newSingleOccupancyBase, setNewSingleOccupancyBase] = useState("1");
  const [newDoubleOccupancyAdjustment, setNewDoubleOccupancyAdjustment] =
    useState("");
  const [newTripleOccupancyAdjustment, setNewTripleOccupancyAdjustment] =
    useState("");

  const resetForm = () => {
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomPrice("");
    setNewRoomOriginalPrice("");
    setShowStrikeOffPrice(false);
    setNewRoomMaxGuests("2");
    setNewRoomTotalRooms("1");
    setNewSingleOccupancyBase("1");
    setNewDoubleOccupancyAdjustment("");
    setNewTripleOccupancyAdjustment("");
  };

  const handleAddRoom = () => {
    const price = parseFloat(newRoomPrice);
    const originalPrice =
      showStrikeOffPrice && newRoomOriginalPrice
        ? parseFloat(newRoomOriginalPrice)
        : undefined;
    const maxGuests = parseInt(newRoomMaxGuests);
    const totalRooms = parseInt(newRoomTotalRooms);
    const singleOccupancyBase = parseInt(newSingleOccupancyBase) || 1;
    const doubleAdj = newDoubleOccupancyAdjustment
      ? parseFloat(newDoubleOccupancyAdjustment)
      : undefined;
    const tripleAdj = newTripleOccupancyAdjustment
      ? parseFloat(newTripleOccupancyAdjustment)
      : undefined;

    if (!newRoomName || !newRoomPrice || isNaN(price) || price < 100) return;
    if (isNaN(maxGuests) || maxGuests < 1) return;
    if (isNaN(totalRooms) || totalRooms < 1) return;
    // Validate original price must be greater than selling price
    if (originalPrice !== undefined && originalPrice <= price) return;

    const newRoom: WizardRoomType = {
      id: generateId(),
      name: newRoomName,
      description: newRoomDescription || undefined,
      basePrice: price,
      originalPrice: originalPrice,
      singleOccupancyBase: singleOccupancyBase,
      doubleOccupancyAdjustment: doubleAdj,
      tripleOccupancyAdjustment: tripleAdj,
      maxGuests: maxGuests,
      totalRooms: totalRooms,
      mealOptions: DEFAULT_MEAL_OPTIONS.map((opt) => ({
        ...opt,
        id: generateId(),
      })),
    };

    onChange([...value, newRoom]);
    resetForm();
    setShowAddForm(false);
    setExpandedRooms((prev) => new Set([...Array.from(prev), newRoom.id]));
  };

  const handleDeleteRoom = (roomId: string) => {
    onChange(value.filter((r) => r.id !== roomId));
    expandedRooms.delete(roomId);
    setExpandedRooms(new Set(expandedRooms));
  };

  const handleUpdateRoom = (
    roomId: string,
    updates: Partial<WizardRoomType>,
  ) => {
    onChange(value.map((r) => (r.id === roomId ? { ...r, ...updates } : r)));
    setEditingRoom(null);
  };

  const handleAddMealOption = (
    roomId: string,
    option: Omit<WizardMealOption, "id">,
  ) => {
    onChange(
      value.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          mealOptions: [...r.mealOptions, { ...option, id: generateId() }],
        };
      }),
    );
  };

  const handleDeleteMealOption = (roomId: string, optionId: string) => {
    onChange(
      value.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          mealOptions: r.mealOptions.filter((o) => o.id !== optionId),
        };
      }),
    );
  };

  const handleUpdateMealOption = (
    roomId: string,
    optionId: string,
    updates: Partial<WizardMealOption>,
  ) => {
    onChange(
      value.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          mealOptions: r.mealOptions.map((o) =>
            o.id === optionId ? { ...o, ...updates } : o,
          ),
        };
      }),
    );
  };

  const toggleExpand = (roomId: string) => {
    const newExpanded = new Set(expandedRooms);
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId);
    } else {
      newExpanded.add(roomId);
    }
    setExpandedRooms(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bed className="h-5 w-5" />
          Room Types & Pricing
        </CardTitle>
        <CardDescription>
          Add different room categories with their pricing and meal plans. Each
          room type can have multiple meal options. Meal prices are charged per
          person per night.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowAddForm(true)}
            data-testid="button-add-room-type"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Room Type
          </Button>
        )}

        {showAddForm && (
          <Card className="border-dashed border-2 border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">New Room Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Room Type Name *</Label>
                  <Input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g., Deluxe Room, Family Suite"
                    data-testid="input-new-room-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price per Night (₹) *</Label>
                  <Input
                    type="number"
                    min="100"
                    value={newRoomPrice}
                    onChange={(e) => setNewRoomPrice(e.target.value)}
                    placeholder="e.g., 2500"
                    data-testid="input-new-room-price"
                  />
                </div>
              </div>

              {/* Strike-off Price Section */}
              <div className="border rounded-lg p-4 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-emerald-600" />
                    <Label className="text-sm font-medium">
                      Show Discount (Strike-off Price)
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      Optional
                    </Badge>
                  </div>
                  <Switch
                    checked={showStrikeOffPrice}
                    onCheckedChange={setShowStrikeOffPrice}
                    data-testid="switch-strike-off-price"
                  />
                </div>
                {showStrikeOffPrice && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Original Price (₹) - will be shown struck through
                    </Label>
                    <Input
                      type="number"
                      min="100"
                      value={newRoomOriginalPrice}
                      onChange={(e) => setNewRoomOriginalPrice(e.target.value)}
                      placeholder="e.g., 3500"
                      data-testid="input-new-room-original-price"
                    />
                    {newRoomOriginalPrice &&
                      newRoomPrice &&
                      parseFloat(newRoomOriginalPrice) <=
                        parseFloat(newRoomPrice) && (
                        <p className="text-xs text-destructive">
                          Original price must be higher than selling price
                        </p>
                      )}
                    {newRoomOriginalPrice &&
                      newRoomPrice &&
                      parseFloat(newRoomOriginalPrice) >
                        parseFloat(newRoomPrice) && (
                        <p className="text-xs text-emerald-600">
                          Customers will see:{" "}
                          <span className="line-through">
                            ₹
                            {Number(newRoomOriginalPrice).toLocaleString(
                              "en-IN",
                            )}
                          </span>{" "}
                          <span className="font-semibold">
                            ₹{Number(newRoomPrice).toLocaleString("en-IN")}
                          </span>{" "}
                          (
                          {Math.round(
                            (1 -
                              parseFloat(newRoomPrice) /
                                parseFloat(newRoomOriginalPrice)) *
                              100,
                          )}
                          % off)
                        </p>
                      )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newRoomDescription}
                  onChange={(e) => setNewRoomDescription(e.target.value)}
                  placeholder="Describe the room features, view, amenities..."
                  rows={2}
                  data-testid="textarea-new-room-description"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Max Guests</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newRoomMaxGuests}
                    onChange={(e) => setNewRoomMaxGuests(e.target.value)}
                    data-testid="input-new-room-max-guests"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Rooms Available</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newRoomTotalRooms}
                    onChange={(e) => setNewRoomTotalRooms(e.target.value)}
                    data-testid="input-new-room-total-rooms"
                  />
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">
                    Occupancy-Based Pricing
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    Optional
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set the price charged per night based on number of guests.
                  Leave 2-guest and 3-guest prices blank to use the base price for all.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">1 Guest — Price/Night (₹)</Label>
                    <Input
                      type="number"
                      min="100"
                      value={newRoomPrice}
                      onChange={(e) => setNewRoomPrice(e.target.value)}
                      placeholder="e.g., 2000"
                      data-testid="input-new-room-single-occupancy"
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">Same as selling price above</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">2 Guests — Price/Night (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newDoubleOccupancyAdjustment}
                      onChange={(e) =>
                        setNewDoubleOccupancyAdjustment(e.target.value)
                      }
                      placeholder="e.g., 2500"
                      data-testid="input-new-room-double-occupancy"
                    />
                    {newDoubleOccupancyAdjustment && newRoomPrice && (
                      <p className="text-xs text-primary">
                        +₹{Math.max(0, parseFloat(newDoubleOccupancyAdjustment) - parseFloat(newRoomPrice || "0")).toLocaleString("en-IN")} extra vs. 1 guest
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">3+ Guests — Price/Night (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newTripleOccupancyAdjustment}
                      onChange={(e) =>
                        setNewTripleOccupancyAdjustment(e.target.value)
                      }
                      placeholder="e.g., 3000"
                      data-testid="input-new-room-triple-occupancy"
                    />
                    {newTripleOccupancyAdjustment && newRoomPrice && (
                      <p className="text-xs text-primary">
                        +₹{Math.max(0, parseFloat(newTripleOccupancyAdjustment) - parseFloat(newRoomPrice || "0")).toLocaleString("en-IN")} extra vs. 1 guest
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Default meal options (Room Only, Breakfast Included, Breakfast +
                Dinner/Lunch, All Meals Included) will be added automatically.
                You can customize them after adding the room.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleAddRoom}
                  disabled={!newRoomName || !newRoomPrice}
                  data-testid="button-save-new-room"
                >
                  Add Room Type
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    resetForm();
                  }}
                  data-testid="button-cancel-new-room"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {value.length === 0 && !showAddForm && (
          <div className="text-center py-6 text-muted-foreground">
            <Bed className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No room types added yet.</p>
            <p className="text-xs mt-1">
              Add at least one room type to define pricing and availability.
            </p>
          </div>
        )}

        {value.map((room) => (
          <RoomTypeCard
            key={room.id}
            room={room}
            isExpanded={expandedRooms.has(room.id)}
            isEditing={editingRoom === room.id}
            onToggleExpand={() => toggleExpand(room.id)}
            onEdit={() => setEditingRoom(room.id)}
            onCancelEdit={() => setEditingRoom(null)}
            onUpdate={(updates) => handleUpdateRoom(room.id, updates)}
            onDelete={() => handleDeleteRoom(room.id)}
            onAddMealOption={(opt) => handleAddMealOption(room.id, opt)}
            onDeleteMealOption={(optId) =>
              handleDeleteMealOption(room.id, optId)
            }
            onUpdateMealOption={(optId, updates) =>
              handleUpdateMealOption(room.id, optId, updates)
            }
          />
        ))}

        {value.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <strong>Tip:</strong> Expand a room type to manage meal plans. Guest price = 1-guest price + meal plan add-on per person. Set 2-guest and 3-guest prices for occupancy-based rates.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoomTypeCard({
  room,
  isExpanded,
  isEditing,
  onToggleExpand,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onAddMealOption,
  onDeleteMealOption,
  onUpdateMealOption,
}: {
  room: WizardRoomType;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<WizardRoomType>) => void;
  onDelete: () => void;
  onAddMealOption: (option: Omit<WizardMealOption, "id">) => void;
  onDeleteMealOption: (optionId: string) => void;
  onUpdateMealOption: (
    optionId: string,
    updates: Partial<WizardMealOption>,
  ) => void;
}) {
  const [editName, setEditName] = useState(room.name);
  const [editDescription, setEditDescription] = useState(
    room.description || "",
  );
  const [editPrice, setEditPrice] = useState(String(room.basePrice));
  const [editOriginalPrice, setEditOriginalPrice] = useState(
    room.originalPrice !== undefined ? String(room.originalPrice) : "",
  );
  const [editShowStrikeOff, setEditShowStrikeOff] = useState(
    room.originalPrice !== undefined && room.originalPrice > room.basePrice,
  );
  const [editMaxGuests, setEditMaxGuests] = useState(String(room.maxGuests));
  const [editTotalRooms, setEditTotalRooms] = useState(String(room.totalRooms));
  const [editSingleOccupancyBase, setEditSingleOccupancyBase] = useState(
    String(room.singleOccupancyBase || 1),
  );
  const [editDoubleOccupancy, setEditDoubleOccupancy] = useState(
    room.doubleOccupancyAdjustment !== undefined
      ? String(room.doubleOccupancyAdjustment)
      : "",
  );
  const [editTripleOccupancy, setEditTripleOccupancy] = useState(
    room.tripleOccupancyAdjustment !== undefined
      ? String(room.tripleOccupancyAdjustment)
      : "",
  );

  const handleSave = () => {
    const price = parseFloat(editPrice);
    const originalPrice =
      editShowStrikeOff && editOriginalPrice
        ? parseFloat(editOriginalPrice)
        : undefined;
    const maxGuests = parseInt(editMaxGuests);
    const totalRooms = parseInt(editTotalRooms);
    const singleOccupancyBase = parseInt(editSingleOccupancyBase) || 1;
    const doubleAdj = editDoubleOccupancy
      ? parseFloat(editDoubleOccupancy)
      : undefined;
    const tripleAdj = editTripleOccupancy
      ? parseFloat(editTripleOccupancy)
      : undefined;

    if (isNaN(price) || price < 100) return;
    if (isNaN(maxGuests) || maxGuests < 1) return;
    if (isNaN(totalRooms) || totalRooms < 1) return;
    // Validate original price must be greater than selling price
    if (originalPrice !== undefined && originalPrice <= price) return;

    onUpdate({
      name: editName,
      description: editDescription || undefined,
      basePrice: price,
      originalPrice: editShowStrikeOff ? originalPrice : undefined,
      maxGuests: maxGuests,
      totalRooms: totalRooms,
      singleOccupancyBase: singleOccupancyBase,
      doubleOccupancyAdjustment: doubleAdj,
      tripleOccupancyAdjustment: tripleAdj,
    });
  };

  const resetEdit = () => {
    setEditName(room.name);
    setEditDescription(room.description || "");
    setEditPrice(String(room.basePrice));
    setEditOriginalPrice(
      room.originalPrice !== undefined ? String(room.originalPrice) : "",
    );
    setEditShowStrikeOff(
      room.originalPrice !== undefined && room.originalPrice > room.basePrice,
    );
    setEditMaxGuests(String(room.maxGuests));
    setEditTotalRooms(String(room.totalRooms));
    setEditSingleOccupancyBase(String(room.singleOccupancyBase || 1));
    setEditDoubleOccupancy(
      room.doubleOccupancyAdjustment !== undefined
        ? String(room.doubleOccupancyAdjustment)
        : "",
    );
    setEditTripleOccupancy(
      room.tripleOccupancyAdjustment !== undefined
        ? String(room.tripleOccupancyAdjustment)
        : "",
    );
    onCancelEdit();
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        className="border rounded-lg overflow-hidden"
        data-testid={`room-type-card-${room.id}`}
      >
        <div className="flex items-center justify-between p-3 bg-muted/30">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-muted-foreground" />
              {isEditing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-40 h-8"
                  data-testid={`edit-room-name-${room.id}`}
                />
              ) : (
                <span className="font-medium">{room.name}</span>
              )}
            </div>
            {!isEditing && (
              <>
                <Badge variant="secondary" className="text-xs">
                  {room.maxGuests} guests
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {room.totalRooms} rooms
                </Badge>
                {room.originalPrice && room.originalPrice > room.basePrice ? (
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="text-xs line-through text-muted-foreground"
                    >
                      ₹{room.originalPrice}
                    </Badge>
                    <Badge className="text-xs">₹{room.basePrice}/night</Badge>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    >
                      {Math.round(
                        (1 - room.basePrice / room.originalPrice) * 100,
                      )}
                      % off
                    </Badge>
                  </div>
                ) : (
                  <Badge className="text-xs">₹{room.basePrice}/night</Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <UtensilsCrossed className="h-3 w-3 mr-1" />
                  {room.mealOptions.length} meal plans
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleSave}
                  data-testid={`save-room-${room.id}`}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetEdit}
                  data-testid={`cancel-room-${room.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onEdit}
                  data-testid={`edit-room-${room.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onDelete}
                  data-testid={`delete-room-${room.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    data-testid={`expand-room-${room.id}`}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="p-3 border-t space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Room description..."
                rows={2}
                data-testid={`edit-room-desc-${room.id}`}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Selling Price (₹)</Label>
                <Input
                  type="number"
                  min="100"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  data-testid={`edit-room-price-${room.id}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Guests</Label>
                <Input
                  type="number"
                  min="1"
                  value={editMaxGuests}
                  onChange={(e) => setEditMaxGuests(e.target.value)}
                  data-testid={`edit-room-max-guests-${room.id}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Rooms</Label>
                <Input
                  type="number"
                  min="1"
                  value={editTotalRooms}
                  onChange={(e) => setEditTotalRooms(e.target.value)}
                  data-testid={`edit-room-total-rooms-${room.id}`}
                />
              </div>
            </div>

            {/* Strike-off Price Section */}
            <div className="border rounded-lg p-3 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-600" />
                  <Label className="text-xs font-medium">
                    Show Discount (Strike-off Price)
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    Optional
                  </Badge>
                </div>
                <Switch
                  checked={editShowStrikeOff}
                  onCheckedChange={setEditShowStrikeOff}
                  data-testid={`switch-strike-off-edit-${room.id}`}
                />
              </div>
              {editShowStrikeOff && (
                <div className="space-y-2">
                  <Label className="text-xs">Original Price (₹)</Label>
                  <Input
                    type="number"
                    min="100"
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value)}
                    placeholder="e.g., 3500"
                    data-testid={`edit-room-original-price-${room.id}`}
                  />
                  {editOriginalPrice &&
                    editPrice &&
                    parseFloat(editOriginalPrice) <= parseFloat(editPrice) && (
                      <p className="text-xs text-destructive">
                        Original price must be higher than selling price
                      </p>
                    )}
                  {editOriginalPrice &&
                    editPrice &&
                    parseFloat(editOriginalPrice) > parseFloat(editPrice) && (
                      <p className="text-xs text-emerald-600">
                        Customers see:{" "}
                        <span className="line-through">
                          ₹{Number(editOriginalPrice).toLocaleString("en-IN")}
                        </span>{" "}
                        <span className="font-semibold">
                          ₹{Number(editPrice).toLocaleString("en-IN")}
                        </span>{" "}
                        (
                        {Math.round(
                          (1 -
                            parseFloat(editPrice) /
                              parseFloat(editOriginalPrice)) *
                            100,
                        )}
                        % off)
                      </p>
                    )}
                </div>
              )}
            </div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">
                  Occupancy-Based Pricing
                </Label>
                <Badge variant="secondary" className="text-xs">
                  Optional
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Set price per night per occupancy level. Leave 2-guest / 3-guest blank to use the base price.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">1 Guest — ₹/Night</Label>
                  <Input
                    type="number"
                    min="100"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    data-testid={`edit-room-single-occupancy-${room.id}`}
                  />
                  <p className="text-xs text-muted-foreground">Same as selling price</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">2 Guests — ₹/Night</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editDoubleOccupancy}
                    onChange={(e) => setEditDoubleOccupancy(e.target.value)}
                    placeholder="Leave blank for same as 1 guest"
                    data-testid={`edit-room-double-occupancy-${room.id}`}
                  />
                  {editDoubleOccupancy && editPrice && (
                    <p className="text-xs text-primary">
                      +₹{Math.max(0, parseFloat(editDoubleOccupancy) - parseFloat(editPrice)).toLocaleString("en-IN")} extra
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">3+ Guests — ₹/Night</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editTripleOccupancy}
                    onChange={(e) => setEditTripleOccupancy(e.target.value)}
                    placeholder="Leave blank for same as 1 guest"
                    data-testid={`edit-room-triple-occupancy-${room.id}`}
                  />
                  {editTripleOccupancy && editPrice && (
                    <p className="text-xs text-primary">
                      +₹{Math.max(0, parseFloat(editTripleOccupancy) - parseFloat(editPrice)).toLocaleString("en-IN")} extra
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <CollapsibleContent>
          <div className="p-3 border-t bg-background">
            <MealOptionsSection
              options={room.mealOptions}
              basePrice={room.basePrice}
              onAdd={onAddMealOption}
              onDelete={onDeleteMealOption}
              onUpdate={onUpdateMealOption}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const PRESET_MEAL_OPTIONS_WIZARD = [
  {
    name: "Room Only (Best Price)",
    priceAdjustment: 0,
    inclusions: "No meals included",
  },
  {
    name: "Breakfast Included",
    priceAdjustment: 300,
    inclusions: "Daily breakfast buffet",
  },
  {
    name: "Breakfast + Dinner/Lunch",
    priceAdjustment: 600,
    inclusions: "Breakfast and dinner or lunch included",
  },
  {
    name: "All Meals Included",
    priceAdjustment: 900,
    inclusions: "All meals included (breakfast, lunch, dinner)",
  },
];

function MealOptionsSection({
  options,
  basePrice,
  onAdd,
  onDelete,
  onUpdate,
}: {
  options: WizardMealOption[];
  basePrice: number;
  onAdd: (option: Omit<WizardMealOption, "id">) => void;
  onDelete: (optionId: string) => void;
  onUpdate: (optionId: string, updates: Partial<WizardMealOption>) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newInclusions, setNewInclusions] = useState("");

  const handleAdd = () => {
    if (!newName) return;
    onAdd({
      name: newName,
      priceAdjustment: parseFloat(newPrice) || 0,
      inclusions: newInclusions || undefined,
    });
    setNewName("");
    setNewPrice("");
    setNewInclusions("");
    setShowAddForm(false);
  };

  const handleQuickAdd = (preset: (typeof PRESET_MEAL_OPTIONS_WIZARD)[0]) => {
    onAdd({
      name: preset.name,
      priceAdjustment: preset.priceAdjustment,
      inclusions: preset.inclusions,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <UtensilsCrossed className="h-4 w-4" />
          Meal Plans
        </Label>
        {!showAddForm && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            data-testid="button-add-meal-option"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Plan
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="p-3 bg-muted/30 rounded-lg space-y-3 border border-dashed border-primary/30">
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Quick Add Preset Plans
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PRESET_MEAL_OPTIONS_WIZARD.map((preset) => {
                const alreadyExists = options.some(
                  (o) => o.name === preset.name,
                );
                return (
                  <Button
                    key={preset.name}
                    type="button"
                    variant={alreadyExists ? "secondary" : "outline"}
                    size="sm"
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => !alreadyExists && handleQuickAdd(preset)}
                    disabled={alreadyExists}
                    data-testid={`quick-add-${preset.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="text-left">
                      <div className="font-medium text-xs">{preset.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {preset.priceAdjustment === 0
                          ? "Included"
                          : `+₹${preset.priceAdjustment}/person`}
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
              <span className="bg-muted/30 px-2 text-muted-foreground">
                Or add custom plan
              </span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Plan Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., All Inclusive"
                data-testid="input-new-meal-name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price per Person (₹/night)</Label>
              <Input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0"
                data-testid="input-new-meal-price"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">What's Included</Label>
              <Input
                value={newInclusions}
                onChange={(e) => setNewInclusions(e.target.value)}
                placeholder="e.g., All meals included"
                data-testid="input-new-meal-inclusions"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!newName}
              data-testid="button-save-meal"
            >
              Add Custom Plan
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(false)}
              data-testid="button-cancel-meal"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No meal plans added
        </p>
      ) : (
        <div className="space-y-2">
          {options.map((option) => (
            <MealOptionRow
              key={option.id}
              option={option}
              basePrice={basePrice}
              isEditing={editingOption === option.id}
              onEdit={() => setEditingOption(option.id)}
              onCancelEdit={() => setEditingOption(null)}
              onUpdate={(updates) => {
                onUpdate(option.id, updates);
                setEditingOption(null);
              }}
              onDelete={() => onDelete(option.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MealOptionRow({
  option,
  basePrice,
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  option: WizardMealOption;
  basePrice: number;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (updates: Partial<WizardMealOption>) => void;
  onDelete: () => void;
}) {
  const [editName, setEditName] = useState(option.name);
  const [editPrice, setEditPrice] = useState(String(option.priceAdjustment));
  const [editInclusions, setEditInclusions] = useState(option.inclusions || "");

  const handleSave = () => {
    onUpdate({
      name: editName,
      priceAdjustment: parseFloat(editPrice) || 0,
      inclusions: editInclusions || undefined,
    });
  };

  if (isEditing) {
    return (
      <div className="p-2 bg-muted/50 rounded-md space-y-2">
        <div className="grid gap-2 md:grid-cols-3">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Plan name"
            data-testid={`edit-meal-name-${option.id}`}
          />
          <Input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            placeholder="Price adjustment"
            data-testid={`edit-meal-price-${option.id}`}
          />
          <Input
            value={editInclusions}
            onChange={(e) => setEditInclusions(e.target.value)}
            placeholder="What's included"
            data-testid={`edit-meal-inclusions-${option.id}`}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            data-testid={`save-meal-${option.id}`}
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onCancelEdit}
            data-testid={`cancel-meal-${option.id}`}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const totalPrice = basePrice + (option.priceAdjustment || 0);

  return (
    <div
      className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
      data-testid={`meal-option-${option.id}`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium">{option.name}</span>
        <div className="flex items-center gap-1.5 text-xs">
          {option.priceAdjustment > 0 ? (
            <>
              <span className="text-muted-foreground">₹{basePrice.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">+</span>
              <Badge variant="default" className="text-xs px-1.5">+₹{option.priceAdjustment}/person</Badge>
              <span className="text-muted-foreground">=</span>
              <span className="font-semibold text-primary">₹{totalPrice.toLocaleString("en-IN")}/night</span>
            </>
          ) : (
            <Badge variant="secondary" className="text-xs px-1.5">
              ₹{basePrice.toLocaleString("en-IN")}/night (meals incl.)
            </Badge>
          )}
        </div>
        {option.inclusions && (
          <span className="text-xs text-muted-foreground">
            {option.inclusions}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {option.isActive !== false ? "Visible" : "Hidden"}
        </span>
        <Switch
          checked={option.isActive !== false}
          onCheckedChange={(checked) => onUpdate({ isActive: checked })}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onEdit}
          data-testid={`edit-meal-${option.id}`}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onDelete}
          data-testid={`delete-meal-${option.id}`}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
