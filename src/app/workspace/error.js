"use client";
import { useEffect } from "react";

export default function WorkspaceError({ error, reset }) {
  useEffect(() => {
    console.error("Workspace render error:", error);
  }, [error]);

  return (
    <div className="text-center py-24">
      <p className="text-foreground text-lg mb-4">Something went wrong</p>
      {process.env.NODE_ENV !== "production" && (
        <p className="text-red-400 text-xs mb-4 max-w-xl mx-auto whitespace-pre-wrap">{error?.message}</p>
      )}
      <button onClick={reset} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm cursor-pointer">Try Again</button>
    </div>
  );
}
