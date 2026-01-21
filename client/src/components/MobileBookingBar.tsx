import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger 
} from "@/components/ui/sheet";
import { Star, X, ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface RoomType {
  id: string;
  name: string;
  basePrice: string;
  originalPrice?: string | null;
  maxGuests: number;
  mealOptions?: {
    id: string;
    name: string;
    description?: string;
    priceAdjustment: string;
  }[];
}

interface MobileBookingBarProps {
  property: {
    id: string;
    name: string;
    rating?: number;
    reviewCount?: number;
    minPrice: number;
  };
  roomTypes: RoomType[];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  selectedRoomTypeId: string | null;
  selectedMealOptionId: string | null;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  onRoomsChange: (value: number) => void;
  onRoomTypeSelect: (id: string) => void;
  onMealOptionSelect: (id: string | null) => void;
  onReserve: () => void;
  isReserving: boolean;
  isDisabled: boolean;
  disabledReason?: string;
  totalPrice: number;
  nights: number;
  hasDateOverlap?: boolean;
  hasBlockedDateOverlap?: boolean;
  bookedDates?: Date[];
  blockedDates?: Date[];
}

const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export function MobileBookingBar({
  property,
  roomTypes,
  checkIn,
  checkOut,
  adults,
  children,
  rooms,
  selectedRoomTypeId,
  selectedMealOptionId,
  onCheckInChange,
  onCheckOutChange,
  onAdultsChange,
  onChildrenChange,
  onRoomsChange,
  onRoomTypeSelect,
  onMealOptionSelect,
  onReserve,
  isReserving,
  isDisabled,
  disabledReason,
  totalPrice,
  nights,
  hasDateOverlap,
  hasBlockedDateOverlap,
  bookedDates = [],
  blockedDates = [],
}: MobileBookingBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkInPopoverOpen, setCheckInPopoverOpen] = useState(false);
  const [checkOutPopoverOpen, setCheckOutPopoverOpen] = useState(false);
  const [guestsExpanded, setGuestsExpanded] = useState(false);

  const guests = adults + children;
  const selectedRoomType = roomTypes.find(rt => rt.id === selectedRoomTypeId);
  
  const handleReserve = () => {
    onReserve();
    setSheetOpen(false);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <>
      {/* Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg safe-area-bottom">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-semibold" data-testid="mobile-base-price">
                ₹{(selectedRoomType ? Number(selectedRoomType.basePrice) : property.minPrice).toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-muted-foreground">/ night</span>
              {rooms > 1 && (
                <span className="text-xs text-muted-foreground">× {rooms}</span>
              )}
            </div>
            {property.rating && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3 w-3 fill-current" />
                <span>{property.rating.toFixed(1)}</span>
                {property.reviewCount && (
                  <span>({property.reviewCount} reviews)</span>
                )}
              </div>
            )}
          </div>
          
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button 
                size="lg" 
                className="px-8"
                data-testid="button-mobile-reserve"
              >
                Reserve
              </Button>
            </SheetTrigger>
            
            <SheetContent 
              side="bottom" 
              className="h-[85vh] overflow-y-auto rounded-t-xl"
            >
              <SheetHeader className="text-left pb-4 border-b">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-xl">{property.name}</SheetTitle>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    ₹{(selectedRoomType ? Number(selectedRoomType.basePrice) : property.minPrice).toLocaleString('en-IN')}
                  </span>
                  <span className="text-muted-foreground">/ night</span>
                  {selectedRoomType && (
                    <span className="text-sm text-primary">({selectedRoomType.name})</span>
                  )}
                </div>
                {guests > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {guests} guest{guests !== 1 ? 's' : ''} · {rooms} room{rooms !== 1 ? 's' : ''}
                  </div>
                )}
              </SheetHeader>

              <div className="py-4 space-y-6">
                {/* Dates Selection */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Select Dates</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Popover open={checkInPopoverOpen} onOpenChange={setCheckInPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-12"
                          data-testid="mobile-input-checkin"
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-xs text-muted-foreground">Check-in</span>
                            <span className="text-sm">
                              {checkIn ? format(parseLocalDate(checkIn), "MMM d, yyyy") : "Add date"}
                            </span>
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkIn ? parseLocalDate(checkIn) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              onCheckInChange(format(date, "yyyy-MM-dd"));
                            }
                            setCheckInPopoverOpen(false);
                            setCheckOutPopoverOpen(true);
                          }}
                          disabled={(date) => {
                            if (date < today) return true;
                            if (bookedDates.some(bd => bd.getTime() === date.getTime())) return true;
                            if (blockedDates.some(bd => bd.getTime() === date.getTime())) return true;
                            return false;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover open={checkOutPopoverOpen} onOpenChange={setCheckOutPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-12"
                          data-testid="mobile-input-checkout"
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-xs text-muted-foreground">Check-out</span>
                            <span className="text-sm">
                              {checkOut ? format(parseLocalDate(checkOut), "MMM d, yyyy") : "Add date"}
                            </span>
                          </div>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkOut ? parseLocalDate(checkOut) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              onCheckOutChange(format(date, "yyyy-MM-dd"));
                            }
                            setCheckOutPopoverOpen(false);
                          }}
                          disabled={(date) => {
                            if (checkIn && date <= parseLocalDate(checkIn)) return true;
                            if (date < today) return true;
                            if (bookedDates.some(bd => bd.getTime() === date.getTime())) return true;
                            if (blockedDates.some(bd => bd.getTime() === date.getTime())) return true;
                            return false;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Guests Selection */}
                <div className="space-y-3">
                  <button
                    onClick={() => setGuestsExpanded(!guestsExpanded)}
                    className="flex items-center justify-between w-full"
                  >
                    <h3 className="font-semibold">Guests</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {guests} guest{guests !== 1 ? 's' : ''}, {rooms} room{rooms !== 1 ? 's' : ''}
                      </span>
                      {guestsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>
                  
                  {guestsExpanded && (
                    <div className="space-y-4 pt-2">
                      {/* Adults */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Adults</p>
                          <p className="text-sm text-muted-foreground">Age 13+</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => onAdultsChange(Math.max(1, adults - 1))}
                            disabled={adults <= 1}
                            data-testid="mobile-btn-adults-minus"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center">{adults}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => onAdultsChange(adults + 1)}
                            data-testid="mobile-btn-adults-plus"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Children</p>
                          <p className="text-sm text-muted-foreground">Ages 2-12</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => onChildrenChange(Math.max(0, children - 1))}
                            disabled={children <= 0}
                            data-testid="mobile-btn-children-minus"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center">{children}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => onChildrenChange(children + 1)}
                            data-testid="mobile-btn-children-plus"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Rooms */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Rooms</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => onRoomsChange(Math.max(1, rooms - 1))}
                            disabled={rooms <= 1}
                            data-testid="mobile-btn-rooms-minus"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center">{rooms}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => onRoomsChange(rooms + 1)}
                            data-testid="mobile-btn-rooms-plus"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Room Type Selection */}
                <div className="space-y-3">
                  <h3 className="font-semibold">Select Room Type</h3>
                  <div className="space-y-2">
                    {roomTypes.map((roomType) => (
                      <button
                        key={roomType.id}
                        onClick={() => onRoomTypeSelect(roomType.id)}
                        className={`w-full p-4 rounded-lg border text-left transition-all ${
                          selectedRoomTypeId === roomType.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid={`mobile-room-type-${roomType.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{roomType.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Up to {roomType.maxGuests} guests
                            </p>
                          </div>
                          <div className="text-right">
                            {roomType.originalPrice && parseFloat(roomType.originalPrice) > parseFloat(roomType.basePrice) && (
                              <p className="text-sm text-muted-foreground line-through">
                                ₹{Number(roomType.originalPrice).toLocaleString('en-IN')}
                              </p>
                            )}
                            <p className="font-semibold text-primary">
                              ₹{Number(roomType.basePrice).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal Options */}
                {selectedRoomType?.mealOptions && selectedRoomType.mealOptions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Meal Options</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => onMealOptionSelect(null)}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          !selectedMealOptionId
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        data-testid="mobile-meal-none"
                      >
                        <div className="flex justify-between items-center">
                          <span>Room only (no meals)</span>
                          <span className="text-muted-foreground">Included</span>
                        </div>
                      </button>
                      {selectedRoomType.mealOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => onMealOptionSelect(option.id)}
                          className={`w-full p-3 rounded-lg border text-left transition-all ${
                            selectedMealOptionId === option.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          data-testid={`mobile-meal-${option.id}`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{option.name}</p>
                              {option.description && (
                                <p className="text-xs text-muted-foreground">{option.description}</p>
                              )}
                            </div>
                            <span className="text-primary font-medium">
                              +₹{Number(option.priceAdjustment).toLocaleString('en-IN')}/person
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {hasDateOverlap && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      Selected dates are not available. Please choose different dates.
                    </p>
                  </div>
                )}

                {hasBlockedDateOverlap && !hasDateOverlap && (
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      This property is not accepting bookings for these dates.
                    </p>
                  </div>
                )}

                {/* Price Summary */}
                {nights > 0 && totalPrice > 0 && selectedRoomTypeId && !hasDateOverlap && !hasBlockedDateOverlap && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        ₹{selectedRoomType ? Number(selectedRoomType.basePrice).toLocaleString('en-IN') : 0} × {nights} nights × {rooms} rooms
                      </span>
                      <span className="font-medium">
                        ₹{(Number(selectedRoomType?.basePrice || 0) * nights * rooms).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{guests} guest{guests !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold pt-2 border-t">
                      <span>Total</span>
                      <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reserve Button */}
              <div className="sticky bottom-0 pt-4 pb-6 bg-background border-t mt-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleReserve}
                  disabled={isReserving || isDisabled}
                  data-testid="mobile-button-confirm-reserve"
                >
                  {isReserving ? "Processing..." : disabledReason || "Reserve"}
                </Button>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  No payment required now
                </p>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </>
  );
}
