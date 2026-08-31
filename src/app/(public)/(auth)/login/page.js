import { Suspense } from "react";
import AuthFlow from "@/components/auth/AuthFlow";

export default function LoginPage() {
  // LoginForm reads ?redirect= via useSearchParams (see the pricing-page
  // "log in, then straight to checkout" flow) — that hook requires a
  // Suspense boundary for this route to still prerender statically.
  return (
    <Suspense>
      <AuthFlow initialView="login" />
    </Suspense>
  );
}
