export const USER_GUIDE_EN = [
  {
    id: "everyone",
    title: "Everyday Use — For Everyone",
    sections: [
      {
        id: "welcome",
        title: "Welcome to Your School's Student Portal",
        body: [
          "This system helps you manage every student who's shown interest in your school — from first contact (Group Workshop 1) all the way through to final counselling (1-to-1 Session).",
          "Everything you need lives under \"Students\" in the left-hand menu.",
          "This guide explains how each part works. Use the language buttons above to read it in English, Hindi, or Punjabi.",
        ],
      },
      {
        id: "add-student",
        title: "Adding a New Student",
        body: [
          "Go to Students → click \"Add Student\".",
          "Fill in the student's name, mobile number, parent's name and mobile number, date of birth, class, stream, and subjects.",
          "Country and State are already filled in for you (India, Punjab) — you can change State if needed.",
          "Pick the District and School, and the Academic Year.",
          "A Student ID is created automatically once you save — you don't need to type one.",
          "Lead Source and Service are already set to \"Project UDAAN\" and \"Career Counselling\" — leave them as they are unless told otherwise.",
        ],
      },
      {
        id: "stage-tabs",
        title: "Understanding the Stage Tabs",
        body: [
          "At the top of the Students list, you'll see tabs: All Students, Group Workshop 1, Micro Group Session, Group Workshop 2, 1 to 1 Session, and more.",
          "Each tab shows how many students are currently at that stage — click a tab to see only those students.",
          "Click \"+ Add Stage\" if your school needs an extra stage that isn't listed yet.",
        ],
      },
      {
        id: "mark-complete",
        title: "Marking a Stage Complete & Moving Forward",
        body: [
          "When a student finishes a stage (e.g. attends Group Workshop 1), find them in the list and click \"Mark Complete\".",
          "Once marked complete, a new button appears: \"Move to [next stage]\". Click it when you're ready to move them forward.",
          "This keeps a clear two-step record: first you confirm they finished, then you decide when to advance them — nothing moves automatically.",
        ],
      },
      {
        id: "notes-followups",
        title: "Notes & Follow-ups",
        body: [
          "Click the \"Notes\" button on any student's row to see their notes and add a new one — no need to open their full profile.",
          "To schedule a call or reminder, open the student's full profile and use the Follow-ups section.",
        ],
      },
      {
        id: "search",
        title: "Searching for a Student",
        body: [
          "Use the search box above the list — you can search by the student's name, phone number, registration number, or parent's name.",
          "Filters for Priority, Source, and Service have been removed since schools don't need them — the search box and stage tabs are usually enough.",
        ],
      },
      {
        id: "history",
        title: "Viewing a Student's Full History",
        body: [
          "Click on a student's name to open their full profile.",
          "The \"Stage History\" section shows every stage change with the date and who made it — useful for checking progress or settling any confusion.",
        ],
      },
      {
        id: "notifications",
        title: "Notifications",
        body: [
          "The bell icon shows updates about your students.",
          "Click \"Preferences\" to turn off types of notifications you don't want to see.",
        ],
      },
    ],
  },
  {
    id: "oversight",
    title: "Oversight & Management — For Chair & Principal",
    sections: [
      {
        id: "bulk-actions",
        title: "Bulk Actions for Multiple Students",
        body: [
          "Tick the checkbox next to several students in the list to select them together.",
          "Use \"Mark Complete\" or \"Move to Next Stage\" to update all of them at once.",
          "Use \"Bulk Edit\" to open a table where you can set a different note, follow-up, stream, or stage for each selected student in one go, then save all of them together.",
        ],
      },
      {
        id: "excel",
        title: "Importing & Exporting in Excel",
        body: [
          "Click \"Excel\" in the header to download your students as a spreadsheet — it's colour-coded by school and locked so important details can't be changed by mistake.",
          "You can fill in the Note, Follow-up, Stage, Stream and a few other columns in the file.",
          "Upload that same file back under \"Import\" — the system will recognise each student by their ID and apply exactly the changes you made, without creating duplicates.",
        ],
      },
      {
        id: "team-roles",
        title: "Managing Your Team & Roles",
        body: [
          "Go to Employees → Add Employee to create an account for a new staff member.",
          "Choose their role: Principal, Career Counselling Chair, or one of the four subject Career Counsellors (Arts, Commerce, Non-Medical, Medical) — each comes with sensible access already set up.",
          "You can fine-tune exactly what each role can do from Roles in the left-hand menu.",
          "As Chair, you're expected to review how counsellors are progressing students across every stage, and use Bulk Edit or Excel Import when updating many students at once.",
        ],
      },
      {
        id: "branding-settings",
        title: "Branding & Settings",
        body: [
          "Your school's main logo can still be changed from Settings → Organizational Setting.",
          "The favicon, sidebar logo, and a few other branding elements are locked to Global Vista Educators' own branding and can't be changed — this keeps every school looking consistent.",
          "Settings for billing, calling, email, and other sales-CRM features have been hidden since schools don't need them.",
        ],
      },
    ],
  },
];

export const USER_GUIDE_FOOTER_EN = "Need more help? Use Support & Feedback in the left-hand menu to reach us.";

/** Global Vista Educators' OWN guide — the combined, cross-school view,
 * not a school's day-to-day student workflow (that's USER_GUIDE_EN
 * above, unchanged). One group is enough; GVE's whole team sees the
 * same things. */
export const GVE_GUIDE_EN = [
  {
    id: "everyday",
    title: "Everyday Use — For the Global Vista Educators Team",
    sections: [
      {
        id: "welcome",
        title: "Welcome to the Global Vista Educators Workspace",
        body: [
          "This is where you oversee every school in the Global Vista Educators network — their students, their activity, and your own direct conversations with them, all in one place.",
          "A specific school's own day-to-day work still happens inside that school's own workspace — this one is the combined, bird's-eye view across all of them.",
          "Use the language buttons above to read this guide in English, Hindi, or Punjabi.",
        ],
      },
      {
        id: "dashboard",
        title: "Your Dashboard",
        body: [
          "Total Schools, Total Leads, Unassigned, and Today's Follow-ups are combined across every school — not just your own.",
          "The Charts section (collapsed by default — click to expand) shows Leads by School, by Source, and by Stage, all combined.",
          "Recent Leads and Recent Activity are collapsed by default for the same reason — click to open whichever one you need.",
        ],
      },
      {
        id: "leads",
        title: "Leads — Every School, Combined",
        body: [
          "The Leads page lists every school's leads together, plus anything that came to Global Vista Educators directly — labeled \"Direct Lead\" instead of a school's name.",
          "Use the School dropdown next to Search to narrow the list down to one school, or to \"Direct Leads\" only.",
          "Click any lead to open its real profile — you'll see Notes, Follow-ups, and everything else exactly as that school would, and you can add to it. You never have to manually \"switch\" into the school yourself; it happens automatically, and you're brought straight back here the moment you're done.",
          "A lead that came to Global Vista Educators directly (not through any school) is added the exact same way as any other lead, from the \"Add Lead\" button on this same page.",
        ],
      },
      {
        id: "messages",
        title: "Messages — Internal & External",
        body: [
          "\"Internal\" is for chatting with your own Global Vista Educators team.",
          "\"External\" is for messaging a school directly — pick one or more schools and write one message; each school gets its own private reply, never a shared conversation.",
          "A school's Principal can also message you first — their message shows up in your own External tab.",
        ],
      },
      {
        id: "schools",
        title: "Managing Your Schools",
        body: [
          "Settings → Schools lists every school in your network, with its own lead and employee counts.",
          "From there you can switch into a specific school's own workspace to manage it directly, or create a new school if you're allowed to.",
        ],
      },
    ],
  },
];
