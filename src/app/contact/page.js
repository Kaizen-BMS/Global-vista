import ContactHero from "@/components/sections/ContactHero";
import ContactSplit from "@/components/sections/ContactSplit";
import MapSection from "@/components/sections/MapSection";
import CTASection from "@/components/sections/CTASection";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Contact",
  description:
    "Get in touch with Global Vista Educators to book a free consultation and start your student's mentorship journey.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <ContactSplit />
      {/* <MapSection /> */}
      {/* <CTASection /> */}
    </>
  );
}