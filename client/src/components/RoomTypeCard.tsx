import type { MouseEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, Bed, Info } from "lucide-react";

export interface MealOption {
  id: string;
  name: string;
  description?: string | null;
  priceAdjustment: string;
}

export interface RoomTypeData {
  id: string;
  name: string;
  description?: string | null;
  basePrice: string;
  originalPrice?: string | null;
  maxGuests: number;
  totalRooms?: number;
  mealOptions?: MealOption[];
}

export interface RoomInventory {
  roomTypeId: string;
  availableRooms: number;
  isSoldOut: boolean;
  isLowStock: boolean;
}

interface RoomTypeCardProps {
  roomType: RoomTypeData;
  isSelected: boolean;
  selectedMealOptionId: string | null;
  onSelect: (roomTypeId: string) => void;
  onMealOptionSelect: (mealOptionId: string | null) => void;
  inventory?: RoomInventory;
  showDatesContext?: boolean;
}

export function RoomTypeCard({
  roomType,
  isSelected,
  selectedMealOptionId,
  onSelect,
  onMealOptionSelect,
  inventory,
  showDatesContext = false,
}: RoomTypeCardProps) {
  const displayAvailable = inventory ? inventory.availableRooms : roomType.totalRooms;
  const isSoldOut = inventory?.isSoldOut || false;
  const isLowStock = inventory?.isLowStock || false;

  const hasDiscount = roomType.originalPrice && 
    parseFloat(roomType.originalPrice) > parseFloat(roomType.basePrice);
  
  const discountPercent = hasDiscount 
    ? Math.round((1 - parseFloat(roomType.basePrice) / parseFloat(roomType.originalPrice!)) * 100)
    : 0;

  const handleCardClick = () => {
    if (!isSoldOut) {
      onSelect(roomType.id);
    }
  };

  const handleMealClick = (e: MouseEvent, mealOptionId: string | null) => {
    e.stopPropagation();
    onMealOptionSelect(mealOptionId);
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isSoldOut 
          ? "border-border opacity-60 cursor-not-allowed bg-muted/50"
          : isSelected
            ? "border-primary bg-primary/5 cursor-pointer"
            : "border-border hover-elevate cursor-pointer"
      }`}
      onClick={handleCardClick}
      data-testid={`card-room-type-${roomType.id}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium">{roomType.name}</h4>
            {isSelected && !isSoldOut && (
              <Badge variant="secondary" className="text-xs">Selected</Badge>
            )}
            {isSoldOut && (
              <Badge variant="destructive" className="text-xs">Sold Out</Badge>
            )}
            {isLowStock && !isSoldOut && (
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Low Stock</Badge>
            )}
          </div>
          {roomType.description && (
            <p className="text-sm text-muted-foreground mt-1">{roomType.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Up to {roomType.maxGuests} guests
            </span>
            {displayAvailable !== undefined && (
              <span className={`flex items-center gap-1 ${isSoldOut ? 'text-destructive' : isLowStock ? 'text-amber-600' : ''}`}>
                <Bed className="h-3.5 w-3.5" />
                {isSoldOut 
                  ? "Sold out" 
                  : `${displayAvailable} available${showDatesContext ? ' for your dates' : ''}`}
              </span>
            )}
          </div>
        </div>
        <div className="text-right ml-3">
          {hasDiscount && (
            <div className="text-sm text-muted-foreground line-through">
              ₹{Number(roomType.originalPrice).toLocaleString('en-IN')}
            </div>
          )}
          <div className={`font-semibold ${isSoldOut ? 'line-through text-muted-foreground' : hasDiscount ? 'text-green-600 dark:text-green-400' : ''}`}>
            ₹{Number(roomType.basePrice).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-muted-foreground">per night</div>
          {hasDiscount && (
            <Badge variant="secondary" className="mt-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {discountPercent}% OFF
            </Badge>
          )}
        </div>
      </div>
      
      {isSelected && roomType.mealOptions && roomType.mealOptions.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">Meal Options (per person per night)</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-5 w-5 p-0" data-testid="meal-pricing-info">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 text-sm" align="start">
                <p className="font-medium mb-1">Per-Person Meal Pricing</p>
                <p className="text-muted-foreground text-xs">
                  Meal charges are calculated per person per night. The total meal cost = meal price × number of guests × number of nights.
                </p>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <div
              className={`p-2 rounded border cursor-pointer text-sm transition-all ${
                selectedMealOptionId === null
                  ? "border-primary bg-primary/5"
                  : "border-border hover-elevate"
              }`}
              onClick={(e) => handleMealClick(e, null)}
              data-testid="option-no-meal"
            >
              <div className="flex justify-between items-center">
                <span>Room only (no meals)</span>
                <span className="text-muted-foreground">Included</span>
              </div>
            </div>
            {roomType.mealOptions
              .filter((option) => {
                const nameLC = option.name.toLowerCase();
                return nameLC !== 'room only' && 
                       nameLC !== 'roomonly' && 
                       !nameLC.includes('no meal') &&
                       !nameLC.includes('no meals');
              })
              .map((option) => (
              <div
                key={option.id}
                className={`p-2 rounded border cursor-pointer text-sm transition-all ${
                  selectedMealOptionId === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover-elevate"
                }`}
                onClick={(e) => handleMealClick(e, option.id)}
                data-testid={`option-meal-${option.id}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{option.name}</span>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    )}
                  </div>
                  <span className="text-primary font-medium whitespace-nowrap">
                    +₹{Number(option.priceAdjustment).toLocaleString('en-IN')}/person
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
