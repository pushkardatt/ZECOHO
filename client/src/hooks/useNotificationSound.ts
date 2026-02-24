import { useEffect, useRef, useCallback } from "react";

/**
 * Browser Background Audio Limitations:
 * - Most browsers restrict audio playback when the tab is not visible/active.
 * - The Web Audio API requires a user gesture to create or resume an AudioContext.
 * - When a tab is in the background, browsers may throttle or suspend audio.
 * - This module queues sounds when the tab is inactive and plays them when the user returns.
 * - AudioContext is preloaded on the first user interaction (click/touch/keydown) to bypass autoplay restrictions.
 */

let audioContext: AudioContext | null = null;
let isPlaying = false;
let activeOscillators: OscillatorNode[] = [];
let activeGainNode: GainNode | null = null;
let pendingSound = false;
let contextPreloaded = false;

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

function preloadAudioContext(): void {
  if (contextPreloaded) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  contextPreloaded = true;
}

function setupPreloader(): void {
  if (contextPreloaded) return;
  const handler = () => {
    preloadAudioContext();
    window.removeEventListener("click", handler);
    window.removeEventListener("touchstart", handler);
    window.removeEventListener("keydown", handler);
  };
  window.addEventListener("click", handler, { once: false });
  window.addEventListener("touchstart", handler, { once: false });
  window.addEventListener("keydown", handler, { once: false });
}

if (typeof window !== "undefined") {
  setupPreloader();
}

function triggerVibration(): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch {}
}

function isTabVisible(): boolean {
  return typeof document !== "undefined" ? !document.hidden : true;
}

function generateAlertSound(ctx: AudioContext): { duration: number } {
  const now = ctx.currentTime;
  const totalDuration = 6;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.25, now);
  masterGain.connect(ctx.destination);
  activeGainNode = masterGain;

  activeOscillators = [];

  const noteSequence = [
    { freq: 880, start: 0, end: 0.4, type: "sine" as OscillatorType },
    { freq: 1100, start: 0.4, end: 0.8, type: "sine" as OscillatorType },
    { freq: 1320, start: 0.8, end: 1.2, type: "sine" as OscillatorType },
    { freq: 1100, start: 1.2, end: 1.6, type: "sine" as OscillatorType },
    { freq: 880, start: 1.6, end: 2.0, type: "sine" as OscillatorType },
    { freq: 660, start: 2.2, end: 2.6, type: "triangle" as OscillatorType },
    { freq: 880, start: 2.6, end: 3.0, type: "triangle" as OscillatorType },
    { freq: 1100, start: 3.0, end: 3.4, type: "triangle" as OscillatorType },
    { freq: 1320, start: 3.4, end: 3.8, type: "triangle" as OscillatorType },
    { freq: 1100, start: 3.8, end: 4.2, type: "sine" as OscillatorType },
    { freq: 880, start: 4.4, end: 4.8, type: "sine" as OscillatorType },
    { freq: 1100, start: 4.8, end: 5.2, type: "sine" as OscillatorType },
    { freq: 1320, start: 5.2, end: 5.6, type: "sine" as OscillatorType },
    { freq: 1540, start: 5.6, end: 6.0, type: "sine" as OscillatorType },
  ];

  noteSequence.forEach((note) => {
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = note.type;
    osc.frequency.setValueAtTime(note.freq, now + note.start);

    const attackTime = 0.03;
    const releaseTime = 0.08;
    const noteDuration = note.end - note.start;

    noteGain.gain.setValueAtTime(0, now + note.start);
    noteGain.gain.linearRampToValueAtTime(0.8, now + note.start + attackTime);
    noteGain.gain.setValueAtTime(0.8, now + note.end - releaseTime);
    noteGain.gain.linearRampToValueAtTime(0, now + note.end);

    osc.connect(noteGain);
    noteGain.connect(masterGain);

    osc.start(now + note.start);
    osc.stop(now + note.start + noteDuration + 0.01);

    activeOscillators.push(osc);
  });

  masterGain.gain.setValueAtTime(0.25, now + totalDuration - 0.3);
  masterGain.gain.linearRampToValueAtTime(0, now + totalDuration);

  return { duration: totalDuration };
}

export function playNotificationSound(): void {
  if (isPlaying) return;

  if (!isTabVisible()) {
    pendingSound = true;
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    isPlaying = true;
    triggerVibration();

    const { duration } = generateAlertSound(ctx);

    setTimeout(() => {
      isPlaying = false;
      activeOscillators = [];
      activeGainNode = null;
    }, duration * 1000 + 100);
  } catch (error) {
    console.warn("Failed to play notification sound:", error);
    isPlaying = false;
  }
}

export function stopNotificationSound(): void {
  if (!isPlaying) return;

  try {
    if (activeGainNode) {
      const ctx = getAudioContext();
      if (ctx) {
        const now = ctx.currentTime;
        activeGainNode.gain.cancelScheduledValues(now);
        activeGainNode.gain.setValueAtTime(activeGainNode.gain.value, now);
        activeGainNode.gain.linearRampToValueAtTime(0, now + 0.05);
      }
    }

    setTimeout(() => {
      activeOscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {}
      });
      activeOscillators = [];
      activeGainNode = null;
      isPlaying = false;
    }, 60);
  } catch {
    activeOscillators = [];
    activeGainNode = null;
    isPlaying = false;
  }

  pendingSound = false;
}

function handleVisibilityChange(): void {
  if (!document.hidden && pendingSound) {
    pendingSound = false;
    setTimeout(() => {
      playNotificationSound();
    }, 300);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", handleVisibilityChange);
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

  return { stopSound: stopNotificationSound };
}

export function useMessageSound() {
  const playSound = useCallback(() => {
    playNotificationSound();
  }, []);

  const stop = useCallback(() => {
    stopNotificationSound();
  }, []);

  return { playMessageSound: playSound, stopSound: stop };
}
