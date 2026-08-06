import { STAGE_COLORS } from "@/lib/modules/crm/constants/leadStages";

export default function StageBadge({ stage }) {
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded-md border whitespace-nowrap ${STAGE_COLORS[stage] || "bg-neutral-700/20 text-neutral-400 border-neutral-600/30"}`}>
      {stage}
    </span>
  );
}