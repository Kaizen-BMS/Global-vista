import AboutHero from "@/components/sections/AboutHero";
import MissionVision from "@/components/sections/MissionVision";
import CoreValues from "@/components/sections/CoreValues";
import EducatorsGrid from "@/components/sections/EducatorsGrid";
import CTASection from "@/components/sections/CTASection";
import { buildMetadata } from "@/lib/metadata";
import GlobalPartnershipSection from "@/components/sections/GlobalPartnershipSection";

export const metadata = buildMetadata({
  title: "About Us",
  description:
    "Connecting students with UK educators for mentorship, exam preparation and global academic opportunity. +91 98145 61099",
  path: "/about",
});
export default function AboutPage() {
  return (
    <>
      <AboutHero />
      {/* <MissionVision /> */}
      <CoreValues />
      <GlobalPartnershipSection/>
      {/* <EducatorsGrid />  */}
      <CTASection />
    </>
  );
}
