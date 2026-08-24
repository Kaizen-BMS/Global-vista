/**
 * Editorial/cinematic palette shared by every public KaizenBMS Platform
 * marketing page (homepage, blog listing, blog post) — deliberately
 * separate from the workspace app's own semantic-token system (that one is
 * tuned for a dense CRM UI; these pages want a restrained, warm-neutral
 * editorial look). Toggled by the exact same `.dark` class every other
 * theme-aware surface in this app uses (see ThemeProvider) — no second
 * theme system, just different values expressed as Tailwind `dark:`
 * variants throughout.
 */
export const PAGE_BG = "bg-[#FAFAF7] dark:bg-[#07080B]";
export const TEXT_PRIMARY = "text-[#0B0E14] dark:text-[#F4F3EF]";
export const TEXT_SECONDARY = "text-[#5B6270] dark:text-[#8B90A0]";
export const TEXT_FAINT = "text-[#9297A3] dark:text-[#5B6270]";
export const BORDER = "border-[#E4E3DE] dark:border-white/10";
export const BORDER_SOFT = "border-[#ECEBE6] dark:border-white/[0.06]";
export const ACCENT = "text-indigo-600 dark:text-indigo-400";
