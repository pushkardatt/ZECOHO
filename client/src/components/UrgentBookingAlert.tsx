import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UrgentBookingAlert as UrgentBookingAlertData } from "@/hooks/useBookingUpdates";
import { Bell, Check, X, Clock, User, MapPin, Calendar, BedDouble, IndianRupee, AlertTriangle, Eye } from "lucide-react";
import { useLocation } from "wouter";

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
  const [escalated, setEscalated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // --- Sound helpers (defined first so effects can reference them) ---

  const stopSound = useCallback(() => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const playAlertTone = useCallback((ctx: AudioContext) => {
    const now = ctx.currentTime;
    [800, 1000, 1200].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "square";
      gain.gain.setValueAtTime(0.3, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.14);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.14);
    });
  }, []);

  // --- Reset all state when a new alert arrives ---
  useEffect(() => {
    if (!alert) {
      stopSound();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      return;
    }

    // Reset state for fresh alert
    setCountdown(COUNTDOWN_SECONDS);
    setActionTaken(false);
    setIsAccepting(false);
    setIsRejecting(false);
    setEscalated(false);
    setErrorMessage(null);

    // Start audio
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        playAlertTone(ctx);
        soundIntervalRef.current = setInterval(() => playAlertTone(ctx), 5000);
      }
    } catch (err) {
      console.warn("[UrgentAlert] Audio not supported:", err);
    }

    return () => {
      stopSound();
    };
  }, [alert, playAlertTone, stopSound]);

  // --- Countdown timer ---
  useEffect(() => {
    if (!alert || actionTaken) return;

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [alert, actionTaken]);

  // --- Timer expiry: navigate to bookings page, then close modal ---
  // Per spec: Do NOT expire booking. Do NOT disable Accept.
  // Redirect to bookings page. Keep booking Pending. Modal closes via navigation.
  useEffect(() => {
    if (countdown !== 0 || actionTaken || escalated || !alert) return;

    setEscalated(true);
    stopSound();

    // Navigate first — if on a different page this unmounts the modal naturally.
    // Then dismiss to clear state (batched with navigation in the same React flush).
    setLocation(`/owner/bookings?highlight=${alert.bookingId}`);
    onDismiss();
  }, [countdown, actionTaken, escalated, alert, stopSound, onDismiss, setLocation]);

  // --- Accept action ---
  const handleAccept = async () => {
    if (!alert || isAccepting || isRejecting) return;
    setIsAccepting(true);
    setErrorMessage(null);
    stopSound();

    try {
      await apiRequest("PATCH", `/api/owner/bookings/${alert.bookingId}/status`, {
        status: "confirmed",
      });
      setActionTaken(true);

      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

      toast({
        title: "Booking Accepted",
        description: `Booking ${alert.bookingCode} has been confirmed. Guest will be notified.`,
      });

      setTimeout(onDismiss, 1500);
    } catch (error: any) {
      const msg =
        error?.message || "Failed to accept booking. Please try from the Bookings page.";
      setErrorMessage(msg);
      setIsAccepting(false);
    }
  };

  // --- Reject action ---
  const handleReject = async () => {
    if (!alert || isRejecting || isAccepting) return;
    setIsRejecting(true);
    setErrorMessage(null);
    stopSound();

    try {
      await apiRequest("PATCH", `/api/owner/bookings/${alert.bookingId}/status`, {
        status: "rejected",
        responseMessage: "Unable to accommodate at this time.",
      });
      setActionTaken(true);

      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });

      toast({
        title: "Booking Declined",
        description: `Booking ${alert.bookingCode} has been declined. Guest will be notified.`,
        variant: "destructive",
      });

      setTimeout(onDismiss, 1500);
    } catch (error: any) {
      const msg =
        error?.message || "Failed to decline booking. Please try from the Bookings page.";
      setErrorMessage(msg);
      setIsRejecting(false);
    }
  };

  // --- View Details: close modal and go to bookings ---
  const handleViewDetails = () => {
    if (!alert) return;
    stopSound();
    onDismiss();
    setLocation(`/owner/bookings?highlight=${alert.bookingId}`);
  };

  if (!alert) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const isUrgent = countdown <= 30;
  const progressPercent = (countdown / COUNTDOWN_SECONDS) * 100;
  const isBusy = isAccepting || isRejecting;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      data-testid="urgent-booking-alert-overlay"
    >
      <Card className="w-full max-w-md overflow-visible border-2 border-orange-500 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="relative">
          {/* Progress bar */}
          <div
            className="absolute top-0 left-0 h-1 bg-orange-500 transition-all duration-1000 rounded-t-lg"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Header */}
          <div
            className={`p-4 text-center ${
              isUrgent
                ? "bg-red-50 dark:bg-red-950/30"
                : "bg-orange-50 dark:bg-orange-950/30"
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertTriangle
                className={`h-5 w-5 ${isUrgent ? "text-red-500 animate-pulse" : "text-orange-500"}`}
              />
              <span className="text-sm font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                New Booking – Action Required
              </span>
              <AlertTriangle
                className={`h-5 w-5 ${isUrgent ? "text-red-500 animate-pulse" : "text-orange-500"}`}
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <Clock
                className={`h-5 w-5 ${isUrgent ? "text-red-500" : "text-orange-500"}`}
              />
              <span
                className={`text-2xl font-bold tabular-nums ${
                  isUrgent
                    ? "text-red-600 dark:text-red-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
                data-testid="alert-countdown"
              >
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Body */}
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
                <span>
                  {alert.checkIn} – {alert.checkOut}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm" data-testid="alert-room-type">
                <BedDouble className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  {alert.roomType} ({alert.rooms} room{alert.rooms > 1 ? "s" : ""},{" "}
                  {alert.guests} guest{alert.guests > 1 ? "s" : ""})
                </span>
              </div>
              <div
                className="flex items-center gap-2 text-sm font-semibold"
                data-testid="alert-total-price"
              >
                <IndianRupee className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Rs. {Number(alert.totalPrice).toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Inline error */}
            {errorMessage && (
              <div
                className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md"
                data-testid="alert-error-message"
              >
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{errorMessage}</p>
              </div>
            )}

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
              <div className="space-y-2">
                <div className="flex gap-2">
                  {/* Accept */}
                  <Button
                    className="flex-1 bg-green-600 text-white border-green-600"
                    onClick={handleAccept}
                    disabled={isBusy}
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

                  {/* Reject */}
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
                    onClick={handleReject}
                    disabled={isBusy}
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

                {/* View Details */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleViewDetails}
                  disabled={isBusy}
                  data-testid="button-view-booking-alert"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
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
        isFlashing ? "bg-orange-500 text-white" : "bg-orange-600 text-white"
      }`}
      data-testid="urgent-booking-banner"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Bell className="h-4 w-4 shrink-0 animate-bounce" />
        <span className="font-semibold text-sm truncate">
          New Booking: {alert.bookingCode} – {alert.guestName} at {alert.propertyName}
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
