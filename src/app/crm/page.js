import GalaxyBackground from "@/components/common/GalaxyBackground";
import PlatformHeader from "@/components/sections/platform/PlatformHeader";
import PlatformHeroSection from "@/components/sections/platform/PlatformHeroSection";
import PlatformStatsSection from "@/components/sections/platform/PlatformStatsSection";
import PlatformFeaturesSection from "@/components/sections/platform/PlatformFeaturesSection";
import PlatformTestimonialsSection from "@/components/sections/platform/PlatformTestimonialsSection";
import PlatformPricingSection from "@/components/sections/platform/PlatformPricingSection";
import PlatformFAQSection from "@/components/sections/platform/PlatformFAQSection";
import PlatformCTASection from "@/components/sections/platform/PlatformCTASection";
import PlatformFooter from "@/components/sections/platform/PlatformFooter";

export const metadata = {
  title: "Global Vista Platform | CRM, HRMS & Analytics",
  description: "Sign in to your Global Vista workspace — the multi-tenant platform for CRM, HR, reporting, and automation.",
};

export default function PlatformLandingPage() {
  return (
    <div className="relative min-h-screen">
      <GalaxyBackground />
      <div className="relative z-10">
        <PlatformHeader />
        <PlatformHeroSection />
        <PlatformStatsSection />
        <PlatformFeaturesSection />
        <PlatformTestimonialsSection />
        <PlatformPricingSection />
        <PlatformFAQSection />
        <PlatformCTASection />
        <PlatformFooter />
      </div>
    </div>
  );
}
