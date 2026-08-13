import AuthShell from "@/components/auth/AuthShell";
import RegisterFlow from "@/components/auth/RegisterFlow";

export default function RegisterPage() {
  return (
    <AuthShell maxWidth="max-w-lg">
      <RegisterFlow />
    </AuthShell>
  );
}
