import LegalPageLayout from "@/components/sections/legal/LegalPageLayout";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description: "The terms that govern use of Global Vista Educators' website and the KaizenBMS Platform.",
  path: "/terms-of-service",
});

const LAST_UPDATED = "August 31, 2026";

const SECTIONS = [
  {
    heading: "Acceptance of Terms",
    body: [
      "By using our website, our counselling services, or the KaizenBMS Platform, you agree to these Terms of Service. If you don't agree, please don't use them. If you're accepting these terms on behalf of a company (for a KaizenBMS subscription), you're confirming you have the authority to do so.",
    ],
  },
  {
    heading: "Description of Services",
    body: [
      "We provide two related things:",
      [
        "Global Vista Educators — career counselling, mentorship, exam preparation, and related educational guidance services.",
        "KaizenBMS Platform — a subscription, multi-tenant business-management (CRM/ERP) software product that companies use to manage their own leads, employees, documents, payments, and operations.",
      ],
    ],
  },
  {
    heading: "Eligibility & Account Registration",
    body: [
      "You must provide accurate information when registering, and you're responsible for keeping your login credentials confidential and for all activity under your account. Tell us immediately if you suspect unauthorized access.",
    ],
  },
  {
    heading: "Subscriptions, Billing & Cancellation",
    body: [
      "KaizenBMS is offered on paid subscription plans, some with a free trial period, billed through Razorpay or BillDesk (or the tenant company's own connected payment method). By subscribing, you authorize recurring charges for your selected plan and billing cycle until you cancel.",
      [
        "Plan prices, features, and limits are as shown at checkout / in your account and may change with reasonable notice.",
        "You can cancel anytime from your subscription settings; cancellation stops future billing but doesn't automatically refund amounts already charged, except where required by law or expressly stated otherwise at the time of purchase.",
        "Switching or upgrading plans does not delete your company's existing data.",
      ],
    ],
  },
  {
    heading: "Acceptable Use",
    body: [
      "You agree not to:",
      [
        "Use our services for anything unlawful, fraudulent, or harmful.",
        "Attempt to access another company's data on the KaizenBMS Platform, or another user's account without authorization.",
        "Reverse-engineer, scrape, or interfere with the normal operation of our website or the platform.",
        "Use the platform to send spam or unsolicited communications.",
      ],
    ],
  },
  {
    heading: "Your Data on the KaizenBMS Platform",
    body: [
      "As between you and us, a subscribing company owns the data it enters into KaizenBMS — its leads, employee records, documents, and communications. We act as the technology provider storing and processing that data on the company's behalf, and each company's data is isolated from every other company by design.",
      "A company remains responsible for having the right to collect and store the personal data (of its leads, employees, or customers) that it puts into the platform, and for using it lawfully.",
    ],
  },
  {
    heading: "Call Recording Feature",
    body: [
      "KaizenBMS includes an optional feature letting a company record calls its own employees place to its own leads, using a telephony provider (e.g., Exotel) that company connects and pays for directly — this is off by default and opt-in per company.",
      "A company that enables this feature is solely responsible for complying with all applicable laws regarding call recording and consent in its jurisdiction — including informing call participants that a call may be recorded, where required. We provide the technical capability; we do not monitor or control how a company uses it, and we are not responsible for a company's non-compliance with recording-consent laws.",
    ],
  },
  {
    heading: "Third-Party Services",
    body: [
      "Our services rely on third-party providers — including Razorpay and BillDesk (payments), Exotel (optional call recording, per company), Google Sheets (optional lead sync), and WhatsApp — each governed by their own terms and privacy policies. We aren't responsible for the availability or practices of these third-party services.",
    ],
  },
  {
    heading: "Intellectual Property",
    body: [
      "All content, branding, and software on our website and the KaizenBMS Platform — excluding data you or a tenant company enters — belongs to us or our licensors. You may not copy, modify, or redistribute it without permission.",
    ],
  },
  {
    heading: "Disclaimers",
    body: [
      "Our services are provided \"as is\" and \"as available.\" We don't guarantee that the website or platform will be uninterrupted or error-free. For counselling services, we provide guidance and support in good faith but don't guarantee any specific admission, career, or academic outcome.",
    ],
  },
  {
    heading: "Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, Global Vista Educators will not be liable for any indirect, incidental, or consequential damages arising from your use of our website, services, or the KaizenBMS Platform. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim arose.",
    ],
  },
  {
    heading: "Termination",
    body: [
      "We may suspend or terminate access to our services if these terms are violated, or for non-payment of a subscription. You may stop using our services, or cancel your KaizenBMS subscription, at any time.",
    ],
  },
  {
    heading: "Governing Law",
    body: [
      "These terms are governed by the laws of India, and any disputes will be subject to the exclusive jurisdiction of the competent courts in India.",
    ],
  },
  {
    heading: "Changes to These Terms",
    body: [
      "We may update these terms from time to time. The \"Last updated\" date above reflects the most recent revision — continued use after a change means you accept the updated terms.",
    ],
  },
  {
    heading: "Contact Us",
    body: [
      "Questions about these terms? Reach us at GlobalVistaEducators@gmail.com or +91 98145 61099.",
    ],
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      intro="These terms govern your use of the Global Vista Educators website, our counselling services, and the KaizenBMS Platform."
      sections={SECTIONS}
    />
  );
}
