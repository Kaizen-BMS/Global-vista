"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import "driver.js/dist/driver.css";
import "./OnboardingTour.css";
import { ONBOARDING_TOUR_LANGUAGES, ONBOARDING_TOUR_SCENES } from "@/lib/content/onboardingTour";

const PENDING_KEY = "gv:tour:pending";
const DONE_KEY = "gv:onboardingTourDone";
const ACTIVE_KEY = "gv:tour:active";
const SCENE_KEY = "gv:tour:sceneIndex";
// Shared with UserGuideClient.js on purpose — one language choice drives
// both the User Guide and this tour, instead of a second independent picker.
const LANG_KEY = "gv:guide:lang";
const START_EVENT = "gv:start-onboarding-tour";

function getLang() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && ONBOARDING_TOUR_LANGUAGES.some((l) => l.code === saved)) return saved;
  } catch { /* ignore */ }
  return "en";
}

function getScenes() {
  return ONBOARDING_TOUR_SCENES[getLang()] || ONBOARDING_TOUR_SCENES.en;
}

/** Resolves once any of `selectors` exists in the DOM, or once `timeout`
 * passes (resolves false either way past the deadline) — a fresh page
 * navigation still has to render + fetch its own data before a scene's
 * target buttons exist. An empty selector list (a pure text/no-element
 * scene) resolves immediately. */
function waitForAnyElement(selectors, { timeout = 5000, interval = 150 } = {}) {
  return new Promise((resolve) => {
    if (selectors.length === 0) { resolve(true); return; }
    const start = Date.now();
    (function tick() {
      if (selectors.some((sel) => document.querySelector(sel))) { resolve(true); return; }
      if (Date.now() - start > timeout) { resolve(false); return; }
      setTimeout(tick, interval);
    })();
  });
}

export default function OnboardingTour({ isChildCompany }) {
  const pathname = usePathname();
  const router = useRouter();
  const driverRef = useRef(null);
  const transitioningRef = useRef(false);
  const runTokenRef = useRef(0);

  function persist(active, sceneIndex) {
    try {
      if (active) { localStorage.setItem(ACTIVE_KEY, "1"); localStorage.setItem(SCENE_KEY, String(sceneIndex)); }
      else { localStorage.removeItem(ACTIVE_KEY); localStorage.removeItem(SCENE_KEY); }
    } catch { /* ignore */ }
  }

  function stopTour() {
    driverRef.current?.destroy?.();
    driverRef.current = null;
    persist(false);
    try { localStorage.setItem(DONE_KEY, "1"); } catch { /* ignore */ }
  }

  async function runScene(sceneIndex) {
    const token = ++runTokenRef.current;
    const scenes = getScenes();
    if (sceneIndex >= scenes.length) { stopTour(); return; }
    const scene = scenes[sceneIndex];
    persist(true, sceneIndex);

    if (scene.route && scene.route !== window.location.pathname) {
      router.push(scene.route);
      return; // the pathname effect below re-invokes runScene(sceneIndex) once the new route has mounted
    }

    const selectors = scene.steps.map((s) => s.element).filter(Boolean);
    const found = await waitForAnyElement(selectors);
    if (token !== runTokenRef.current) return; // a newer run (replay, or a further nav) superseded this one

    const liveSteps = found ? scene.steps.filter((s) => !s.element || document.querySelector(s.element)) : scene.steps.filter((s) => !s.element);
    if (liveSteps.length === 0) { runScene(sceneIndex + 1); return; }

    const { driver } = await import("driver.js");
    if (token !== runTokenRef.current) return;

    const isLastScene = sceneIndex === scenes.length - 1;
    const steps = liveSteps.map((step, i) => {
      if (isLastScene || i !== liveSteps.length - 1) return step;
      // Last step of a non-final scene: hand off to the next scene instead
      // of letting driver.js try to advance to a step that doesn't exist.
      return { ...step, popover: { ...step.popover, onNextClick: () => { transitioningRef.current = true; driverObj.destroy(); } } };
    });

    const driverObj = driver({
      showProgress: true,
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Done",
      progressText: "{{current}} / {{total}}",
      steps,
      onDestroyStarted: () => {
        driverObj.destroy();
        if (transitioningRef.current) { transitioningRef.current = false; runScene(sceneIndex + 1); }
        else stopTour();
      },
    });
    driverRef.current = driverObj;
    driverObj.drive();
  }

  // Re-entered on every route change — picks up an in-flight scene
  // navigation (ACTIVE_KEY) once the target page has actually mounted, and
  // also covers the very first mount (auto-start from a pending first
  // login, or resuming a tour that was mid-flight when the page reloaded).
  useEffect(() => {
    if (!isChildCompany) return;
    let cancelled = false;
    (async () => {
      let active = false, savedScene = 0, pending = false, done = false;
      try {
        active = localStorage.getItem(ACTIVE_KEY) === "1";
        savedScene = Number(localStorage.getItem(SCENE_KEY) || "0");
        pending = localStorage.getItem(PENDING_KEY) === "1";
        done = localStorage.getItem(DONE_KEY) === "1";
      } catch { /* ignore */ }

      if (active) { if (!cancelled) runScene(savedScene); return; }
      if (pending && !done) {
        try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
        await new Promise((r) => setTimeout(r, 600));
        if (!cancelled) runScene(0);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isChildCompany]);

  // Manual replay (the "Tour Shuru Karo" button on the User Guide page) —
  // always restarts from Scene 1, ignoring the done flag.
  useEffect(() => {
    if (!isChildCompany) return;
    function onStart() { runScene(0); }
    window.addEventListener(START_EVENT, onStart);
    return () => window.removeEventListener(START_EVENT, onStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChildCompany]);

  useEffect(() => () => { driverRef.current?.destroy?.(); }, []);

  return null;
}
