import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface PriceBreakdown {
  roomTypeName: string;
  basePrice: number;
  occupancyAdjustment: number;
  occupancyLabel: string;
  mealOptionName: string;
  mealOptionPrice: number;
  nights: number;
  rooms: number;
  guests: number;
  adults: number;
  children: number;
  originalPrice: number | null;
  bulkDiscountPercent: number;
}

interface BookingPriceSummaryProps {
  breakdown: PriceBreakdown;
  gstAmount?: number;
  gstRate?: number;
  gstInclusive?: boolean;
}

export function BookingPriceSummary({
  breakdown,
  gstAmount = 0,
  gstRate = 0,
  gstInclusive = true,
}: BookingPriceSummaryProps) {
  const {
    roomTypeName,
    basePrice,
    occupancyAdjustment,
    occupancyLabel,
    mealOptionName,
    mealOptionPrice,
    nights,
    rooms,
    guests,
    adults,
    children,
    originalPrice,
    bulkDiscountPercent,
  } = breakdown;

  const effectivePrice = basePrice + occupancyAdjustment;
  const roomSubtotal = nights * effectivePrice * rooms;
  const mealSubtotal = nights * mealOptionPrice * guests;
  const originalSubtotal = originalPrice ? nights * originalPrice * rooms : 0;
  const priceSavings = originalPrice ? originalSubtotal - roomSubtotal : 0;

  const platformFee = 0;

  const subtotal = roomSubtotal + mealSubtotal;
  const bulkDiscount =
    bulkDiscountPercent > 0
      ? Math.round((subtotal * bulkDiscountPercent) / 100)
      : 0;
  // GST is included in roomSubtotal when inclusive, so we don't add it again.
  const totalPrice =
    subtotal -
    bulkDiscount +
    platformFee +
    (gstInclusive ? 0 : gstAmount);

  const fmt = (n: number) => n.toLocaleString("en-IN");

  return (
    <Card className="p-4 space-y-3">
      <h3
        className="text-base font-semibold"
        data-testid="text-price-summary-title"
      >
        Price Summary
      </h3>

      {originalPrice && originalPrice > basePrice && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground line-through">
            {roomTypeName}: ₹{fmt(originalPrice)} × {nights}N × {rooms}R
          </span>
          <span className="text-muted-foreground line-through">
            ₹{fmt(originalSubtotal)}
          </span>
        </div>
      )}

      <div
        className="flex justify-between text-sm"
        data-testid="price-room-subtotal"
      >
        <span className="text-muted-foreground">
          <span className="font-medium">{roomTypeName}: </span>
          <span
            className={
              originalPrice ? "text-green-600 dark:text-green-400" : ""
            }
          >
            ₹{fmt(basePrice)}
          </span>
          {occupancyAdjustment > 0 && (
            <span className="text-orange-600 dark:text-orange-400">
              {" + ₹"}
              {fmt(occupancyAdjustment)} ({occupancyLabel})
            </span>
          )}
          {" × "}
          {nights}N × {rooms}R
        </span>
        <span className="font-medium">₹{fmt(roomSubtotal)}</span>
      </div>

      {priceSavings > 0 && (
        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
          <span>Discount savings</span>
          <span>-₹{fmt(priceSavings)}</span>
        </div>
      )}

      {mealOptionPrice > 0 && (
        <div
          className="flex justify-between text-sm"
          data-testid="price-meal-subtotal"
        >
          <span className="text-muted-foreground">
            {mealOptionName} (meal): ₹{fmt(mealOptionPrice)}/person × {adults}{" "}
            adults
            {children > 0 ? ` + ${children} children` : ""} × {nights}N
          </span>
          <span className="font-medium">₹{fmt(mealSubtotal)}</span>
        </div>
      )}

      {bulkDiscount > 0 && (
        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
          <span>Bulk discount ({bulkDiscountPercent}%)</span>
          <span>-₹{fmt(bulkDiscount)}</span>
        </div>
      )}

      <div
        className="flex justify-between text-sm"
        data-testid="price-platform-fee"
      >
        <span className="text-muted-foreground">
          Platform Fee
          {platformFee === 0 && (
            <span className="ml-1 text-xs text-green-700 dark:text-green-300">
              (Zero Commission)
            </span>
          )}
        </span>
        <span className="font-medium text-green-600 dark:text-green-400">
          {platformFee === 0 ? "FREE" : `₹${fmt(platformFee)}`}
        </span>
      </div>

      <div className="flex justify-between text-sm" data-testid="price-gst">
        <span className="text-muted-foreground">
          {gstInclusive && gstAmount > 0
            ? `GST included (${gstRate}%)`
            : "GST"}
        </span>
        <span className="font-medium">
          {gstAmount === 0
            ? "Included"
            : gstInclusive
              ? `₹${fmt(gstAmount)}`
              : `+ ₹${fmt(gstAmount)}`}
        </span>
      </div>

      <Separator />

      <div
        className="flex justify-between items-center"
        data-testid="price-total"
      >
        <span className="text-base font-semibold">Total Amount</span>
        <span className="text-lg font-bold">₹{fmt(totalPrice)}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {guests} guest{guests !== 1 ? "s" : ""} ({adults} adult
          {adults !== 1 ? "s" : ""}, {children} child
          {children !== 1 ? "ren" : ""})
        </span>
      </div>

      <div className="bg-green-50 dark:bg-green-950/30 rounded-md p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 no-default-hover-elevate no-default-active-elevate"
          >
            ZERO Commission
          </Badge>
        </div>
        <p
          className="text-xs text-green-700 dark:text-green-300"
          data-testid="text-pay-at-hotel"
        >
          Pay the full amount directly at the hotel. No advance payment
          required.
        </p>
      </div>
    </Card>
  );
}
