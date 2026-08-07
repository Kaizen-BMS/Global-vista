"use client";
import dynamic from "next/dynamic";
import { ChartsGridSkeleton } from "@/components/shared/Skeleton";

// The dynamic() + ssr:false call has to live inside a client component —
// this file's only job is to be that boundary, so the server dashboard
// page can import a plain component without knowing recharts is lazy.
export const WorkspaceCrmChartsSection = dynamic(
  () => import("@/components/workspace/dashboard/WorkspaceChartsSection").then((m) => m.WorkspaceCrmChartsSection),
  { ssr: false, loading: () => <ChartsGridSkeleton count={4} /> }
);

export const WorkspaceOrgChartsSection = dynamic(
  () => import("@/components/workspace/dashboard/WorkspaceChartsSection").then((m) => m.WorkspaceOrgChartsSection),
  { ssr: false, loading: () => <ChartsGridSkeleton count={6} /> }
);
