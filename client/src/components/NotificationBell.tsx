import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/useNotifications";
import { stopNotificationSound } from "@/hooks/useNotificationSound";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import type { Notification } from "@shared/schema";

function timeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString();
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "booking_request":
    case "booking_confirmed":
    case "booking_cancelled":
    case "booking_completed":
      return <Calendar className="h-4 w-4 text-primary flex-shrink-0" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
  }
}

function getNotificationLink(notification: Notification, isOwner: boolean): string | null {
  if (notification.entityType === "booking") {
    if (isOwner) {
      // Owner: route to the owner bookings page
      // booking_request → land on the Pending tab and highlight the specific booking
      const bookingId = notification.bookingId || notification.entityId;
      if (notification.type === "booking_request") {
        return bookingId
          ? `/owner/bookings?tab=pending&highlight=${bookingId}`
          : `/owner/bookings?tab=pending`;
      }
      // Other booking events (confirmed, cancelled, etc.) → owner bookings without a forced tab
      return bookingId
        ? `/owner/bookings?highlight=${bookingId}`
        : `/owner/bookings`;
    }
    // Customer: always go to their own bookings page
    return `/my-bookings`;
  }
  if (notification.entityType === "property" && notification.entityId) {
    return `/properties/${notification.entityId}`;
  }
  return null;
}

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { isOwner } = useAuth();
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevNotifCountRef = useRef(notifications.length);

  const latestNotifications = notifications.slice(0, 10);

  useEffect(() => {
    if (open && notifications.length > prevNotifCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevNotifCountRef.current = notifications.length;
  }, [notifications.length, open]);

  useEffect(() => {
    if (open) {
      stopNotificationSound();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    stopNotificationSound();
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    const link = getNotificationLink(notification, isOwner);
    if (link) {
      setLocation(link);
      setOpen(false);
    }
  }, [markAsRead, setLocation, isOwner]);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs rounded-full"
              data-testid="badge-notification-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] sm:w-[380px] p-0 rounded-lg shadow-lg"
        data-testid="panel-notifications"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b sticky top-0 bg-popover z-10 rounded-t-lg">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs pointer-events-none">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <div
          ref={scrollRef}
          className="overflow-y-auto overscroll-contain"
          style={{
            maxHeight: "min(450px, 65vh)",
            WebkitOverflowScrolling: "touch",
            scrollBehavior: "smooth",
          }}
        >
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : latestNotifications.length === 0 ? (
            <div className="p-8 text-center" data-testid="text-no-notifications">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div>
              {latestNotifications.map((notification) => {
                const link = getNotificationLink(notification, isOwner);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 flex gap-3 items-start transition-colors hover-elevate ${
                      !notification.isRead ? "bg-primary/5" : ""
                    }`}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!notification.isRead ? "font-semibold" : "font-normal"}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(notification.createdAt)}
                        </span>
                        {link && (
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
