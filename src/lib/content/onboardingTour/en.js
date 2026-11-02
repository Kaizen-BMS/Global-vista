// Multi-page onboarding tour — scenes, in order. Each scene is either a
// navigation ({route, steps}) or stays on the current page (route omitted/
// matches where the previous scene left off). `element` must match a real
// `data-tour-target` attribute somewhere in the app; a step with no
// `element` is a plain centered popover. See OnboardingTour.js for how
// these are driven across real page navigations.
export const ONBOARDING_TOUR_EN = [
  {
    route: "/workspace/dashboard",
    steps: [
      { element: '[data-tour-target="/workspace/dashboard"]', popover: { title: "Dashboard", description: "This is your school's overview — new admissions, pending follow-ups, everything in one place." } },
      { element: '[data-tour-target="/workspace/lead-management"]', popover: { title: "Students", description: "Manage every student here — add new ones and track their stage from enquiry to admission." } },
      { element: '[data-tour-target="/workspace/followups"]', popover: { title: "Follow-ups", description: "Reminders for students and parents you need to contact again — nothing gets missed." } },
      { element: '[data-tour-target="/workspace/users"]', popover: { title: "Employees", description: "Add and manage your team — counsellors and staff." } },
      { element: '[data-tour-target="/workspace/roles"]', popover: { title: "Roles", description: "Control who can see and do what — set permissions here." } },
      { element: '[data-tour-target="/workspace/settings"]', popover: { title: "Settings", description: "Your school's settings, branding, and configuration live here." } },
      { element: '[data-tour-target="/workspace/messages"]', popover: { title: "Messages", description: "Chat with your own team — and now you can talk directly with Global Vista Educators too (the External tab)." } },
      { element: '[data-tour-target="/workspace/support"]', popover: { title: "Support & Feedback", description: "Got a problem or a suggestion? Send it from here." } },
      { element: '[data-tour-target="/workspace/notifications"]', popover: { title: "Notifications", description: "Important updates and alerts show up here first." } },
      { element: '[data-tour-target="/workspace/activity-logs"]', popover: { title: "Activity Logs", description: "A full record of who did what — whenever you need it." } },
      { element: '[data-tour-target="/workspace/guide"]', popover: { title: "User Guide", description: "Whenever you're stuck, come back here — this guide, and this tour, both live here." } },
    ],
  },
  {
    route: "/workspace/lead-management",
    steps: [
      { element: '[data-tour-target="students-add-btn"]', popover: { title: "Add a Student", description: "Click here to add a new student." } },
      { element: '[data-tour-target="students-stage-tabs"]', popover: { title: "Stage Tabs", description: "See how many students are at each stage — click a tab to filter by it." } },
      { element: '[data-tour-target="students-filters-btn"]', popover: { title: "Filters", description: "Narrow down the list — by who it's assigned to, tags, or dates." } },
      { popover: { title: "One more thing", description: "Click on any student's name to open their profile — that's where you'll find Notes, Follow-ups, and Calls for them." } },
    ],
  },
  {
    route: "/workspace/lead-management/new",
    steps: [
      { element: '[data-tour-target="student-form"]', popover: { title: "Student Details", description: "Fill in the student's details here — name, contact info, class, and more." } },
      { element: '[data-tour-target="student-form-submit"]', popover: { title: "Save", description: "Once everything's filled in, click here to add the student." } },
    ],
  },
  {
    route: "/workspace/followups",
    steps: [
      { element: '[data-tour-target="followups-heading"]', popover: { title: "Your Follow-up List", description: "Every reminder you need to act on shows up here, grouped by when it's due." } },
      { popover: { title: "Marking one done", description: "Once you have a follow-up, you'll see a \"Complete\" button right next to it — click it once you've made the call or sent the message." } },
    ],
  },
  {
    route: "/workspace/users",
    steps: [
      { element: '[data-tour-target="employees-add-btn"]', popover: { title: "Add an Employee", description: "Click here to create an account for a new staff member." } },
    ],
  },
  {
    route: "/workspace/roles",
    steps: [
      { element: '[data-tour-target="roles-create-btn"]', popover: { title: "Create a Role", description: "Click here to create a new role for your team." } },
      { popover: { title: "Permissions", description: "Every role has a \"Permissions\" link — click it to control exactly what that role can see and do." } },
    ],
  },
  {
    route: "/workspace/settings/organization",
    steps: [
      { element: '[data-tour-target="settings-tab-organization"]', popover: { title: "Organizational Setting", description: "Your school's name, logo, and basic details live here." } },
      { element: '[data-tour-target="settings-tab-support"]', popover: { title: "Support & Feedback", description: "Reach us from here too, right inside Settings." } },
    ],
  },
  {
    route: "/workspace/messages",
    steps: [
      { element: '[data-tour-target="messages-channel-tabs"]', popover: { title: "Internal & External", description: "\"Internal\" is for chatting with your own team. \"External\" is for talking directly with Global Vista Educators." } },
      { element: '[data-tour-target="messages-new-btn"]', popover: { title: "Start a Conversation", description: "Click here to message someone on your team." } },
    ],
  },
  {
    route: null,
    steps: [
      { popover: { title: "That's it! 🎉", description: "You're ready to explore on your own. Need help again? You'll find this tour inside User Guide, any time." } },
    ],
  },
];
