"use client";

import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import ChartCard from "@/components/shared/ChartCard";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#a78bfa", "#fb923c", "#f472b6", "#60a5fa", "#4ade80"];
const tooltipStyle = { background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8 };
const legendStyle = { fontSize: 12, color: "var(--foreground)" };

export default function LeadSourceChart({ data }) {
  return (
    <ChartCard title="Leads by Source" empty={!data?.length} data={data} csvColumns={["source", "count"]}
      renderChart={({ fullscreen }) => (
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="source" innerRadius={fullscreen ? 70 : 50} outerRadius={fullscreen ? 140 : 80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      )}
    />
  );
}
