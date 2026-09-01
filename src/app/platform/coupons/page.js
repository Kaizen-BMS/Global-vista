import { listCouponsForAdmin } from "@/lib/platform/actions/coupons";
import CouponsManager from "@/components/platform/CouponsManager";
import CouponsOffersTabs from "@/components/platform/CouponsOffersTabs";

export default async function PlatformCouponsPage() {
  const coupons = await listCouponsForAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Coupons & Offers</h1>
        <p className="text-muted-foreground text-sm">Discount codes companies can enter at BillDesk checkout, on registration or on a plan change. A coupon is redeemed once a payment for that checkout actually completes.</p>
      </div>
      <CouponsOffersTabs />
      <CouponsManager coupons={coupons} />
    </div>
  );
}
