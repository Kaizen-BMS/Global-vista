export const ONBOARDING_TOUR_PA = [
  {
    route: "/workspace/dashboard",
    steps: [
      { element: '[data-tour-target="/workspace/dashboard"]', popover: { title: "Dashboard", description: "ਇਹ ਤੁਹਾਡੇ ਸਕੂਲ ਦਾ ਪੂਰਾ overview ਹੈ — ਨਵੇਂ admissions, pending follow-ups, ਸਭ ਕੁਝ ਇੱਕੋ ਥਾਂ 'ਤੇ।" } },
      { element: '[data-tour-target="/workspace/lead-management"]', popover: { title: "Students", description: "ਆਪਣੇ ਸਾਰੇ students ਇੱਥੇ manage ਕਰੋ — ਨਵਾਂ ਵਿਦਿਆਰਥੀ ਜੋੜੋ ਅਤੇ ਉਹਨਾਂ ਦੀ stage (enquiry ਤੋਂ admission ਤੱਕ) track ਕਰੋ।" } },
      { element: '[data-tour-target="/workspace/followups"]', popover: { title: "Follow-ups", description: "ਜਿਹਨਾਂ students ਤੇ parents ਨਾਲ ਦੁਬਾਰਾ ਗੱਲ ਕਰਨੀ ਹੈ, ਉਹਨਾਂ ਦੇ reminders ਇੱਥੇ ਮਿਲਣਗੇ — ਕੁਝ ਵੀ miss ਨਹੀਂ ਹੋਵੇਗਾ।" } },
      { element: '[data-tour-target="/workspace/users"]', popover: { title: "Employees", description: "ਆਪਣੀ team — counsellors ਤੇ staff — ਇੱਥੋਂ add ਤੇ manage ਕਰੋ।" } },
      { element: '[data-tour-target="/workspace/roles"]', popover: { title: "Roles", description: "ਕੌਣ ਕੀ ਵੇਖ ਸਕਦਾ ਹੈ ਤੇ ਕੀ ਕਰ ਸਕਦਾ ਹੈ — permissions ਇੱਥੇ set ਕਰੋ।" } },
      { element: '[data-tour-target="/workspace/settings"]', popover: { title: "Settings", description: "ਤੁਹਾਡੇ ਸਕੂਲ ਦੀਆਂ settings, branding ਤੇ configuration ਇੱਥੇ ਮਿਲਣਗੀਆਂ।" } },
      { element: '[data-tour-target="/workspace/messages"]', popover: { title: "Messages", description: "ਆਪਣੀ team ਨਾਲ ਗੱਲ ਕਰੋ — ਤੇ ਹੁਣ Global Vista Educators ਨਾਲ ਵੀ ਸਿੱਧੀ ਗੱਲ ਕਰ ਸਕਦੇ ਹੋ (External ਟੈਬ ਵਿੱਚ)।" } },
      { element: '[data-tour-target="/workspace/support"]', popover: { title: "Support & Feedback", description: "ਕੋਈ ਦਿੱਕਤ ਹੋਵੇ ਜਾਂ ਸੁਝਾਅ ਦੇਣਾ ਹੋਵੇ, ਇੱਥੋਂ ਭੇਜੋ।" } },
      { element: '[data-tour-target="/workspace/notifications"]', popover: { title: "Notifications", description: "ਜ਼ਰੂਰੀ updates ਤੇ alerts ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਇੱਥੇ ਮਿਲਣਗੇ।" } },
      { element: '[data-tour-target="/workspace/activity-logs"]', popover: { title: "Activity Logs", description: "ਕਿਸਨੇ ਕੀ ਕੀਤਾ — ਇਸਦਾ ਪੂਰਾ ਰਿਕਾਰਡ ਇੱਥੇ ਮਿਲੇਗਾ, ਜਦੋਂ ਵੀ ਲੋੜ ਪਵੇ।" } },
      { element: '[data-tour-target="/workspace/guide"]', popover: { title: "User Guide", description: "ਜਦੋਂ ਵੀ confuse ਹੋਵੋ, ਇੱਥੇ ਵਾਪਸ ਆ ਜਾਓ — ਇਹ guide, ਤੇ ਇਹ tour, ਦੋਵੇਂ ਇੱਥੇ ਹੀ ਮਿਲਣਗੇ।" } },
    ],
  },
  {
    route: "/workspace/lead-management",
    steps: [
      { element: '[data-tour-target="students-add-btn"]', popover: { title: "ਵਿਦਿਆਰਥੀ ਜੋੜੋ", description: "ਨਵਾਂ ਵਿਦਿਆਰਥੀ ਜੋੜਨ ਲਈ ਇੱਥੇ ਕਲਿੱਕ ਕਰੋ।" } },
      { element: '[data-tour-target="students-stage-tabs"]', popover: { title: "Stage ਟੈਬਸ", description: "ਵੇਖੋ ਕਿੰਨੇ students ਕਿਸ stage ਵਿੱਚ ਹਨ — ਕਿਸੇ ਟੈਬ 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ filter ਕਰੋ।" } },
      { element: '[data-tour-target="students-filters-btn"]', popover: { title: "Filters", description: "List ਨੂੰ ਛੋਟਾ ਕਰੋ — ਕਿਸਨੂੰ assign ਕੀਤਾ ਹੈ, tag, ਜਾਂ dates ਦੇ ਹਿਸਾਬ ਨਾਲ।" } },
      { popover: { title: "ਇੱਕ ਹੋਰ ਗੱਲ", description: "ਕਿਸੇ ਵੀ ਵਿਦਿਆਰਥੀ ਦੇ ਨਾਮ 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਉਸਦੀ profile ਖੋਲ੍ਹੋ — ਉੱਥੇ ਹੀ ਤੁਹਾਨੂੰ ਉਹਨਾਂ ਦੇ Notes, Follow-ups ਤੇ Calls ਮਿਲਣਗੇ।" } },
    ],
  },
  {
    route: "/workspace/lead-management/new",
    steps: [
      { element: '[data-tour-target="student-form"]', popover: { title: "Student ਦੀ ਜਾਣਕਾਰੀ", description: "ਇੱਥੇ ਵਿਦਿਆਰਥੀ ਦੀ ਜਾਣਕਾਰੀ ਭਰੋ — ਨਾਮ, contact, class, ਤੇ ਹੋਰ details।" } },
      { element: '[data-tour-target="student-form-submit"]', popover: { title: "Save ਕਰੋ", description: "ਸਭ ਕੁਝ ਭਰਨ ਤੋਂ ਬਾਅਦ, ਵਿਦਿਆਰਥੀ ਨੂੰ ਜੋੜਨ ਲਈ ਇੱਥੇ ਕਲਿੱਕ ਕਰੋ।" } },
    ],
  },
  {
    route: "/workspace/followups",
    steps: [
      { element: '[data-tour-target="followups-heading"]', popover: { title: "ਤੁਹਾਡੀ Follow-up List", description: "ਜਿਹਨਾਂ 'ਤੇ action ਲੈਣਾ ਹੈ, ਉਹ ਸਾਰੇ reminders ਇੱਥੇ, due date ਮੁਤਾਬਕ groups ਵਿੱਚ ਦਿਖਣਗੇ।" } },
      { popover: { title: "ਇੱਕ ਨੂੰ ਪੂਰਾ ਕਰਨਾ", description: "ਜਦੋਂ ਕੋਈ follow-up ਹੋਵੇਗਾ, ਤਾਂ ਉਸਦੇ ਨਾਲ ਇੱਕ \"Complete\" ਬਟਨ ਦਿਖੇਗਾ — call ਕਰ ਲੈਣ ਜਾਂ message ਭੇਜ ਦੇਣ ਤੋਂ ਬਾਅਦ ਉਸ 'ਤੇ ਕਲਿੱਕ ਕਰੋ।" } },
    ],
  },
  {
    route: "/workspace/users",
    steps: [
      { element: '[data-tour-target="employees-add-btn"]', popover: { title: "Employee ਜੋੜੋ", description: "ਨਵੇਂ staff member ਦਾ account ਬਣਾਉਣ ਲਈ ਇੱਥੇ ਕਲਿੱਕ ਕਰੋ।" } },
    ],
  },
  {
    route: "/workspace/roles",
    steps: [
      { element: '[data-tour-target="roles-create-btn"]', popover: { title: "Role ਬਣਾਓ", description: "ਆਪਣੀ team ਲਈ ਨਵਾਂ role ਬਣਾਉਣ ਲਈ ਇੱਥੇ ਕਲਿੱਕ ਕਰੋ।" } },
      { popover: { title: "Permissions", description: "ਹਰ role ਨਾਲ ਇੱਕ \"Permissions\" ਲਿੰਕ ਹੁੰਦਾ ਹੈ — ਉਸ role ਨੂੰ ਕੀ ਦਿਖੇ ਤੇ ਕੀ ਕਰਨ ਦਿੱਤਾ ਜਾਵੇ, ਇਹ control ਕਰਨ ਲਈ ਉਸ 'ਤੇ ਕਲਿੱਕ ਕਰੋ।" } },
    ],
  },
  {
    route: "/workspace/settings/organization",
    steps: [
      { element: '[data-tour-target="settings-tab-organization"]', popover: { title: "Organizational Setting", description: "ਤੁਹਾਡੇ ਸਕੂਲ ਦਾ ਨਾਮ, logo ਤੇ ਬੁਨਿਆਦੀ ਜਾਣਕਾਰੀ ਇੱਥੇ ਮਿਲੇਗੀ।" } },
      { element: '[data-tour-target="settings-tab-support"]', popover: { title: "Support & Feedback", description: "ਇੱਥੇ Settings ਦੇ ਅੰਦਰੋਂ ਵੀ ਸਾਡੇ ਤੱਕ ਪਹੁੰਚ ਸਕਦੇ ਹੋ।" } },
    ],
  },
  {
    route: "/workspace/messages",
    steps: [
      { element: '[data-tour-target="messages-channel-tabs"]', popover: { title: "Internal ਤੇ External", description: "\"Internal\" ਆਪਣੀ team ਨਾਲ ਗੱਲ ਕਰਨ ਲਈ ਹੈ। \"External\" Global Vista Educators ਨਾਲ ਸਿੱਧੀ ਗੱਲ ਕਰਨ ਲਈ ਹੈ।" } },
      { element: '[data-tour-target="messages-new-btn"]', popover: { title: "ਗੱਲਬਾਤ ਸ਼ੁਰੂ ਕਰੋ", description: "ਆਪਣੀ team ਦੇ ਕਿਸੇ ਮੈਂਬਰ ਨੂੰ message ਕਰਨ ਲਈ ਇੱਥੇ ਕਲਿੱਕ ਕਰੋ।" } },
    ],
  },
  {
    route: null,
    steps: [
      { popover: { title: "ਬਸ ਇਹੀ ਹੈ! 🎉", description: "ਹੁਣ ਤੁਸੀਂ ਖੁਦ explore ਕਰਨਾ ਸ਼ੁਰੂ ਕਰ ਸਕਦੇ ਹੋ। ਮੁੜ ਮਦਦ ਚਾਹੀਦੀ ਹੋਵੇ, ਤਾਂ ਇਹ tour User Guide ਦੇ ਅੰਦਰ ਕਦੇ ਵੀ ਮਿਲ ਜਾਵੇਗਾ।" } },
    ],
  },
];
