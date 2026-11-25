import { useSyncExternalStore } from "react";

/**
 * Ambient interface sounds.
 *
 * Design rules:
 *  - sounds are meant to be barely audible background texture (see MASTER_GAIN),
 *  - nothing plays before the first user interaction (autoplay policy + courtesy),
 *  - files are fetched lazily and decoded once,
 *  - repeated events are throttled, the slider tick especially,
 *  - the user can mute everything; the choice is stored in localStorage.
 *
 * To change which sound a given event plays, edit ONLY `SFX_EVENT_MAP` below.
 * One sound may serve several events, and an event can be pointed at any sound id.
 */

/** Sound ids = file names in `public/sfx/<id>.ogg|.mp3`. */
export const SFX_IDS = [
  "ui_slider_tick",
  "sim_threshold_exit",
  "coalition_toggle",
  "coalition_majority",
  "coalition_majority_lost",
  "coalition_constitutional",
  "coalition_constitutional_lost",
  "party_add",
  "list_merge",
  "ui_remove",
  "scenario_save",
  "scenario_load",
  "scenario_share",
  "export_json",
  "export_graphic",
  "theme_toggle",
  "toast_error",
  "toast_warning",
  "election_silence",
  "scenario_reset",
  "demographic_toggle",
  "feedback_sent",
  "turnout_group",
] as const;
export type SfxId = (typeof SFX_IDS)[number];

/** Moments of the app that can make a sound. */
export type SfxEvent =
  | "slider.change"
  | "threshold.exit"
  | "coalition.toggle"
  | "coalition.majority"
  | "coalition.majorityLost"
  | "coalition.constitutional"
  | "coalition.constitutionalLost"
  | "party.add"
  | "list.merge"
  | "entity.remove"
  | "scenario.save"
  | "scenario.load"
  | "scenario.share"
  | "scenario.reset"
  | "export.json"
  | "export.graphic"
  | "theme.toggle"
  | "toast.error"
  | "toast.warning"
  | "silence.show"
  | "demographic.toggle"
  | "feedback.sent"
  | "turnout.group";

/** THE place to remap sounds: app event -> sound id (or null when muted). */
export const SFX_EVENT_MAP: Record<SfxEvent, SfxId | null> = {
  "slider.change": null,
  "threshold.exit": null,
  "coalition.toggle": null,
  "coalition.majority": null,
  "coalition.majorityLost": null,
  "coalition.constitutional": null,
  "coalition.constitutionalLost": null,
  "party.add": null,
  "list.merge": null,
  "entity.remove": null,
  "scenario.save": null,
  "scenario.load": null,
  "scenario.share": null,
  "scenario.reset": null,
  "export.json": null,
  "export.graphic": null,
  "theme.toggle": null,
  "toast.error": null,
  "toast.warning": null,
  "silence.show": null,
  "demographic.toggle": null,
  "feedback.sent": null,
  "turnout.group": null,
};

export const HAS_ACTIVE_SFX = Object.values(SFX_EVENT_MAP).some((id) => id !== null);

/**
 * Global volume. The files are already normalised quietly (about -30 LUFS),
 * this is a second, deliberate attenuation (0.15 = about -16 dB) so the sounds stay ambient.
 */
export const SFX_MASTER_GAIN = 0.15;

/** Minimum gap between two plays of the same event. Default: SFX_DEFAULT_GAP_MS. */
const SFX_DEFAULT_GAP_MS = 120;
const SFX_EVENT_GAP_MS: Partial<Record<SfxEvent, number>> = {
  "slider.change": 600,
  "toast.error": 700,
  "toast.warning": 700,
  "coalition.toggle": 80,
};
/** Minimum gap between ANY two sounds, so nothing stacks into a clatter. */
const SFX_GLOBAL_GAP_MS = 70;
/** If a file had to be downloaded and arrives later than this, the moment has passed - skip it. */
const SFX_MAX_LATE_MS = 700;

const STORAGE_KEY = "sejmsim.sfx";

const listeners = new Set<() => void>();
let enabled = true;
let storageRead = false;

function readEnabled(): boolean {
  if (!storageRead && typeof window !== "undefined") {
    storageRead = true;
    try {
      enabled = window.localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      enabled = true;
    }
  }
  return enabled;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reactive on/off state for the UI. Server render and first hydration pass use `true`. */
export function useSfxEnabled(): boolean {
  return useSyncExternalStore(subscribe, readEnabled, () => true);
}

export function setSfxEnabled(next: boolean) {
  readEnabled();
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // Prywatny tryb: wybór obowiązuje do końca wizyty.
  }
  for (const listener of listeners) listener();
  if (next) scheduleIdlePreload();
}

/* ---------------------------- audio engine ---------------------------- */

type AudioCtor = typeof AudioContext;

let unlocked = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let extension: "ogg" | "mp3" | null = null;
const buffers = new Map<SfxId, Promise<AudioBuffer | null>>();
const lastPlayedAt = new Map<SfxEvent, number>();
let lastAnyAt = 0;

function pickExtension(): "ogg" | "mp3" {
  if (extension) return extension;
  let ok = false;
  try {
    ok = document.createElement("audio").canPlayType('audio/ogg; codecs="opus"') !== "";
  } catch {
    ok = false;
  }
  extension = ok ? "ogg" : "mp3";
  return extension;
}

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = SFX_MASTER_GAIN;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
    master = null;
  }
  return ctx;
}

function loadBuffer(id: SfxId): Promise<AudioBuffer | null> {
  const cached = buffers.get(id);
  if (cached) return cached;
  const audio = ensureContext();
  if (!audio) return Promise.resolve(null);
  const promise = fetch(`/sfx/${id}.${pickExtension()}`)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
    .then((data) => audio.decodeAudioData(data))
    .catch(() => {
      buffers.delete(id); // pozwala spróbować ponownie przy następnym razie
      return null;
    });
  buffers.set(id, promise);
  return promise;
}

let preloadScheduled = false;
function scheduleIdlePreload() {
  if (preloadScheduled || !unlocked || !readEnabled()) return;
  preloadScheduled = true;
  const run = () => {
    const activeIds = new Set(
      Object.values(SFX_EVENT_MAP).filter((id): id is SfxId => id !== null),
    );
    for (const id of activeIds) void loadBuffer(id);
  };
  const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run);
  else window.setTimeout(run, 1500);
}

function unlock() {
  if (unlocked) return;
  unlocked = true;
  for (const type of ["pointerdown", "keydown", "touchstart"]) {
    window.removeEventListener(type, unlock, true);
  }
  const audio = ensureContext();
  if (audio && audio.state === "suspended") void audio.resume().catch(() => undefined);
  scheduleIdlePreload();
}

if (typeof window !== "undefined" && HAS_ACTIVE_SFX) {
  // Dźwięk nie zagra, dopóki użytkownik niczego nie kliknie, nie dotknie ani nie wciśnie.
  for (const type of ["pointerdown", "keydown", "touchstart"]) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }
}

/** Plays the sound mapped to an app event. Safe to call anywhere: no-ops when muted, locked or throttled. */
export function playSfx(event: SfxEvent): void {
  if (typeof window === "undefined" || !unlocked || !readEnabled()) return;
  if (document.visibilityState === "hidden") return;

  const id = SFX_EVENT_MAP[event];
  if (!id) return;

  const now = performance.now();
  const gap = SFX_EVENT_GAP_MS[event] ?? SFX_DEFAULT_GAP_MS;
  if (now - (lastPlayedAt.get(event) ?? -Infinity) < gap) return;
  if (now - lastAnyAt < SFX_GLOBAL_GAP_MS) return;
  lastPlayedAt.set(event, now);
  lastAnyAt = now;

  void loadBuffer(id).then((buffer) => {
    const audio = ctx;
    if (!buffer || !audio || !master || !readEnabled()) return;
    if (performance.now() - now > SFX_MAX_LATE_MS) return;
    if (audio.state === "suspended") void audio.resume().catch(() => undefined);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(master);
    source.start();
  });
}
