export const ONBOARDING_TOUR_HI = [
  {
    route: "/workspace/dashboard",
    steps: [
      { element: '[data-tour-target="/workspace/dashboard"]', popover: { title: "Dashboard", description: "यह आपके स्कूल का पूरा overview है — नए admissions, pending follow-ups, सब कुछ एक ही जगह।" } },
      { element: '[data-tour-target="/workspace/lead-management"]', popover: { title: "Students", description: "अपने सभी students यहाँ manage करें — नया छात्र जोड़ें और उनकी stage (enquiry से admission तक) track करें।" } },
      { element: '[data-tour-target="/workspace/followups"]', popover: { title: "Follow-ups", description: "जिन students और parents से दोबारा बात करनी है, उनके reminders यहाँ मिलेंगे — कुछ भी miss नहीं होगा।" } },
      { element: '[data-tour-target="/workspace/users"]', popover: { title: "Employees", description: "अपनी team — counsellors और staff — यहाँ से add और manage करें।" } },
      { element: '[data-tour-target="/workspace/roles"]', popover: { title: "Roles", description: "कौन क्या देख सकता है और क्या कर सकता है — permissions यहाँ set करें।" } },
      { element: '[data-tour-target="/workspace/settings"]', popover: { title: "Settings", description: "आपके स्कूल की settings, branding और configuration यहाँ मिलेगी।" } },
      { element: '[data-tour-target="/workspace/messages"]', popover: { title: "Messages", description: "अपनी team से बात करें — और अब Global Vista Educators से भी सीधे बात कर सकते हैं (External टैब में)।" } },
      { element: '[data-tour-target="/workspace/support"]', popover: { title: "Support & Feedback", description: "कोई दिक्कत हो या सुझाव देना हो, यहाँ से भेजें।" } },
      { element: '[data-tour-target="/workspace/notifications"]', popover: { title: "Notifications", description: "ज़रूरी updates और alerts सबसे पहले यहाँ मिलेंगे।" } },
      { element: '[data-tour-target="/workspace/activity-logs"]', popover: { title: "Activity Logs", description: "किसने क्या किया — इसका पूरा रिकॉर्ड यहाँ मिलेगा, जब भी ज़रूरत पड़े।" } },
      { element: '[data-tour-target="/workspace/guide"]', popover: { title: "User Guide", description: "जब भी confuse हों, यहाँ वापस आ जाएं — यह guide, और यह tour, दोनों यहीं मिलेंगे।" } },
    ],
  },
  {
    route: "/workspace/lead-management",
    steps: [
      { element: '[data-tour-target="students-add-btn"]', popover: { title: "छात्र जोड़ें", description: "नया छात्र जोड़ने के लिए यहाँ क्लिक करें।" } },
      { element: '[data-tour-target="students-stage-tabs"]', popover: { title: "Stage टैब्स", description: "देखें कितने students किस stage में हैं — किसी टैब पर क्लिक करके filter करें।" } },
      { element: '[data-tour-target="students-filters-btn"]', popover: { title: "Filters", description: "List को छोटा करें — किसे assign किया है, tag, या dates के हिसाब से।" } },
      { popover: { title: "एक और बात", description: "किसी भी छात्र के नाम पर क्लिक करके उसकी profile खोलें — वहीं पर आपको उनके Notes, Follow-ups और Calls मिलेंगे।" } },
    ],
  },
  {
    route: "/workspace/lead-management/new",
    steps: [
      { element: '[data-tour-target="student-form"]', popover: { title: "Student की जानकारी", description: "यहाँ छात्र की जानकारी भरें — नाम, contact, class, और बाकी details।" } },
      { element: '[data-tour-target="student-form-submit"]', popover: { title: "Save करें", description: "सब कुछ भरने के बाद, छात्र को जोड़ने के लिए यहाँ क्लिक करें।" } },
    ],
  },
  {
    route: "/workspace/followups",
    steps: [
      { element: '[data-tour-target="followups-heading"]', popover: { title: "आपकी Follow-up List", description: "जिन पर action लेना है वो सारे reminders यहाँ, due date के हिसाब से groups में दिखेंगे।" } },
      { popover: { title: "किसी एक को पूरा करना", description: "जब कोई follow-up होगा, तो उसके बगल में एक \"Complete\" बटन दिखेगा — call कर लेने या message भेज देने के बाद उस पर क्लिक करें।" } },
    ],
  },
  {
    route: "/workspace/users",
    steps: [
      { element: '[data-tour-target="employees-add-btn"]', popover: { title: "Employee जोड़ें", description: "नए staff member का account बनाने के लिए यहाँ क्लिक करें।" } },
    ],
  },
  {
    route: "/workspace/roles",
    steps: [
      { element: '[data-tour-target="roles-create-btn"]', popover: { title: "Role बनाएं", description: "अपनी team के लिए नया role बनाने के लिए यहाँ क्लिक करें।" } },
      { popover: { title: "Permissions", description: "हर role के साथ एक \"Permissions\" लिंक होता है — उस role को क्या दिखे और क्या करने दिया जाए, यह control करने के लिए उस पर क्लिक करें।" } },
    ],
  },
  {
    route: "/workspace/settings/organization",
    steps: [
      { element: '[data-tour-target="settings-tab-organization"]', popover: { title: "Organizational Setting", description: "आपके स्कूल का नाम, logo और बुनियादी जानकारी यहाँ मिलेगी।" } },
      { element: '[data-tour-target="settings-tab-support"]', popover: { title: "Support & Feedback", description: "यहाँ Settings के अंदर से भी हम तक पहुँच सकते हैं।" } },
    ],
  },
  {
    route: "/workspace/messages",
    steps: [
      { element: '[data-tour-target="messages-channel-tabs"]', popover: { title: "Internal और External", description: "\"Internal\" अपनी team से बात करने के लिए है। \"External\" Global Vista Educators से सीधे बात करने के लिए है।" } },
      { element: '[data-tour-target="messages-new-btn"]', popover: { title: "बातचीत शुरू करें", description: "अपनी team के किसी सदस्य को message करने के लिए यहाँ क्लिक करें।" } },
    ],
  },
  {
    route: null,
    steps: [
      { popover: { title: "बस इतना ही! 🎉", description: "अब आप खुद explore करना शुरू कर सकते हैं। फिर से मदद चाहिए हो, तो यह tour User Guide के अंदर कभी भी मिल जाएगा।" } },
    ],
  },
];
