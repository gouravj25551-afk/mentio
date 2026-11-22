"use client";
// Tiny interface sounds, synthesized with the Web Audio API (no audio files).
// Browsers only allow audio after a user gesture, so nothing plays until the
// first click or key press. The preference is remembered per browser.

type SoundName = "hover" | "select" | "toggle" | "success" | "error";

const STORAGE_KEY = "mentio:sound";
let ctx: AudioContext | null = null;
let unlocked = false;
let lastHover = 0;
const listeners = new Set<(on: boolean) => void>();

function readEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

let enabled = typeof window === "undefined" ? false : readEnabled();

export function isSoundEnabled() {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // storage can be unavailable (private mode); the toggle still works for this visit
  }
  listeners.forEach((fn) => fn(on));
  if (on) play("toggle");
}

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A short sine "blip" with a fast attack and exponential decay. */
function blip(ac: AudioContext, { freq, to, dur, gain, type = "sine", at = 0 }: { freq: number; to?: number; dur: number; gain: number; type?: OscillatorType; at?: number }) {
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function play(name: SoundName) {
  if (!enabled || !unlocked || typeof window === "undefined") return;
  if (name === "hover") {
    const now = performance.now();
    if (now - lastHover < 45) return; // sweeping across a list shouldn't buzz
    lastHover = now;
  }
  const ac = audio();
  if (!ac) return;
  switch (name) {
    case "hover":
      blip(ac, { freq: 2400, dur: 0.025, gain: 0.012 });
      break;
    case "select":
      blip(ac, { freq: 1300, to: 900, dur: 0.06, gain: 0.05, type: "triangle" });
      break;
    case "toggle":
      blip(ac, { freq: 700, to: 1100, dur: 0.07, gain: 0.04, type: "triangle" });
      break;
    case "success":
      blip(ac, { freq: 880, dur: 0.12, gain: 0.05 });
      blip(ac, { freq: 1320, dur: 0.18, gain: 0.05, at: 0.09 });
      break;
    case "error":
      blip(ac, { freq: 300, to: 200, dur: 0.15, gain: 0.05, type: "triangle" });
      break;
  }
}

const INTERACTIVE = "a[href], button:not([disabled]), [role='tab'], [role='menuitem'], [role='option'], select, summary, label[for], input[type='checkbox'], input[type='radio']";

/**
 * Wires hover and click sounds to every interactive element on the page.
 * Elements can opt out with data-sound="off". Returns a cleanup function.
 */
export function installUiSounds() {
  let lastEl: Element | null = null;
  const unlock = () => {
    unlocked = true;
    audio();
  };
  const onOver = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = (e.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
    if (el === lastEl) return;
    lastEl = el;
    if (el && !el.closest("[data-sound='off']")) play("hover");
  };
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
    if (el && !el.closest("[data-sound='off']")) play("select");
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
  document.addEventListener("pointerover", onOver, { passive: true });
  document.addEventListener("click", onClick, { capture: true, passive: true });
  return () => {
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("click", onClick, { capture: true });
  };
}
