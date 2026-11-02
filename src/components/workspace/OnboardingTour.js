"use client";
import { useEffect } from "react";
import "driver.js/dist/driver.css";
import "./OnboardingTour.css";

const PENDING_KEY = "gv:tour:pending";
const DONE_KEY = "gv:onboardingTourDone";
const START_EVENT = "gv:start-onboarding-tour";

/** One entry per school-visible sidebar item (see getVisibleNavItems/
 * navItems.js) — `element` must match the `data-tour-target={href}`
 * attribute added to every NavLink in Sidebar.js. Hinglish, on purpose —
 * this is a first-timer tour, not another locale of the User Guide. */
const TOUR_STEPS = [
  {
    element: '[data-tour-target="/workspace/dashboard"]',
    popover: { title: "Dashboard", description: "Yahan aapko apne school ka poora overview milega — naye admissions, pending follow-ups, sab kuch ek hi jagah." },
  },
  {
    element: '[data-tour-target="/workspace/lead-management"]',
    popover: { title: "Students", description: "Apne sabhi students yahan manage karo — naya student add karo, unka stage (enquiry se admission tak) track karo." },
  },
  {
    element: '[data-tour-target="/workspace/followups"]',
    popover: { title: "Follow-ups", description: "Jin students/parents se dobara baat karni hai, unke reminders yahan milenge — kuch bhi miss nahi hoga." },
  },
  {
    element: '[data-tour-target="/workspace/users"]',
    popover: { title: "Employees", description: "Apni team — counsellors, staff — yahan se add aur manage karo." },
  },
  {
    element: '[data-tour-target="/workspace/roles"]',
    popover: { title: "Roles", description: "Kisko kya dikhna chahiye, kaun kya kar sakta hai — permissions yahan set karo." },
  },
  {
    element: '[data-tour-target="/workspace/settings"]',
    popover: { title: "Settings", description: "School ki saari settings, branding, aur configuration yahan milegi." },
  },
  {
    element: '[data-tour-target="/workspace/messages"]',
    popover: { title: "Messages", description: "Apni team se chat karo — aur ab Global Vista Educators se bhi seedha baat kar sakte ho (External tab me)." },
  },
  {
    element: '[data-tour-target="/workspace/support"]',
    popover: { title: "Support & Feedback", description: "Koi dikkat ho ya suggestion dena ho, yahan se bhej do." },
  },
  {
    element: '[data-tour-target="/workspace/notifications"]',
    popover: { title: "Notifications", description: "Important updates aur alerts yahan sabse pehle milenge." },
  },
  {
    element: '[data-tour-target="/workspace/activity-logs"]',
    popover: { title: "Activity Logs", description: "Kisne kya kiya — poora record yahan milega, jab bhi zaroorat pade." },
  },
  {
    element: '[data-tour-target="/workspace/guide"]',
    popover: { title: "User Guide", description: "Kabhi bhi confuse ho, to yahan wapas aa jao — ye guide hamesha yahan milega, aur ye tour bhi yahan se dubara shuru kar sakte ho." },
  },
  {
    popover: { title: "Bas itna hi! 🎉", description: "Ab aap khud explore karna shuru kar sakte ho. Kabhi bhi help chahiye ho to 'User Guide' me yahi tour dubara mil jayega." },
  },
];

function launchTour(driverObj) {
  try { localStorage.setItem(DONE_KEY, "1"); } catch { /* ignore */ }
  driverObj.drive();
}

export default function OnboardingTour({ isChildCompany }) {
  useEffect(() => {
    if (!isChildCompany) return;
    let driverObj;
    let cancelled = false;

    import("driver.js").then(({ driver }) => {
      if (cancelled) return;
      driverObj = driver({
        showProgress: true,
        nextBtnText: "Aage →",
        prevBtnText: "← Peeche",
        doneBtnText: "Done",
        progressText: "{{current}} / {{total}}",
        steps: TOUR_STEPS,
      });

      let pending = false;
      try { pending = localStorage.getItem(PENDING_KEY) === "1" && localStorage.getItem(DONE_KEY) !== "1"; } catch { /* ignore */ }
      if (pending) {
        try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
        // Small delay so the sidebar has actually painted before driver.js
        // measures where to draw its first spotlight.
        setTimeout(() => { if (!cancelled) launchTour(driverObj); }, 600);
      }

      function onStartRequested() { launchTour(driverObj); }
      window.addEventListener(START_EVENT, onStartRequested);
      driverObj.__cleanup = () => window.removeEventListener(START_EVENT, onStartRequested);
    });

    return () => {
      cancelled = true;
      driverObj?.__cleanup?.();
      driverObj?.destroy?.();
    };
  }, [isChildCompany]);

  return null;
}
