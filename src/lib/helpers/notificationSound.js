"use client";

// A short, generated two-tone chime — no bundled audio asset to manage,
// and it's trivially "not continuous" since it's built to play once and
// stop. Browsers block audio before any user gesture on the page; `unlock()`
// resumes the shared AudioContext on the first real click/keypress so the
// very first reminder isn't silently swallowed by that policy.
let ctx = null;
let unlocked = false;

function getContext() {
  if (!ctx && typeof window !== "undefined" && window.AudioContext) ctx = new window.AudioContext();
  return ctx;
}

export function unlockNotificationSound() {
  if (unlocked) return;
  const c = getContext();
  if (c && c.state === "suspended") c.resume().catch(() => {});
  unlocked = true;
}

/** `urgent` plays a slightly higher, sharper chime for the closer-to-due stages. */
export function playNotificationSound(urgent = false) {
  const c = getContext();
  if (!c || c.state === "suspended") return; // not unlocked by a user gesture yet — stay silent rather than throw
  const now = c.currentTime;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  gain.connect(c.destination);

  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(urgent ? 880 : 660, now);
  osc.frequency.setValueAtTime(urgent ? 1108 : 880, now + 0.12);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.36);
}
