import { useEffect, useRef, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookingUpdateOptions {
  userId?: string;
  onUpdate?: (data: BookingStatusUpdate) => void;
  onUrgentBooking?: (data: UrgentBookingAlert) => void;
  pollingInterval?: number;
}

export interface BookingStatusUpdate {
  type: "booking_status_update";
  bookingId: string;
  status: string;
  message: string;
  propertyTitle?: string;
  responseMessage?: string | null;
  isEarlyCheckout?: boolean;
}

export interface UrgentBookingAlert {
  type: "urgent_booking_alert";
  bookingId: string;
  bookingCode: string;
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  guests: number;
  rooms: number;
  totalPrice: string;
  timestamp: number;
}

export function useBookingUpdates(options: BookingUpdateOptions = {}) {
  const { userId, onUpdate, onUrgentBooking, pollingInterval = 20000 } = options;
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const invalidateBookingQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/bookings/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
  }, []);

  const handleBookingUpdate = useCallback((data: BookingStatusUpdate) => {
    invalidateBookingQueries();
    
    if (data.bookingId) {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", data.bookingId] });
    }

    if (data.message && data.propertyTitle) {
      const statusMessages: Record<string, { title: string; variant?: "default" | "destructive" }> = {
        confirmed: { title: "Booking Accepted" },
        rejected: { title: "Booking Declined", variant: "destructive" },
        checked_in: { title: "Checked In" },
        checked_out: { title: "Checked Out" },
        completed: { title: "Stay Completed" },
        no_show: { title: "Marked as No-Show", variant: "destructive" },
        cancelled: { title: "Booking Cancelled", variant: "destructive" },
      };
      
      const statusInfo = statusMessages[data.status] || { title: "Booking Updated" };
      
      toast({
        title: statusInfo.title,
        description: data.message,
        variant: statusInfo.variant,
      });
    }

    onUpdate?.(data);
  }, [invalidateBookingQueries, onUpdate, toast]);

  const handleUrgentBookingAlert = useCallback((data: UrgentBookingAlert) => {
    invalidateBookingQueries();
    onUrgentBooking?.(data);
  }, [invalidateBookingQueries, onUrgentBooking]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      if (!isConnectedRef.current) {
        invalidateBookingQueries();
      }
    }, pollingInterval);
  }, [invalidateBookingQueries, pollingInterval]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!userId) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${userId}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[BookingUpdates] WebSocket connected");
        isConnectedRef.current = true;
        reconnectAttemptsRef.current = 0;
        stopPolling();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "booking_status_update") {
            handleBookingUpdate(data as BookingStatusUpdate);
          } else if (data.type === "urgent_booking_alert") {
            handleUrgentBookingAlert(data as UrgentBookingAlert);
          } else if (data.type === "notification_update") {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
          }
        } catch (e) {
          console.error("[BookingUpdates] Message parse error:", e);
        }
      };

      ws.onclose = (event) => {
        console.log("[BookingUpdates] WebSocket closed:", event.code, event.reason);
        isConnectedRef.current = false;
        wsRef.current = null;
        
        startPolling();
        
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[BookingUpdates] Reconnecting... attempt ${reconnectAttemptsRef.current}`);
            connectWebSocket();
          }, delay);
        } else {
          console.log("[BookingUpdates] Max reconnect attempts reached, using polling only");
        }
      };

      ws.onerror = (error) => {
        console.error("[BookingUpdates] WebSocket error:", error);
      };
    } catch (error) {
      console.error("[BookingUpdates] Failed to create WebSocket:", error);
      startPolling();
    }
  }, [userId, handleBookingUpdate, handleUrgentBookingAlert, startPolling, stopPolling]);

  useEffect(() => {
    if (userId) {
      connectWebSocket();
      startPolling();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopPolling();
    };
  }, [userId, connectWebSocket, startPolling, stopPolling]);

  const refresh = useCallback(() => {
    invalidateBookingQueries();
  }, [invalidateBookingQueries]);

  return {
    isConnected: isConnectedRef.current,
    refresh,
  };
}
