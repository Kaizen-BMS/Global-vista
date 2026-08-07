import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getLeadForm } from "@/lib/modules/crm/actions/leadForms";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { id } = await ctx.params;
  const form = await getLeadForm(session, id);
  if (!form) return notFound();

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const publicUrl = `${appUrl}/forms/${form.slug}?src=qr`;

  if (format === "svg") {
    const svg = await QRCode.toString(publicUrl, { type: "svg", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
    return new Response(svg, {
      headers: { "Content-Type": "image/svg+xml", "Content-Disposition": `inline; filename="${form.slug}-qr.svg"` },
    });
  }

  const buffer = await QRCode.toBuffer(publicUrl, { type: "png", width: 512, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  return new Response(buffer, {
    headers: { "Content-Type": "image/png", "Content-Disposition": `inline; filename="${form.slug}-qr.png"` },
  });
});
