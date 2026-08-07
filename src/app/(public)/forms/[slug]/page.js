import { notFound } from "next/navigation";
import { getPublicLeadForm, getPublicFormBranding } from "@/lib/modules/crm/actions/publicLeadForms";
import PublicLeadFormRenderer from "@/components/public/PublicLeadFormRenderer";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const form = await getPublicLeadForm(slug);
  return { title: form ? form.name : "Form not found" };
}

export default async function PublicLeadFormPage({ params }) {
  const { slug } = await params;
  const form = await getPublicLeadForm(slug);
  if (!form) return notFound();
  const branding = await getPublicFormBranding(form.company_id);

  return <PublicLeadFormRenderer form={form} branding={branding} />;
}
