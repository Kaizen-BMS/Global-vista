import { getPlatformSettingsByGroup } from "@/lib/platform/actions/settings";
import { getPayPalStatus, getRazorpayStatus } from "@/lib/payments/providers";
import PlatformSettingsForm from "@/components/platform/PlatformSettingsForm";

export default async function PlatformSettingsPage() {
  const [values, brandingValues, paymentsValues, paypalStatus, razorpayStatus] = await Promise.all([
    getPlatformSettingsByGroup("general"),
    getPlatformSettingsByGroup("branding"),
    getPlatformSettingsByGroup("payments"),
    getPayPalStatus(),
    getRazorpayStatus(),
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
          Platform-wide payment configuration. Gateway credentials are read from server environment
          variables only — they are never stored in the database or sent to the browser.
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${razorpayStatus.configured ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-border"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${razorpayStatus.configured ? "bg-emerald-400" : "bg-muted-foreground"}`} />
            Razorpay: {razorpayStatus.configured ? `Connected (${razorpayStatus.mode === "live" ? "Live" : "Test"})` : "Not Connected"}
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${paypalStatus.configured ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-muted/40 text-muted-foreground border-border"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${paypalStatus.configured ? "bg-emerald-400" : "bg-muted-foreground"}`} />
            PayPal: {paypalStatus.configured ? `Connected (${paypalStatus.mode === "live" ? "Live" : "Sandbox"})` : "Not Connected"}
          </div>
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
            Razorpay: <code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code>, <code>RAZORPAY_WEBHOOK_SECRET</code>{" "}
            (from the webhook you configure in the Razorpay Dashboard). Mode (test/live) is read directly from
            which key pair you set — Razorpay issues separate <code>rzp_test_...</code> / <code>rzp_live_...</code> keys, so there's no separate mode toggle to keep in sync.
          </p>
          <p>
            PayPal: <code>PAYPAL_CLIENT_ID</code>, <code>PAYPAL_CLIENT_SECRET</code>,{" "}
            <code>PAYPAL_ENVIRONMENT</code> (<code>sandbox</code> or <code>live</code>), and <code>PAYPAL_WEBHOOK_ID</code>{" "}
            (from the webhook you configure in the PayPal Developer Dashboard).
          </p>
          <p>
            Webhook URLs to register:{" "}
            <code>{(process.env.NEXT_PUBLIC_APP_URL || "https://your-domain").replace(/\/$/, "")}/api/webhooks/razorpay</code>
            {" · "}
            <code>{(process.env.NEXT_PUBLIC_APP_URL || "https://your-domain").replace(/\/$/, "")}/api/webhooks/paypal</code>
          </p>
          {(!razorpayStatus.configured || !paypalStatus.configured) && <p>An unconfigured gateway stays hidden as a payment option everywhere in the workspace and on the subscription checkout page.</p>}
        </div>
      </div>
    </div>
  );
}
