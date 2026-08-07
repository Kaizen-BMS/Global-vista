"use client";
import dynamic from "next/dynamic";
import { ChartsGridSkeleton } from "@/components/shared/Skeleton";

export const PlatformChartsGrid = dynamic(
  () => import("@/components/platform/dashboard/PlatformChartsSection").then((m) => m.PlatformChartsGrid),
  { ssr: false, loading: () => <ChartsGridSkeleton count={6} /> }
);
