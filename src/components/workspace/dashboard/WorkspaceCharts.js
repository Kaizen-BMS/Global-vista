"use client";

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Brush,
} from "recharts";
import ChartCard from "@/components/shared/ChartCard";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "#a78bfa", "#fb923c", "#f472b6", "#60a5fa", "#4ade80"];
const GRID_STROKE = "var(--border)";
const tooltipStyle = { background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };
const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" };
const legendStyle = { fontSize: 12, color: "var(--foreground)" };

/**
 * Two dynamic-import boundaries (CRM charts, Org charts) for every
 * recharts-dependent component on the workspace dashboard — recharts is
 * a large dependency, and this is a high-traffic entry point, so its JS
 * is deferred until after the rest of the dashboard (KPIs, tables) has
 * already painted. See the dynamic() calls in dashboard/page.js.
 */
export function MonthlyLeadTrendChart({ data }) {
  return (
    <ChartCard title="Monthly Leads" subtitle="New leads per month" empty={!data.length} data={data} csvColumns={["month", "count"]}
      renderChart={({ fullscreen }) => (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="month" tick={axisStyle} />
          <YAxis tick={axisStyle} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="count" name="Leads" stroke="var(--chart-1)" strokeWidth={2} dot={fullscreen} />
          {fullscreen && <Brush dataKey="month" height={24} stroke="var(--chart-1)" travellerWidth={8} fill="var(--muted)" />}
        </LineChart>
      )}
    />
  );
}

export function PipelineFunnelChart({ data }) {
  return (
    <ChartCard title="Pipeline by Stage" subtitle="Active leads across the funnel" empty={!data.length} data={data} csvColumns={["stage", "count"]}
      renderChart={({ fullscreen }) => (
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" tick={axisStyle} allowDecimals={false} />
          <YAxis type="category" dataKey="stage" tick={{ ...axisStyle, fontSize: fullscreen ? 12 : 10 }} width={fullscreen ? 160 : 110} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Leads" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
        </BarChart>
      )}
    />
  );
}

function DistributionPie({ title, subtitle, data, nameKey, valueKey, emptyLabel }) {
  return (
    <ChartCard title={title} subtitle={subtitle} empty={!data.length} emptyLabel={emptyLabel} data={data} csvColumns={[nameKey, valueKey]}
      renderChart={({ fullscreen }) => (
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={fullscreen ? 70 : 45} outerRadius={fullscreen ? 140 : 80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
        </PieChart>
      )}
    />
  );
}

export function LeadsBySourceChart({ data }) { return <DistributionPie title="Leads by Source" data={data} nameKey="source" valueKey="count" />; }
export function LeadsByServiceChart({ data }) { return <DistributionPie title="Leads by Service" data={data} nameKey="service" valueKey="count" />; }
export function DepartmentDistributionChart({ data }) { return <DistributionPie title="Department Distribution" data={data} nameKey="department" valueKey="count" />; }
export function RoleDistributionChart({ data }) { return <DistributionPie title="Role Distribution" data={data} nameKey="role" valueKey="count" />; }

export function EmployeeGrowthChart({ data }) {
  return (
    <ChartCard title="Employee Growth" subtitle="New employees per month" empty={!data.length} data={data} csvColumns={["month", "count"]}
      renderChart={({ fullscreen }) => (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="month" tick={axisStyle} />
          <YAxis tick={axisStyle} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="count" name="Employees" stroke="var(--chart-3)" strokeWidth={2} dot={fullscreen} />
          {fullscreen && <Brush dataKey="month" height={24} stroke="var(--chart-3)" travellerWidth={8} fill="var(--muted)" />}
        </LineChart>
      )}
    />
  );
}

export function DocumentUploadTrendChart({ data }) {
  return (
    <ChartCard title="Document Upload Trend" subtitle="Last 30 days" empty={!data.length} data={data} csvColumns={["day", "count"]}
      renderChart={({ fullscreen }) => (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="day" tick={axisStyle} />
          <YAxis tick={axisStyle} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Uploads" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          {fullscreen && <Brush dataKey="day" height={24} stroke="var(--chart-4)" travellerWidth={8} fill="var(--muted)" />}
        </BarChart>
      )}
    />
  );
}

export function UnavailableChart({ title, reason }) {
  return <ChartCard title={title} empty emptyLabel={reason} renderChart={() => null} />;
}
