"use client";

import { AlertTriangle } from "lucide-react";

export default function CrmError({ reset }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <h2 className="text-white text-lg font-medium mb-1">Something went wrong</h2>
      <p className="text-neutral-500 text-sm mb-6">An unexpected error occurred while loading this page.</p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
      >
        Try Again
      </button>
    </div>
  );
}