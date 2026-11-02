import { ONBOARDING_TOUR_EN } from "./en";
import { ONBOARDING_TOUR_HI } from "./hi";
import { ONBOARDING_TOUR_PA } from "./pa";

// Same {code,label} shape/order as USER_GUIDE_LANGUAGES (src/lib/content/
// userGuide/index.js) on purpose — OnboardingTour.js shares that exact
// "gv:guide:lang" localStorage key, so one language choice drives both
// the User Guide and the tour.
export const ONBOARDING_TOUR_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
];

export const ONBOARDING_TOUR_SCENES = { en: ONBOARDING_TOUR_EN, hi: ONBOARDING_TOUR_HI, pa: ONBOARDING_TOUR_PA };
