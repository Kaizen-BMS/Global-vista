"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Brush } from "recharts";
import ChartCard from "@/components/shared/ChartCard";

const tooltipStyle = { background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8 };
const axisStyle = { fill: "var(--muted-foreground)", fontSize: 11 };

export default function ServiceChart({ data }) {
  return (
    <ChartCard title="Leads by Service" empty={!data?.length} data={data} csvColumns={["service", "count"]}
      renderChart={({ fullscreen }) => (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="service" tick={axisStyle} />
          <YAxis tick={axisStyle} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          {fullscreen && <Brush dataKey="service" height={24} stroke="var(--chart-1)" travellerWidth={8} fill="var(--muted)" />}
        </BarChart>
      )}
    />
  );
}
