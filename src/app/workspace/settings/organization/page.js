import { getSession } from "@/lib/auth";
import { listOrgRecords } from "@/lib/actions/orgSettings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import ManagedListEditor from "@/components/forms/ManagedListEditor";

export default async function OrganizationPage() {
  const session = await getSession();
  const [branches, departments, designations, employeeTypes] = await Promise.all([
    listOrgRecords(session, "branches"), listOrgRecords(session, "departments"), listOrgRecords(session, "designations"), listOrgRecords(session, "employee-types"),
  ]);
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1><SettingsTabs />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ManagedListEditor title="Branches" apiBase="/api/core/organization/branches" items={branches} />
        <ManagedListEditor title="Departments" apiBase="/api/core/organization/departments" items={departments} />
        <ManagedListEditor title="Designations" apiBase="/api/core/organization/designations" items={designations} />
        <ManagedListEditor title="Employee Types" apiBase="/api/core/organization/employee-types" items={employeeTypes} />
      </div>
    </div>
  );
}