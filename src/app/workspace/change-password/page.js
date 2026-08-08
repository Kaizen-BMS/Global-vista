import ChangePasswordForm from "@/components/forms/ChangePasswordForm";
export default async function ChangePasswordPage({ searchParams }) {
  const sp = await searchParams;
  return (<div className="max-w-md"><h1 className="text-xl font-semibold text-foreground mb-1">Change Password</h1><ChangePasswordForm forced={sp.forced === "1"} /></div>);
}