import { listOffersForAdmin } from "@/lib/platform/actions/offers";
import OffersManager from "@/components/platform/OffersManager";

export default async function PlatformOffersPage() {
  const offers = await listOffersForAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Offers</h1>
        <p className="text-muted-foreground text-sm">Active offers scroll in a strip on the homepage, in the order set below. Hidden offers stay saved but off the public page.</p>
      </div>
      <OffersManager offers={offers} />
    </div>
  );
}
