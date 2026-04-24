import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import type { SearchParams } from "@/components/SearchBar";
import { MapPin, Calendar, Users, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

interface StickySearchSummaryProps {
  city: string;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  rooms: number;
  onSearch: (params: SearchParams) => void;
}

export function StickySearchSummary({
  city,
  checkin,
  checkout,
  adults,
  children,
  rooms,
  onSearch,
}: StickySearchSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "dd MMM");
    } catch {
      return dateStr;
    }
  };

  const guestText = `${adults} Adult${adults !== 1 ? "s" : ""}${children > 0 ? `, ${children} Child${children !== 1 ? "ren" : ""}` : ""}`;
  const roomText = `${rooms} Room${rooms !== 1 ? "s" : ""}`;

  const handleSearchSubmit = (params: SearchParams) => {
    onSearch(params);
    setIsExpanded(false);
  };

  return (
    <div
      className="bg-muted/50 border-b fixed md:sticky top-14 left-0 right-0 z-40"
      data-testid="sticky-search-summary"
    >
      <div className="container px-4 md:px-6 py-3">
        <div
          className="bg-background rounded-lg border shadow-sm p-3 cursor-pointer hover-elevate"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="search-summary-toggle"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-sm truncate max-w-[150px] md:max-w-[250px]">
                  {city || "Any Location"}
                </span>
              </div>

              <span className="text-muted-foreground text-xs hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm whitespace-nowrap">
                  {checkin && checkout
                    ? `${formatDate(checkin)} - ${formatDate(checkout)}`
                    : "Select Dates"}
                </span>
              </div>

              <span className="text-muted-foreground text-xs hidden sm:inline">•</span>

              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm whitespace-nowrap">
                  {guestText}, {roomText}
                </span>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              className="flex-shrink-0 gap-1.5 font-semibold"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              data-testid="button-edit-search"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Close
                </>
              ) : (
                <>
                  Edit
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <div
            className="mt-3 bg-background rounded-lg border shadow-sm p-4 animate-in slide-in-from-top-2 duration-200"
            data-testid="expanded-search-form"
          >
            <SearchBar
              onSearch={handleSearchSubmit}
              initialCity={city}
              initialCheckIn={checkin}
              initialCheckOut={checkout}
              initialAdults={adults}
              initialChildren={children}
              initialRooms={rooms}
              ctaText="Update Search"
            />
          </div>
        )}
      </div>
    </div>
  );
}
