import LegalPageLayout from "@/components/sections/legal/LegalPageLayout";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Global Vista Educators and the KaizenBMS Platform collect, use, and protect your information.",
  path: "/privacy-policy",
});

const LAST_UPDATED = "August 31, 2026";

const SECTIONS = [
  {
    heading: "Who We Are",
    body: [
      "This Privacy Policy explains how Global Vista Educators (\"we\", \"us\", \"our\") collects, uses, and protects information across two related things we operate: our education counselling website (globalvistaeducators.com) and the KaizenBMS Platform — a subscription business-management (CRM/ERP) software product used by companies (\"tenant companies\") to run their own leads, employees, and operations.",
      "If you're a visitor or student/parent using our counselling services, this policy covers you directly. If you're an employee of a company that subscribes to KaizenBMS, your employer (the tenant company) is the one who decides what data goes into the platform and who can see it — we act as the technology provider processing that data on their behalf, as described below.",
    ],
  },
  {
    heading: "Information We Collect",
    body: [
      "Information you give us directly:",
      [
        "Contact details submitted through our forms, WhatsApp, phone, or email — name, phone number, email address, and the details of your enquiry.",
        "For KaizenBMS Platform accounts: your name, email, phone number, role, and any employee/company records your employer's admin adds on your behalf.",
        "Company and billing details when a business registers for a KaizenBMS subscription.",
      ],
      "Information collected automatically:",
      [
        "Standard technical data — IP address, browser and device type, pages visited, and time spent — collected via cookies and analytics tools (Google Analytics, Meta Pixel) to understand how our site is used.",
        "Basic usage activity within the KaizenBMS Platform (logins, feature usage) for security and product-improvement purposes.",
      ],
      "Payment information: payments are processed directly by our payment partners (Razorpay, BillDesk, or a company's own UPI details) — we do not receive or store your full card, UPI PIN, or bank credentials.",
      "Call recordings: KaizenBMS includes an optional feature that lets a subscribing company record calls its own employees place to its own leads, for that company's internal verification purposes. This is entirely opt-in per company, uses that company's own connected telephony account, and recordings are only accessible to that company — never to us or to any other tenant.",
    ],
  },
  {
    heading: "How We Use Your Information",
    body: [
      [
        "To respond to enquiries and provide the counselling services you've asked about.",
        "To create and manage KaizenBMS Platform accounts and subscriptions.",
        "To process payments and send related receipts/confirmations.",
        "To send service updates, reminders, and — where you've agreed — marketing communications.",
        "To maintain security, prevent fraud/abuse, and improve our website and product over time.",
        "To meet legal, tax, and accounting obligations.",
      ],
    ],
  },
  {
    heading: "How We Share Information",
    body: [
      "We don't sell your personal information. We share it only with:",
      [
        "Service providers who help us run the business — payment gateways (Razorpay, BillDesk), our hosting provider, email/SMS/WhatsApp delivery services, and (only for companies who've connected it) their own telephony provider for the call recording feature.",
        "Law enforcement or regulators, only where required by law.",
        "A successor entity, in the event of a merger, acquisition, or sale of business assets — with the same protections carried forward.",
      ],
      "Within the KaizenBMS Platform, each tenant company's data is isolated from every other company by design — no company can see another company's leads, employees, or records.",
    ],
  },
  {
    heading: "Cookies & Tracking Technologies",
    body: [
      "We use cookies and similar technologies (including Google Analytics and Meta Pixel) to keep you signed in, remember preferences, and understand site usage. You can disable cookies in your browser settings, though some site features may not work as intended without them.",
    ],
  },
  {
    heading: "Data Security",
    body: [
      "We use reasonable technical and organizational measures — access controls, role-based permissions, and encrypted connections — to protect your information. No method of transmission or storage is completely secure, so we can't guarantee absolute security, but we work to keep it appropriately protected.",
    ],
  },
  {
    heading: "Data Retention",
    body: [
      "We keep personal information only as long as needed for the purposes described here — for example, for as long as your enquiry/account is active, plus a reasonable period afterward for legal, accounting, or dispute-resolution purposes. A tenant company controls the retention of its own KaizenBMS data (leads, documents, call recordings) and can request deletion through their account.",
    ],
  },
  {
    heading: "Your Rights & Choices",
    body: [
      "Depending on where you're located, you may have the right to access, correct, or request deletion of your personal information, or to opt out of marketing communications. To exercise any of these, contact us using the details below — we'll respond within a reasonable time.",
    ],
  },
  {
    heading: "Children's Privacy",
    body: [
      "Our counselling services may involve information about students who are minors, which we expect to be provided and consented to by a parent or guardian. We don't knowingly collect personal information directly from children without appropriate consent.",
    ],
  },
  {
    heading: "International Users",
    body: [
      "Our services are hosted in India. If you access our website or the KaizenBMS Platform from outside India, your information will be processed and stored in India, subject to this policy.",
    ],
  },
  {
    heading: "Changes to This Policy",
    body: [
      "We may update this policy from time to time. The \"Last updated\" date at the top reflects the most recent revision — continued use of our website or the KaizenBMS Platform after a change means you accept the updated policy.",
    ],
  },
  {
    heading: "Contact Us",
    body: [
      "Questions about this policy or your data? Reach us at GlobalVistaEducators@gmail.com or +91 98145 61099.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="This page explains, in plain language, what information we collect across our website and the KaizenBMS Platform, why we collect it, and the choices you have."
      sections={SECTIONS}
    />
  );
}
