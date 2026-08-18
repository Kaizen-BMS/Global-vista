import { getSession } from "@/lib/auth";
import { ok, created, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listComplaints, createComplaint } from "@/lib/actions/complaints";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || null;
  const complaints = await listComplaints(session, { status });
  return ok({ complaints });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const formData = await request.formData();
  const subject = formData.get("subject");
  const description = formData.get("description");
  if (!subject || !description) return badRequest("Subject and description are required.");
  const file = formData.get("file");

  const id = await createComplaint(session, {
    subject,
    category: formData.get("category"),
    description,
    desiredResolution: formData.get("desiredResolution"),
    priority: formData.get("priority"),
    relatedLeadId: formData.get("relatedLeadId") || null,
    relatedEmployeeId: formData.get("relatedEmployeeId") || null,
    file: file && typeof file !== "string" ? file : null,
  }, session.id);
  return created({ id });
}));
