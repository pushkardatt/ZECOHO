import { useEffect, useRef, useCallback } from "react";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn("Failed to create AudioContext:", error);
      return null;
    }
  }
  return audioContext;
}

export function playNotificationSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator1.type = "sine";
    oscillator1.frequency.setValueAtTime(880, now);
    oscillator1.frequency.setValueAtTime(1100, now + 0.1);

    oscillator2.type = "sine";
    oscillator2.frequency.setValueAtTime(1320, now + 0.05);
    oscillator2.frequency.setValueAtTime(1540, now + 0.15);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.15);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.start(now);
    oscillator2.start(now + 0.05);
    oscillator1.stop(now + 0.3);
    oscillator2.stop(now + 0.3);
  } catch (error) {
    console.warn("Failed to play notification sound:", error);
  }
}

export function useNotificationSound(
  currentCount: number,
  isAuthenticated: boolean,
  enabled: boolean = true
) {
  const previousCountRef = useRef<number>(currentCount);
  const hasInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated || !enabled) {
      previousCountRef.current = 0;
      hasInitializedRef.current = false;
      return;
    }

    if (!hasInitializedRef.current) {
      previousCountRef.current = currentCount;
      hasInitializedRef.current = true;
      return;
    }

    if (currentCount > previousCountRef.current) {
      playNotificationSound();
    }

    previousCountRef.current = currentCount;
  }, [currentCount, isAuthenticated, enabled]);
}

export function useMessageSound() {
  const playSound = useCallback(() => {
    playNotificationSound();
  }, []);

  return { playMessageSound: playSound };
}
