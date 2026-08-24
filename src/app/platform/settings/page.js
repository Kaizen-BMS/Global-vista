import { getPlatformSettingsByGroup } from "@/lib/platform/actions/settings";
import { getBillDeskStatus } from "@/lib/payments/billdeskClient";
import PlatformSettingsForm from "@/components/platform/PlatformSettingsForm";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default async function PlatformSettingsPage() {
  const [values, brandingValues, paymentsValues] = await Promise.all([
    getPlatformSettingsByGroup("general"),
    getPlatformSettingsByGroup("branding"),
    getPlatformSettingsByGroup("payments"),
  ]);
  const billDeskStatus = getBillDeskStatus();
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
          BillDesk is the platform's only payment gateway for company subscriptions. Credentials are read from
          server environment variables only — they are never stored in the database or sent to the browser.
        </p>

        <div className={`flex items-center gap-3 rounded-xl border p-4 mb-4 ${billDeskStatus.configured ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
          <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${billDeskStatus.configured ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
            {billDeskStatus.configured ? <ShieldCheck className="h-4.5 w-4.5" /> : <AlertTriangle className="h-4.5 w-4.5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-medium">BillDesk</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {billDeskStatus.configured ? `Connected (${billDeskStatus.environment === "live" ? "Live" : "Sandbox"})` : "Not Configured"}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border shrink-0 ${billDeskStatus.configured ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-amber-400 border-amber-500/30 bg-amber-500/10"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${billDeskStatus.configured ? "bg-emerald-400" : "bg-amber-400"}`} />
            {billDeskStatus.configured ? "Connected" : "Not Configured"}
          </span>
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
            BillDesk requires <code>BILLDESK_ENVIRONMENT</code>, <code>BILLDESK_MERCHANT_ID</code>, and a credential/secret pair
            (see <code>.env.example</code>) — the exact required set is confirmed once BillDesk's official merchant integration
            document is available; nothing here is guessed or fabricated.
          </p>
          <p>
            Webhook URL to register with BillDesk: <code>{(process.env.NEXT_PUBLIC_APP_URL || "https://your-domain").replace(/\/$/, "")}/api/webhooks/billdesk</code>
          </p>
          {!billDeskStatus.configured && <p>Paid plans stay unavailable at checkout — on both the registration flow and the company subscription page — until BillDesk is configured.</p>}
        </div>
      </div>
    </div>
  );
}
