"use client";
export default function WorkspaceError({ reset }) {
  return (
    <div className="text-center py-24">
      <p className="text-foreground text-lg mb-4">Something went wrong</p>
      <button onClick={reset} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Try Again</button>
    </div>
  );
}