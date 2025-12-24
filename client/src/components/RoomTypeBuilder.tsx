import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Bed, UtensilsCrossed, ChevronDown, ChevronUp, Save, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface WizardRoomType {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  maxGuests: number;
  totalRooms: number;
  mealOptions: WizardMealOption[];
}

export interface WizardMealOption {
  id: string;
  name: string;
  priceAdjustment: number;
  inclusions?: string;
}

interface RoomTypeBuilderProps {
  value: WizardRoomType[];
  onChange: (roomTypes: WizardRoomType[]) => void;
  propertyType?: string;
}

const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const DEFAULT_MEAL_OPTIONS: Omit<WizardMealOption, "id">[] = [
  { name: "Room Only", priceAdjustment: 0, inclusions: "No meals included" },
  { name: "Breakfast Included", priceAdjustment: 300, inclusions: "Daily breakfast buffet" },
  { name: "Half Board", priceAdjustment: 600, inclusions: "Breakfast and dinner included" },
  { name: "Full Board", priceAdjustment: 900, inclusions: "All meals included (breakfast, lunch, dinner)" },
];

export function RoomTypeBuilder({ value, onChange, propertyType }: RoomTypeBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomPrice, setNewRoomPrice] = useState("");
  const [newRoomMaxGuests, setNewRoomMaxGuests] = useState("2");
  const [newRoomTotalRooms, setNewRoomTotalRooms] = useState("1");

  const resetForm = () => {
    setNewRoomName("");
    setNewRoomDescription("");
    setNewRoomPrice("");
    setNewRoomMaxGuests("2");
    setNewRoomTotalRooms("1");
  };

  const handleAddRoom = () => {
    if (!newRoomName || !newRoomPrice) return;

    const newRoom: WizardRoomType = {
      id: generateId(),
      name: newRoomName,
      description: newRoomDescription || undefined,
      basePrice: parseFloat(newRoomPrice),
      maxGuests: parseInt(newRoomMaxGuests) || 2,
      totalRooms: parseInt(newRoomTotalRooms) || 1,
      mealOptions: DEFAULT_MEAL_OPTIONS.map(opt => ({ ...opt, id: generateId() })),
    };

    onChange([...value, newRoom]);
    resetForm();
    setShowAddForm(false);
    setExpandedRooms(prev => new Set([...Array.from(prev), newRoom.id]));
  };

  const handleDeleteRoom = (roomId: string) => {
    onChange(value.filter(r => r.id !== roomId));
    expandedRooms.delete(roomId);
    setExpandedRooms(new Set(expandedRooms));
  };

  const handleUpdateRoom = (roomId: string, updates: Partial<WizardRoomType>) => {
    onChange(value.map(r => r.id === roomId ? { ...r, ...updates } : r));
    setEditingRoom(null);
  };

  const handleAddMealOption = (roomId: string, option: Omit<WizardMealOption, "id">) => {
    onChange(value.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        mealOptions: [...r.mealOptions, { ...option, id: generateId() }]
      };
    }));
  };

  const handleDeleteMealOption = (roomId: string, optionId: string) => {
    onChange(value.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        mealOptions: r.mealOptions.filter(o => o.id !== optionId)
      };
    }));
  };

  const handleUpdateMealOption = (roomId: string, optionId: string, updates: Partial<WizardMealOption>) => {
    onChange(value.map(r => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        mealOptions: r.mealOptions.map(o => o.id === optionId ? { ...o, ...updates } : o)
      };
    }));
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
          Add different room categories with their pricing and meal plans. Each room type can have multiple meal options.
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
                  <Label>Base Price per Night (₹) *</Label>
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
                  <Label>Number of Rooms Available</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newRoomTotalRooms}
                    onChange={(e) => setNewRoomTotalRooms(e.target.value)}
                    data-testid="input-new-room-total"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Default meal options (Room Only, Breakfast, Half Board, Full Board) will be added automatically. You can customize them after adding the room.
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
                  onClick={() => { setShowAddForm(false); resetForm(); }}
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
            <p className="text-xs mt-1">Add at least one room type to define pricing and availability.</p>
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
            onDeleteMealOption={(optId) => handleDeleteMealOption(room.id, optId)}
            onUpdateMealOption={(optId, updates) => handleUpdateMealOption(room.id, optId, updates)}
          />
        ))}

        {value.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <strong>Tip:</strong> Click on a room type to expand and manage its meal options. 
            The final price shown to customers will be: Room Base Price + Meal Option Price Adjustment.
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
  onUpdateMealOption: (optionId: string, updates: Partial<WizardMealOption>) => void;
}) {
  const [editName, setEditName] = useState(room.name);
  const [editDescription, setEditDescription] = useState(room.description || "");
  const [editPrice, setEditPrice] = useState(String(room.basePrice));
  const [editMaxGuests, setEditMaxGuests] = useState(String(room.maxGuests));
  const [editTotalRooms, setEditTotalRooms] = useState(String(room.totalRooms));

  const handleSave = () => {
    onUpdate({
      name: editName,
      description: editDescription || undefined,
      basePrice: parseFloat(editPrice),
      maxGuests: parseInt(editMaxGuests),
      totalRooms: parseInt(editTotalRooms),
    });
  };

  const resetEdit = () => {
    setEditName(room.name);
    setEditDescription(room.description || "");
    setEditPrice(String(room.basePrice));
    setEditMaxGuests(String(room.maxGuests));
    setEditTotalRooms(String(room.totalRooms));
    onCancelEdit();
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="border rounded-lg overflow-hidden" data-testid={`room-type-card-${room.id}`}>
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
                <Badge variant="secondary" className="text-xs">{room.maxGuests} guests</Badge>
                <Badge variant="outline" className="text-xs">{room.totalRooms} rooms</Badge>
                <Badge className="text-xs">₹{room.basePrice}/night</Badge>
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
                <Button size="sm" variant="ghost" onClick={handleSave} data-testid={`save-room-${room.id}`}>
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={resetEdit} data-testid={`cancel-room-${room.id}`}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={onEdit} data-testid={`edit-room-${room.id}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete} data-testid={`delete-room-${room.id}`}>
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
                <Label className="text-xs">Base Price (₹)</Label>
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
                  data-testid={`edit-room-guests-${room.id}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total Rooms</Label>
                <Input
                  type="number"
                  min="1"
                  value={editTotalRooms}
                  onChange={(e) => setEditTotalRooms(e.target.value)}
                  data-testid={`edit-room-total-${room.id}`}
                />
              </div>
            </div>
          </div>
        )}

        <CollapsibleContent>
          <div className="p-3 border-t bg-background">
            <MealOptionsSection
              options={room.mealOptions}
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

function MealOptionsSection({
  options,
  onAdd,
  onDelete,
  onUpdate,
}: {
  options: WizardMealOption[];
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
        <div className="p-3 bg-muted/30 rounded-lg space-y-3">
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
              <Label className="text-xs">Price Adjustment (₹)</Label>
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
                placeholder="e.g., All meals"
                data-testid="input-new-meal-inclusions"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleAdd} disabled={!newName} data-testid="button-save-meal">
              Add
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAddForm(false)} data-testid="button-cancel-meal">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No meal plans added</p>
      ) : (
        <div className="space-y-2">
          {options.map((option) => (
            <MealOptionRow
              key={option.id}
              option={option}
              isEditing={editingOption === option.id}
              onEdit={() => setEditingOption(option.id)}
              onCancelEdit={() => setEditingOption(null)}
              onUpdate={(updates) => { onUpdate(option.id, updates); setEditingOption(null); }}
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
  isEditing,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  option: WizardMealOption;
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
          <Button type="button" size="sm" onClick={handleSave} data-testid={`save-meal-${option.id}`}>Save</Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancelEdit} data-testid={`cancel-meal-${option.id}`}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md" data-testid={`meal-option-${option.id}`}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium">{option.name}</span>
        <Badge variant={option.priceAdjustment === 0 ? "secondary" : "default"} className="text-xs">
          {option.priceAdjustment === 0 ? "Included" : `+₹${option.priceAdjustment}`}
        </Badge>
        {option.inclusions && (
          <span className="text-xs text-muted-foreground">{option.inclusions}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit} data-testid={`edit-meal-${option.id}`}>
          <Edit className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete} data-testid={`delete-meal-${option.id}`}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
