import { getPlatformSettingsByGroup } from "@/lib/platform/actions/settings";
import { getPayPalStatus } from "@/lib/payments/providers";
import PlatformSettingsForm from "@/components/platform/PlatformSettingsForm";

export default async function PlatformSettingsPage() {
  const [values, brandingValues, paymentsValues, paypalStatus] = await Promise.all([
    getPlatformSettingsByGroup("general"),
    getPlatformSettingsByGroup("branding"),
    getPlatformSettingsByGroup("payments"),
    getPayPalStatus(),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Platform Settings</h1>
        <p className="text-muted-foreground text-sm mb-6">Global configuration for the platform console.</p>
        <PlatformSettingsForm
          group="general"
          initialValues={values}
          fields={[
            { key: "platform_name", label: "Platform Name" },
            { key: "default_timezone", label: "Default Timezone" },
            { key: "default_currency", label: "Default Currency" },
            { key: "maintenance_mode", label: "Maintenance Mode", type: "select", options: ["false", "true"] },
          ]}
        />
      </div>
      <div>
        <p className="text-foreground font-medium mb-1">White-Label Branding</p>
        <p className="text-muted-foreground text-sm mb-4">Controls KaizenBMS's own footer credit inside tenant workspaces.</p>
        <PlatformSettingsForm
          group="branding"
          initialValues={{ powered_by_enabled: "true", ...brandingValues }}
          fields={[
            { key: "powered_by_enabled", label: "Show \"Powered by KaizenBMS\" in tenant sidebars", type: "select", options: ["true", "false"] },
          ]}
        />
      </div>
      <div>
        <p className="text-foreground font-medium mb-1">Payments</p>
        <p className="text-muted-foreground text-sm mb-4">
          Platform-wide payment configuration. PayPal client credentials are read from server environment
          variables only — they are never stored in the database or sent to the browser.
        </p>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs mb-4 border ${paypalStatus.configured ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-border"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${paypalStatus.configured ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          PayPal: {paypalStatus.configured ? `Connected (${paypalStatus.mode === "live" ? "Live" : "Sandbox"})` : "Not Connected"}
        </div>
        <PlatformSettingsForm
          group="payments"
          initialValues={paymentsValues}
          fields={[
            { key: "tax_percentage", label: "Default Tax %", hint: "Applied as a default when creating a payment plan — companies can still enter 0." },
            { key: "max_payment_amount", label: "Maximum Single Payment Amount", hint: "Leave blank for no limit." },
          ]}
        />
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground max-w-xl space-y-2">
          <p>
            PayPal mode and credentials are environment-only (never a database toggle, so this status can never disagree
            with where transactions actually go): <code>PAYPAL_CLIENT_ID</code>, <code>PAYPAL_CLIENT_SECRET</code>,{" "}
            <code>PAYPAL_MODE</code> (<code>sandbox</code> or <code>live</code>), and <code>PAYPAL_WEBHOOK_ID</code>{" "}
            (from the webhook you configure in the PayPal Developer Dashboard — required for signature verification).
          </p>
          <p>
            Webhook URL to register with PayPal:{" "}
            <code>{(process.env.NEXT_PUBLIC_APP_URL || "https://your-domain").replace(/\/$/, "")}/api/webhooks/paypal</code>
          </p>
          {!paypalStatus.configured && <p>PayPal stays hidden as a payment method everywhere in the workspace until it's configured.</p>}
        </div>
      </div>
    </div>
  );
}
