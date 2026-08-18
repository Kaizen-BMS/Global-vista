import ServicesHero from "@/components/sections/ServicesHero";
import ServicesGrid from "@/components/sections/ServicesGrid";
import BenefitsSection from "@/components/sections/BenefitsSection";
import LearningProcess from "@/components/sections/LearningProcess";
import WhyChooseUsSection from "@/components/sections/WhyChooseUsSection";
import CTASection from "@/components/sections/CTASection";
import { buildMetadata } from "@/lib/metadata";
// import WhyChooseUsSection from "@/components/sections/WhyChooseUsSection";

export const metadata = buildMetadata({
  title: "Services",
  description:
    "Explore STEM support, exam preparation, mentorship, career guidance and flexible learning from Global Vista Educators.",
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <ServicesHero />
      {/* <ServicesGrid /> */}
     
      {/* <LearningProcess /> */}
      
      <CTASection />
    </>
  );
}