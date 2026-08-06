// Client-safe. No server imports.
export const CANONICAL_FIELDS = [
  { key: "name", label: "Full Name", required: true, synonyms: ["name", "fullname", "full name", "employee name"] },
  { key: "email", label: "Email", required: true, synonyms: ["email", "email address", "e-mail"] },
  { key: "phone", label: "Phone", required: false, synonyms: ["phone", "mobile", "contact", "phone number"] },
  { key: "employeeId", label: "Employee ID", required: false, synonyms: ["employee id", "emp id", "employeeid", "empid"] },
  { key: "roleName", label: "Role", required: true, synonyms: ["role", "role name", "designation role"] },
  { key: "departmentName", label: "Department", required: false, synonyms: ["department", "dept"] },
  { key: "designationName", label: "Designation", required: false, synonyms: ["designation", "title", "job title"] },
  { key: "branchName", label: "Branch", required: false, synonyms: ["branch", "branch name", "location"] },
  { key: "employeeTypeName", label: "Employee Type", required: false, synonyms: ["employee type", "employment type", "type"] },
  { key: "joiningDate", label: "Joining Date", required: false, synonyms: ["joining date", "date of joining", "doj"] },
];

export function autoDetectMapping(headers) {
  const mapping = {};
  headers.forEach((header, index) => {
    const normalized = header.trim().toLowerCase();
    const match = CANONICAL_FIELDS.find((f) => f.synonyms.includes(normalized));
    if (match) mapping[index] = match.key;
  });
  return mapping;
}

export const SAMPLE_TEMPLATE_CSV = `Full Name,Email,Phone,Employee ID,Role,Department,Designation,Branch,Employee Type,Joining Date
Jane Doe,jane.doe@example.com,9876543210,GVE-EMP-00099,Study Counsellor,Counselling,Senior Counsellor,Main Branch,Full Time,2026-01-15
`;