import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Utensils,
  Bed,
  RotateCcw,
  Check,
  Info,
} from "lucide-react";
import type { RoomType, RoomOption } from "@shared/schema";

interface PricingCalendarData {
  propertyId: string;
  startDate: string;
  endDate: string;
  roomTypes: {
    roomTypeId: string;
    roomTypeName: string;
    defaultPrice: number;
    singleOccupancyPrice: number | null;
    doubleOccupancyPrice: number | null;
    tripleOccupancyPrice: number | null;
    overrides: Record<string, number>; // date → price
  }[];
  mealPlanOverrides: Record<string, Record<string, number>>; // date → roomOptionId → price
  roomOptions: Record<
    string,
    { name: string; roomTypeId: string; defaultPrice: number }
  >;
}

interface PriceCalendarProps {
  propertyId: string;
  roomTypes: RoomType[];
}

type EditMode = "room" | "mealplan";

const TODAY = startOfDay(new Date());

export function PriceCalendar({ propertyId, roomTypes }: PriceCalendarProps) {
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editMode, setEditMode] = useState<EditMode>("room");
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<string>(
    roomTypes[0]?.id ?? "",
  );

  // Initialize when roomTypes load after mount
  useEffect(() => {
    if (!selectedRoomTypeId && roomTypes.length > 0) {
      setSelectedRoomTypeId(String(roomTypes[0].id));
    }
  }, [roomTypes, selectedRoomTypeId]);
  const [selectedRoomOptionId, setSelectedRoomOptionId] = useState<string>("");
  const [selectedOccupancy, setSelectedOccupancy] = useState<1 | 2 | 3>(1);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [priceInput, setPriceInput] = useState("");

  const dragStartDate = useRef<string | null>(null);
  const isDragging = useRef(false);
  const dragMode = useRef<"select" | "deselect">("select");

  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: calendarData, isLoading } = useQuery<PricingCalendarData>({
    queryKey: [
      "/api/properties",
      propertyId,
      "pricing-calendar",
      startDate,
      endDate,
    ],
    queryFn: () =>
      fetch(
        `/api/properties/${propertyId}/pricing-calendar?startDate=${startDate}&endDate=${endDate}`,
      ).then((r) => r.json()),
    enabled: !!propertyId,
  });

  // Build list of room options for the currently selected room type
  const roomOptionsForType = useMemo(() => {
    if (!calendarData?.roomOptions) return [];
    return Object.entries(calendarData.roomOptions)
      .filter(([, opt]) => opt.roomTypeId === selectedRoomTypeId)
      .map(([id, opt]) => ({ id, ...opt }));
  }, [calendarData, selectedRoomTypeId]);

  // Auto-select first room option when room type or mode changes
  useEffect(() => {
    if (
      editMode === "mealplan" &&
      roomOptionsForType.length > 0 &&
      !selectedRoomOptionId
    ) {
      setSelectedRoomOptionId(roomOptionsForType[0].id);
    }
  }, [editMode, roomOptionsForType, selectedRoomOptionId]);

  // Reset room option when room type changes
  useEffect(() => {
    setSelectedRoomOptionId("");
  }, [selectedRoomTypeId]);

  const setRoomPriceMutation = useMutation({
    mutationFn: async ({ roomTypeId, dates, price }: { roomTypeId: string; dates: string[]; price: number }) => {
      await Promise.all(
        dates.map((d) =>
          apiRequest("PUT", `/api/owner/room-types/${roomTypeId}/price-overrides`, {
            startDate: d,
            endDate: d,
            price,
          }).then((r) => r.json()),
        ),
      );
      return dates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "pricing-calendar"],
      });
      toast({
        title: "Prices saved",
        description: `${count} date(s) updated.`,
      });
      setSelectedDates(new Set());
      setPriceInput("");
    },
    onError: (err: Error) =>
      toast({
        title: "Failed to save prices",
        description: err?.message || "Please try again.",
        variant: "destructive",
      }),
  });

  const setMealPriceMutation = useMutation({
    mutationFn: async ({ roomOptionId, dates, price }: { roomOptionId: string; dates: string[]; price: number }) => {
      await Promise.all(
        dates.map((d) =>
          apiRequest(
            "PUT",
            `/api/owner/room-options/${roomOptionId}/meal-plan-price-overrides`,
            { startDate: d, endDate: d, price },
          ).then((r) => r.json()),
        ),
      );
      return dates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/properties", propertyId, "pricing-calendar"],
      });
      toast({
        title: "Meal prices saved",
        description: `${count} date(s) updated.`,
      });
      setSelectedDates(new Set());
      setPriceInput("");
    },
    onError: (err: Error) =>
      toast({
        title: "Failed to save meal prices",
        description: err?.message || "Please try again.",
        variant: "destructive",
      }),
  });

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
      }),
    [currentMonth],
  );

  const leadingBlanks = useMemo(() => {
    const dow = getDay(startOfMonth(currentMonth));
    return dow === 0 ? 6 : dow - 1;
  }, [currentMonth]);

  const selectedRoomType = useMemo(
    () =>
      calendarData?.roomTypes.find(
        (rt) => rt.roomTypeId === selectedRoomTypeId,
      ),
    [calendarData, selectedRoomTypeId],
  );

  function isPastDate(dateStr: string) {
    return isBefore(parseISO(dateStr), TODAY);
  }

  function getOccupancyBasePrice(rt: PricingCalendarData["roomTypes"][number]): number {
    if (selectedOccupancy === 2 && rt.doubleOccupancyPrice != null) return rt.doubleOccupancyPrice;
    if (selectedOccupancy === 3 && rt.tripleOccupancyPrice != null) return rt.tripleOccupancyPrice;
    if (selectedOccupancy === 1 && rt.singleOccupancyPrice != null) return rt.singleOccupancyPrice;
    return rt.defaultPrice;
  }

  function getPriceInfo(dateStr: string): {
    price: number | null;
    isOverride: boolean;
  } {
    if (editMode === "room" && selectedRoomType) {
      const override = selectedRoomType.overrides[dateStr];
      if (override !== undefined) return { price: override, isOverride: true };
      return { price: getOccupancyBasePrice(selectedRoomType), isOverride: false };
    }
    if (editMode === "mealplan" && selectedRoomOptionId && calendarData) {
      const override =
        calendarData.mealPlanOverrides[dateStr]?.[selectedRoomOptionId];
      if (override !== undefined) return { price: override, isOverride: true };
      // Show default price from roomOptions index
      const opt = calendarData.roomOptions[selectedRoomOptionId];
      if (opt) return { price: opt.defaultPrice, isOverride: false };
    }
    return { price: null, isOverride: false };
  }

  // ── Drag selection ────────────────────────────────────────────────────────
  function handleMouseDown(dateStr: string) {
    if (isPastDate(dateStr)) return;
    isDragging.current = true;
    dragStartDate.current = dateStr;
    dragMode.current = selectedDates.has(dateStr) ? "deselect" : "select";
    setSelectedDates((prev) => {
      const next = new Set(prev);
      dragMode.current === "select" ? next.add(dateStr) : next.delete(dateStr);
      return next;
    });
  }

  function handleMouseEnter(dateStr: string) {
    if (!isDragging.current || !dragStartDate.current || isPastDate(dateStr))
      return;
    const [a, b] = [dragStartDate.current, dateStr].sort();
    const range = eachDayOfInterval({ start: parseISO(a), end: parseISO(b) })
      .map((d) => format(d, "yyyy-MM-dd"))
      .filter((d) => !isPastDate(d));
    setSelectedDates((prev) => {
      const next = new Set(prev);
      range.forEach((d) =>
        dragMode.current === "select" ? next.add(d) : next.delete(d),
      );
      return next;
    });
  }

  function handleMouseUp() {
    isDragging.current = false;
    dragStartDate.current = null;
  }

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // ── Apply price ───────────────────────────────────────────────────────────
  function handleApply() {
    const price = parseFloat(priceInput);
    if (isNaN(price) || price < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    if (selectedDates.size === 0) {
      toast({
        title: "No dates selected",
        description: "Click or drag on the calendar first.",
        variant: "destructive",
      });
      return;
    }
    if (editMode === "mealplan" && !selectedRoomOptionId) {
      toast({ title: "Select a meal plan first", variant: "destructive" });
      return;
    }

    if (!selectedRoomTypeId) {
      toast({ title: "No room type selected", variant: "destructive" });
      return;
    }

    const sorted = Array.from(selectedDates).sort();
    if (editMode === "room") {
      setRoomPriceMutation.mutate({
        roomTypeId: selectedRoomTypeId,
        dates: sorted,
        price,
      });
    } else {
      setMealPriceMutation.mutate({
        roomOptionId: selectedRoomOptionId,
        dates: sorted,
        price,
      });
    }
  }

  function handleQuickSelect(type: "weekends" | "weekdays" | "all") {
    const filtered = days
      .filter((d) => {
        if (isPastDate(format(d, "yyyy-MM-dd"))) return false;
        const dow = getDay(d);
        const isWeekend = dow === 0 || dow === 6;
        if (type === "weekends") return isWeekend;
        if (type === "weekdays") return !isWeekend;
        return true;
      })
      .map((d) => format(d, "yyyy-MM-dd"));
    setSelectedDates(new Set(filtered));
  }

  const isPending =
    setRoomPriceMutation.isPending || setMealPriceMutation.isPending;
  const sortedSelected = Array.from(selectedDates).sort();

  const overridesThisMonth = useMemo(() => {
    if (editMode === "room" && selectedRoomType) {
      return Object.entries(selectedRoomType.overrides).filter(
        ([d]) => d >= startDate && d <= endDate,
      );
    }
    if (editMode === "mealplan" && selectedRoomOptionId && calendarData) {
      return Object.entries(calendarData.mealPlanOverrides)
        .filter(
          ([d, opts]) =>
            d >= startDate &&
            d <= endDate &&
            opts[selectedRoomOptionId] !== undefined,
        )
        .map(
          ([d, opts]) => [d, opts[selectedRoomOptionId]] as [string, number],
        );
    }
    return [] as [string, number][];
  }, [
    calendarData,
    editMode,
    selectedRoomType,
    selectedRoomOptionId,
    startDate,
    endDate,
  ]);

  // Derive display room types — prefer the prop (owner page), fall back to
  // calendarData (wizard context where roomTypes prop is always [])
  const displayRoomTypes = useMemo(() => {
    if (roomTypes.length > 0) {
      return roomTypes.map((rt) => ({ id: rt.id, name: rt.name }));
    }
    if (!calendarData?.roomTypes) return [] as { id: string; name: string }[];
    return calendarData.roomTypes.map((rt) => ({
      id: rt.roomTypeId,
      name: rt.roomTypeName,
    }));
  }, [roomTypes, calendarData]);

  // Auto-select first room type once displayRoomTypes becomes available
  useEffect(() => {
    if (!selectedRoomTypeId && displayRoomTypes.length > 0) {
      setSelectedRoomTypeId(displayRoomTypes[0].id);
    }
  }, [displayRoomTypes, selectedRoomTypeId]);

  if (displayRoomTypes.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Bed className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-lg font-semibold text-gray-600">No room types yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Add room types in the Rooms tab, then set date-specific pricing here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ userSelect: "none" }}>
      {/* ── Controls row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        {/* Mode toggle */}
        <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1 w-fit">
          <button
            type="button"
            onClick={() => {
              setEditMode("room");
              setSelectedDates(new Set());
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              editMode === "room"
                ? "bg-white text-orange-600 shadow-sm border border-orange-100"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Bed className="h-4 w-4" /> Room Prices
          </button>
          <button
            type="button"
            onClick={() => {
              setEditMode("mealplan");
              setSelectedDates(new Set());
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              editMode === "mealplan"
                ? "bg-white text-orange-600 shadow-sm border border-orange-100"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Utensils className="h-4 w-4" /> Meal Prices
          </button>
        </div>

        {/* Room type selector (always shown) */}
        <Select
          value={selectedRoomTypeId}
          onValueChange={(v) => {
            setSelectedRoomTypeId(v);
            setSelectedDates(new Set());
          }}
        >
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="Select room type" />
          </SelectTrigger>
          <SelectContent>
            {displayRoomTypes.map((rt) => (
              <SelectItem key={rt.id} value={rt.id}>
                {rt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Occupancy price view selector (room mode only) */}
        {editMode === "room" && (
          <Select
            value={String(selectedOccupancy)}
            onValueChange={(v) => {
              setSelectedOccupancy(Number(v) as 1 | 2 | 3);
              setSelectedDates(new Set());
            }}
          >
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="View prices for" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">View: 1 Guest</SelectItem>
              <SelectItem value="2">View: 2 Guests</SelectItem>
              <SelectItem value="3">View: 3 Guests</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Meal plan selector (only in meal mode) */}
        {editMode === "mealplan" && (
          <Select
            value={selectedRoomOptionId}
            onValueChange={(v) => {
              setSelectedRoomOptionId(v);
              setSelectedDates(new Set());
            }}
          >
            <SelectTrigger className="w-56 bg-white">
              <SelectValue
                placeholder={
                  roomOptionsForType.length === 0
                    ? "No meal plans"
                    : "Select meal plan"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {roomOptionsForType.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Default price chip */}
        {editMode === "room" && selectedRoomType && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-sm">
            <span className="text-gray-400 text-xs">Base</span>
            <span className="font-bold text-gray-800">
              ₹{getOccupancyBasePrice(selectedRoomType).toLocaleString("en-IN")}
            </span>
            <span className="text-gray-400 text-xs">/night</span>
          </div>
        )}
        {editMode === "mealplan" &&
          selectedRoomOptionId &&
          calendarData?.roomOptions[selectedRoomOptionId] && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-sm">
              <span className="text-gray-400 text-xs">Default</span>
              <span className="font-bold text-gray-800">
                ₹
                {calendarData.roomOptions[
                  selectedRoomOptionId
                ].defaultPrice.toLocaleString("en-IN")}
              </span>
              <span className="text-gray-400 text-xs">/person/night</span>
            </div>
          )}

        {overridesThisMonth.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {overridesThisMonth.length} custom price
            {overridesThisMonth.length !== 1 ? "s" : ""} this month
          </Badge>
        )}
      </div>

      {/* ── Meal plan notice ── */}
      {editMode === "mealplan" && roomOptionsForType.length === 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          No meal plans found for this room type. Add meal plans in the Rooms
          tab first.
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-5">
        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button
              type="button"
              onClick={() => {
                setCurrentMonth((m) => subMonths(m, 1));
                setSelectedDates(new Set());
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <h3 className="text-base font-bold text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <button
              type="button"
              onClick={() => {
                setCurrentMonth((m) => addMonths(m, 1));
                setSelectedDates(new Set());
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div key={`b${i}`} />
                ))}
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const past = isPastDate(dateStr);
                  const selected = selectedDates.has(dateStr);
                  const { price, isOverride } = getPriceInfo(dateStr);
                  const todayDate = isToday(day);

                  return (
                    <div
                      key={dateStr}
                      onMouseDown={() => handleMouseDown(dateStr)}
                      onMouseEnter={() => handleMouseEnter(dateStr)}
                      className={`
                        relative flex flex-col items-center justify-center rounded-xl
                        min-h-[4rem] py-1.5 px-1 transition-all duration-100
                        ${past ? "opacity-25 cursor-not-allowed" : "cursor-pointer"}
                        ${
                          selected
                            ? "bg-orange-500 shadow-md ring-2 ring-orange-300 ring-offset-1 z-10"
                            : past
                              ? "bg-transparent"
                              : isOverride
                                ? "bg-orange-50 hover:bg-orange-100 border border-orange-200"
                                : "bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200"
                        }
                        ${todayDate && !selected ? "ring-2 ring-orange-400 ring-offset-1" : ""}
                      `}
                    >
                      <span
                        className={`text-[13px] font-bold leading-none mb-1 ${
                          selected
                            ? "text-white"
                            : todayDate
                              ? "text-orange-600"
                              : "text-gray-700"
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {price !== null && (
                        <span
                          className={`text-[10px] font-semibold leading-none ${
                            selected
                              ? "text-orange-100"
                              : isOverride
                                ? "text-orange-600"
                                : "text-gray-400"
                          }`}
                        >
                          ₹
                          {price >= 1000
                            ? `${(price / 1000).toFixed(1)}k`
                            : price}
                        </span>
                      )}

                      {isOverride && !selected && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 flex-wrap">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-3 h-3 rounded bg-orange-500 inline-block" />{" "}
                Selected
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block" />{" "}
                Custom price
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-3 h-3 rounded bg-gray-50 border border-gray-200 inline-block" />{" "}
                Default
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400 ml-auto">
                <Info className="w-3 h-3" /> Click or drag to select
              </span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4">
          {/* Set price */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Set Price</h4>
              <p className="text-xs text-gray-400 mt-0.5">
                {editMode === "room"
                  ? "Price per room per night"
                  : "Add-on per person per night"}
              </p>
            </div>

            <div>
              {selectedDates.size === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <span className="text-xs text-gray-400">
                    Click or drag dates on the calendar
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">
                      {selectedDates.size} date
                      {selectedDates.size > 1 ? "s" : ""} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedDates(new Set())}
                      className="text-[11px] text-gray-400 hover:text-gray-600 underline"
                    >
                      clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-[5.5rem] overflow-y-auto">
                    {sortedSelected.map((d) => (
                      <span
                        key={d}
                        className="text-[11px] px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md font-medium border border-orange-100"
                      >
                        {format(parseISO(d), "d MMM")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                ₹
              </span>
              <Input
                type="number"
                min="0"
                placeholder="Enter price"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApply()}
                className="pl-8 text-base font-semibold h-11 rounded-xl border-gray-200 focus-visible:ring-orange-200 focus-visible:border-orange-400"
              />
            </div>
            {editMode === "room" && (
              <p className="text-xs text-muted-foreground">
                Sets the <strong>base price</strong> for selected dates. Use the "View" dropdown above to see effective prices for each occupancy level on the calendar.
              </p>
            )}

            <Button
              type="button"
              onClick={handleApply}
              disabled={
                isPending ||
                selectedDates.size === 0 ||
                !priceInput ||
                (editMode === "mealplan" && !selectedRoomOptionId)
              }
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Apply to {selectedDates.size > 0
                    ? selectedDates.size
                    : ""}{" "}
                  date{selectedDates.size !== 1 ? "s" : ""}
                </span>
              )}
            </Button>
          </div>

          {/* Quick select */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <h4 className="font-bold text-gray-900 text-sm">Quick Select</h4>
            <div className="space-y-2">
              {[
                {
                  type: "weekends" as const,
                  emoji: "🎉",
                  label: "All weekends",
                },
                {
                  type: "weekdays" as const,
                  emoji: "📅",
                  label: "All weekdays",
                },
                { type: "all" as const, emoji: "🗓️", label: "Entire month" },
              ].map(({ type, emoji, label }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => handleQuickSelect(type)}
                  className="w-full text-left px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-orange-50 hover:border-orange-200 border border-gray-100 text-sm font-medium text-gray-700 transition-all"
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom prices this month */}
          {overridesThisMonth.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <h4 className="font-bold text-gray-900 text-sm">
                Custom Prices — {format(currentMonth, "MMM yyyy")}
              </h4>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {(overridesThisMonth as [string, number][])
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([dateStr, price]) => (
                    <div
                      key={dateStr}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-orange-50 border border-orange-100"
                    >
                      <span className="text-xs font-semibold text-gray-700">
                        {format(parseISO(dateStr), "EEE, d MMM")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-orange-600">
                          ₹{Number(price).toLocaleString("en-IN")}
                        </span>
                        <button
                          type="button"
                          title="Select this date to revert to default"
                          className="p-1 rounded-lg hover:bg-orange-200 text-orange-300 hover:text-orange-700 transition-colors"
                          onClick={() => {
                            setSelectedDates(new Set([dateStr]));
                            if (editMode === "room" && selectedRoomType) {
                              setPriceInput(
                                String(selectedRoomType.defaultPrice),
                              );
                            } else if (
                              editMode === "mealplan" &&
                              selectedRoomOptionId &&
                              calendarData?.roomOptions[selectedRoomOptionId]
                            ) {
                              setPriceInput(
                                String(
                                  calendarData.roomOptions[selectedRoomOptionId]
                                    .defaultPrice,
                                ),
                              );
                            }
                            toast({
                              title: "Ready to revert",
                              description:
                                "Hit Apply to reset this date to the default price.",
                            });
                          }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
