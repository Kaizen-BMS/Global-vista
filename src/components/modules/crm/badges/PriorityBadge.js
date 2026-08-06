import { PRIORITY_COLORS } from "@/lib/constants/leadStages";

export default function PriorityBadge({ priority }) {
  return (
    <span className={`inline-block text-xs px-2 py-1 rounded-md border whitespace-nowrap ${PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium}`}>
      {priority}
    </span>
  );
}