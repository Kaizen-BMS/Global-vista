import { listPartnersForAdmin } from "@/lib/platform/actions/partners";
import PartnersManager from "@/components/platform/PartnersManager";

export default async function PlatformPartnersPage() {
  const partners = await listPartnersForAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Partner Program</h1>
        <p className="text-muted-foreground text-sm">
          Give each influencer/affiliate their own tracking code — it works as a real coupon at checkout, and every
          redemption is attributed back to them so you can see exactly how many companies signed up and how much
          revenue they've brought in.
        </p>
      </div>
      <PartnersManager partners={partners} />
    </div>
  );
}
