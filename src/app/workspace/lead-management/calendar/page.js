import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getCalendarEvents } from "@/lib/modules/crm/actions/calendar";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadViewToggle from "@/components/crm/leads/LeadViewToggle";
import CrmCalendar from "@/components/crm/leads/CrmCalendar";

export default async function LeadCalendarPage({ searchParams }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp?.year, 10) || now.getFullYear();
  const month = parseInt(sp?.month, 10) || now.getMonth() + 1; // 1-12

  const rangeStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const rangeEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const fmt = (d) => d.toISOString().slice(0, 19).replace("T", " ");

  const events = await getCalendarEvents(session, { start: fmt(rangeStart), end: fmt(rangeEnd) });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Follow-up Calendar</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Follow-ups and tasks due this month, across leads you can see</p>
        </div>
        <LeadViewToggle active="calendar" />
      </div>
      <CrmCalendar year={year} month={month} events={events} />
    </div>
  );
}
