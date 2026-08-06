import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function CrmNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-14 w-14 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
        <FileQuestion className="h-6 w-6 text-neutral-400" />
      </div>
      <h2 className="text-white text-lg font-medium mb-1">Page not found</h2>
      <p className="text-neutral-500 text-sm mb-6">The page you're looking for doesn't exist.</p>
      <Link
        href="/crm/dashboard"
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}