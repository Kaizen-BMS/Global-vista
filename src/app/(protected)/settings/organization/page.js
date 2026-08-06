import { listOrgRecords } from "@/lib/actions/orgSettings";
import SettingsTabs from "@/components/crm/shared/SettingsTabs";
import ManagedListEditor from "@/components/crm/forms/ManagedListEditor";

export default async function OrganizationSettingsPage() {
  const [branches, departments, designations, employeeTypes] = await Promise.all([
    listOrgRecords("branches"),
    listOrgRecords("departments"),
    listOrgRecords("designations"),
    listOrgRecords("employee-types"),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Settings</h1>
      <SettingsTabs />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ManagedListEditor title="Branches" apiBase="/api/settings/org/branches" items={branches} />
        <ManagedListEditor title="Departments" apiBase="/api/settings/org/departments" items={departments} />
        <ManagedListEditor title="Designations" apiBase="/api/settings/org/designations" items={designations} />
        <ManagedListEditor title="Employee Types" apiBase="/api/settings/org/employee-types" items={employeeTypes} />
      </div>
    </div>
  );
}