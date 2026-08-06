import { getSession } from "@/lib/auth";
import ChangePasswordForm from "@/components/crm/forms/ChangePasswordForm";

export default async function ChangePasswordPage({ searchParams }) {
  const session = await getSession();
  const sp = await searchParams;
  const forced = sp.forced === "1" || !!session?.must_change_password;

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-white mb-1">
        {forced ? "Set a New Password" : "Change Password"}
      </h1>
      <p className="text-neutral-500 text-sm mb-6">
        {forced
          ? "You're using a temporary password. Set a new one to continue."
          : "Update your account password."}
      </p>
      <ChangePasswordForm forced={forced} />
    </div>
  );
}