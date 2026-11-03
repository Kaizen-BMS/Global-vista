import { USER_GUIDE_EN, USER_GUIDE_FOOTER_EN, GVE_GUIDE_EN } from "./en";
import { USER_GUIDE_HI, USER_GUIDE_FOOTER_HI, GVE_GUIDE_HI } from "./hi";
import { USER_GUIDE_PA, USER_GUIDE_FOOTER_PA, GVE_GUIDE_PA } from "./pa";

export const USER_GUIDE_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
];

export const USER_GUIDE_CONTENT = { en: USER_GUIDE_EN, hi: USER_GUIDE_HI, pa: USER_GUIDE_PA };
export const USER_GUIDE_FOOTER = { en: USER_GUIDE_FOOTER_EN, hi: USER_GUIDE_FOOTER_HI, pa: USER_GUIDE_FOOTER_PA };

// Global Vista Educators' own combined, cross-school guide — same
// languages/footer, different content (see GVE_GUIDE_EN in ./en).
export const GVE_GUIDE_CONTENT = { en: GVE_GUIDE_EN, hi: GVE_GUIDE_HI, pa: GVE_GUIDE_PA };
