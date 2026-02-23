import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UrgentBookingAlert as UrgentBookingAlertData } from "@/hooks/useBookingUpdates";
import { Bell, Check, X, Clock, User, MapPin, Calendar, BedDouble, IndianRupee, AlertTriangle } from "lucide-react";

const COUNTDOWN_SECONDS = 120;

interface UrgentBookingAlertProps {
  alert: UrgentBookingAlertData | null;
  onDismiss: () => void;
}

export function UrgentBookingAlertModal({ alert, onDismiss }: UrgentBookingAlertProps) {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!alert) return;

    setCountdown(COUNTDOWN_SECONDS);
    setActionTaken(false);
    setIsAccepting(false);
    setIsRejecting(false);

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playAlertTone = () => {
        const now = audioContext.currentTime;
        
        [800, 1000, 1200].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          osc.frequency.value = freq;
          osc.type = 'square';
          gain.gain.setValueAtTime(0.3, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.14);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.14);
        });
      };

      playAlertTone();
      const soundInterval = setInterval(playAlertTone, 5000);
      
      audioRef.current = { pause: () => clearInterval(soundInterval) } as any;

      return () => {
        clearInterval(soundInterval);
        audioContext.close().catch(() => {});
      };
    } catch (err) {
      console.warn('[UrgentAlert] Audio not supported:', err);
    }
  }, [alert]);

  useEffect(() => {
    if (!alert || actionTaken) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [alert, actionTaken]);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const handleAccept = async () => {
    if (!alert || isAccepting) return;
    setIsAccepting(true);
    stopSound();

    try {
      await apiRequest("POST", `/api/bookings/${alert.bookingId}/confirm`, {});
      setActionTaken(true);
      
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", alert.bookingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });

      toast({
        title: "Booking Accepted",
        description: `Booking ${alert.bookingCode} has been confirmed.`,
      });

      try {
        await apiRequest("POST", "/api/push/log-action", {
          bookingId: alert.bookingId,
          action: "accept",
        });
      } catch {}

      setTimeout(onDismiss, 1500);
    } catch (error: any) {
      toast({
        title: "Failed to Accept",
        description: error.message || "Please try again or go to your bookings page.",
        variant: "destructive",
      });
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!alert || isRejecting) return;
    setIsRejecting(true);
    stopSound();

    try {
      await apiRequest("POST", `/api/bookings/${alert.bookingId}/reject`, {
        responseMessage: "Unable to accommodate at this time.",
      });
      setActionTaken(true);
      
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", alert.bookingId] });

      toast({
        title: "Booking Declined",
        description: `Booking ${alert.bookingCode} has been declined.`,
        variant: "destructive",
      });

      try {
        await apiRequest("POST", "/api/push/log-action", {
          bookingId: alert.bookingId,
          action: "reject",
        });
      } catch {}

      setTimeout(onDismiss, 1500);
    } catch (error: any) {
      toast({
        title: "Failed to Decline",
        description: error.message || "Please try again or go to your bookings page.",
        variant: "destructive",
      });
      setIsRejecting(false);
    }
  };

  if (!alert) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const isUrgent = countdown <= 30;
  const progressPercent = (countdown / COUNTDOWN_SECONDS) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      data-testid="urgent-booking-alert-overlay"
    >
      <Card className="mx-4 w-full max-w-md overflow-visible border-2 border-orange-500 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="relative">
          <div
            className="absolute top-0 left-0 h-1 bg-orange-500 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />

          <div className={`p-4 text-center ${isUrgent ? 'bg-red-50 dark:bg-red-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle className={`h-5 w-5 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-orange-500'}`} />
              <span className="text-sm font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                New Booking - Action Required
              </span>
              <AlertTriangle className={`h-5 w-5 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-orange-500'}`} />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Clock className={`h-5 w-5 ${isUrgent ? 'text-red-500' : 'text-orange-500'}`} />
              <span className={`text-2xl font-bold tabular-nums ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
            </div>
            {countdown === 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                Time expired - Please respond immediately
              </p>
            )}
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 justify-between flex-wrap">
              <Badge variant="outline" className="text-xs font-mono">
                {alert.bookingCode}
              </Badge>
              <Badge className="bg-orange-500 text-white border-orange-500 no-default-hover-elevate no-default-active-elevate">
                <Bell className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm" data-testid="alert-guest-name">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{alert.guestName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm" data-testid="alert-property-name">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{alert.propertyName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm" data-testid="alert-dates">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{alert.checkIn} - {alert.checkOut}</span>
              </div>
              <div className="flex items-center gap-2 text-sm" data-testid="alert-room-type">
                <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{alert.roomType} ({alert.rooms} room{alert.rooms > 1 ? 's' : ''}, {alert.guests} guest{alert.guests > 1 ? 's' : ''})</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold" data-testid="alert-total-price">
                <IndianRupee className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Rs. {Number(alert.totalPrice).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Confirm within 2 minutes to avoid escalation call.
            </p>

            {actionTaken ? (
              <div className="text-center py-2">
                <Badge className="bg-green-500 text-white border-green-500 no-default-hover-elevate no-default-active-elevate">
                  <Check className="h-3 w-3 mr-1" />
                  Action Recorded
                </Badge>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
                  onClick={handleAccept}
                  disabled={isAccepting || isRejecting}
                  data-testid="button-accept-booking-alert"
                >
                  {isAccepting ? (
                    <span className="flex items-center gap-1">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Accepting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Accept
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                  onClick={handleReject}
                  disabled={isAccepting || isRejecting}
                  data-testid="button-reject-booking-alert"
                >
                  {isRejecting ? (
                    <span className="flex items-center gap-1">
                      <span className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      Declining...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <X className="h-4 w-4" />
                      Reject
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function UrgentBookingBanner({ alert, onDismiss }: UrgentBookingAlertProps) {
  const [isFlashing, setIsFlashing] = useState(true);

  useEffect(() => {
    if (!alert) return;
    setIsFlashing(true);
    const timer = setInterval(() => {
      setIsFlashing((prev) => !prev);
    }, 1000);
    return () => clearInterval(timer);
  }, [alert]);

  if (!alert) return null;

  return (
    <div
      className={`sticky top-0 z-[100] w-full px-4 py-3 flex items-center justify-between gap-3 flex-wrap transition-colors duration-500 ${
        isFlashing
          ? 'bg-orange-500 text-white'
          : 'bg-orange-600 text-white'
      }`}
      data-testid="urgent-booking-banner"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Bell className="h-4 w-4 shrink-0 animate-bounce" />
        <span className="font-semibold text-sm truncate">
          New Booking: {alert.bookingCode} - {alert.guestName} at {alert.propertyName}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href={`/owner/bookings?highlight=${alert.bookingId}`}
          className="text-xs font-medium underline underline-offset-2"
          data-testid="link-view-booking-banner"
        >
          View Details
        </a>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-white"
          onClick={onDismiss}
          data-testid="button-dismiss-banner"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
