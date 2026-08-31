import { getSession } from "@/lib/auth";
import { assertSuperAdmin } from "@/lib/helpers/permissions";
import { getSettingsByGroup } from "@/lib/actions/settings";
import SettingsTabs from "@/components/shared/SettingsTabs";
import SettingsForm from "@/components/forms/SettingsForm";
import UpiQrPreview from "@/components/crm/settings/UpiQrPreview";

export default async function PaymentSettingsPage() {
  const session = await getSession();
  assertSuperAdmin(session);
  const values = await getSettingsByGroup(session, "payments");

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1 whitespace-nowrap">Payment Integration</h1>
      <SettingsTabs />
      <p className="text-muted-foreground text-sm mb-6 max-w-xl">
        Configure how your team collects payment. This is your company&apos;s own UPI details — no other company can see or use it.
        Payments recorded against this method are confirmed manually by your team, not verified automatically.
      </p>
      <SettingsForm
        group="payments"
        initialValues={values}
        fields={[
          { key: "upi_id", label: "UPI ID", hint: "e.g. yourcompany@upi — shown to employees collecting payment." },
          { key: "upi_display_name", label: "Display Name", hint: "The name customers will see alongside the UPI ID." },
          {
            key: "upi_qr_mode", label: "QR Amount", type: "select",
            options: [
              { value: "negotiable", label: "Negotiable — customer enters the amount (like a shop or petrol pump QR stand)" },
              { value: "fixed", label: "Fixed amount — every scan asks for the same amount" },
            ],
            hint: "Negotiable is the usual choice for a counter/stand QR. Use Fixed only when every sale is the same price.",
          },
          { key: "upi_fixed_amount", label: "Fixed Amount (₹)", type: "number", hint: "Only used when QR Amount above is set to Fixed." },
          { key: "upi_qr_url", label: "Custom QR Image (optional)", type: "image", uploadUrl: "/api/core/company-branding/upload", category: "upi_qr", hint: "Optional — if you'd rather use your own branded QR image from your UPI app instead of the live one generated below." },
          { key: "upi_instructions", label: "Payment Instructions", type: "textarea", rows: 4, hint: "Shown to employees when collecting a UPI payment — e.g. \"Ask the customer to add the payment reference / lead number in the UPI note.\"" },
        ]}
      />
      <UpiQrPreview hasUpiId={!!values.upi_id} />
    </div>
  );
}
