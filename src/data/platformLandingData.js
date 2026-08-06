export const platformFeatures = [
  { id: "crm", icon: "Contact2", title: "CRM", description: "Full lead lifecycle — pipeline, follow-ups, tasks, notes, and a Kanban board that mirrors how your team actually sells." },
  { id: "hrms", icon: "Users", title: "HRMS", description: "Employees, roles, branches, departments, and documents in one place, scoped cleanly to every company on the platform." },
  { id: "admissions", icon: "GraduationCap", title: "Admissions", description: "Purpose-built for education and services businesses guiding people from first enquiry to enrollment." },
  { id: "reports", icon: "FileText", title: "Reports", description: "Exportable, print-ready reports across leads, users, tasks, and documents — Excel, CSV, or print to PDF." },
  { id: "analytics", icon: "BarChart3", title: "Analytics", description: "Live dashboards for pipeline health, source performance, and team conversion — never a stale snapshot." },
  { id: "automation", icon: "Workflow", title: "Automation", description: "Assignment history, duplicate detection, and stage-aware follow-up scheduling that keeps work moving itself." },
  { id: "notifications", icon: "Bell", title: "Notifications", description: "Real-time alerts for assignments, follow-ups, and status changes, with a full notification center to catch up." },
  { id: "ai", icon: "Sparkles", title: "AI", description: "Computed lead scoring today, with more predictive tooling on the roadmap as the platform grows." },
];

export const platformStats = [
  { id: "modules", value: 4, suffix: "+", label: "Core Modules" },
  { id: "tenants", value: 100, suffix: "%", label: "Tenant Isolated" },
  { id: "uptime", value: 99, suffix: "%", label: "Built for Uptime" },
  { id: "setup", value: 24, suffix: "hr", label: "Avg. Onboarding" },
];

export const platformTestimonials = [
  { id: 1, name: "Operations Lead", role: "Education Services Company", quote: "Every lead used to live in someone's inbox. Now the whole team works off one pipeline and nothing falls through." },
  { id: 2, name: "Counselling Manager", role: "Study Abroad Consultancy", quote: "The follow-up dashboard alone changed how our counsellors work — overdue and today's calls are just there, sorted, every morning." },
  { id: 3, name: "Company Admin", role: "Multi-Branch Services Firm", quote: "Branding it to look like our own product for our team was a five-minute settings change, not a support ticket." },
];

export const platformFaqs = [
  { id: 1, question: "Is this a multi-tenant platform?", answer: "Yes. Every company gets its own isolated workspace — data, users, roles, and branding are scoped per tenant and never cross over." },
  { id: 2, question: "Can we use our own branding?", answer: "Yes. Logo, favicon, and color scheme are configurable per company and apply across the sidebar, reports, and outgoing email." },
  { id: 3, question: "How is data isolated between companies?", answer: "Every tenant-scoped table is filtered by company on every query, enforced at the application layer alongside role-based permissions." },
  { id: 4, question: "What does pricing look like?", answer: "Pricing is tailored to team size and modules enabled. Reach out and we'll walk you through a plan that fits." },
];

export const platformPricingTiers = [
  { id: "starter", name: "Starter", tagline: "For small teams getting organized", highlight: false },
  { id: "growth", name: "Growth", tagline: "For teams scaling their pipeline", highlight: true },
  { id: "enterprise", name: "Enterprise", tagline: "For multi-branch, multi-team operations", highlight: false },
];
