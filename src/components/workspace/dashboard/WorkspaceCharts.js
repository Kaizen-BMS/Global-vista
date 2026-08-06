"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22d3ee", "#34d399", "#facc15", "#f87171", "#a78bfa", "#fb923c", "#f472b6", "#60a5fa", "#4ade80"];
const tooltipStyle = { background: "#171717", border: "1px solid #262626", borderRadius: 8, fontSize: 12 };
const axisStyle = { fontSize: 11, fill: "#737373" };

function ChartCard({ title, subtitle, children, empty, emptyLabel }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium">{title}</p>
      {subtitle && <p className="text-neutral-500 text-xs mb-1">{subtitle}</p>}
      <div className="h-64 mt-3">
        {empty ? (
          <div className="h-full flex items-center justify-center text-neutral-600 text-sm text-center px-6">{emptyLabel || "No data yet"}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function MonthlyLeadTrendChart({ data }) {
  return (
    <ChartCard title="Monthly Leads" subtitle="New leads per month" empty={!data.length}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" tick={axisStyle} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="count" name="Leads" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartCard>
  );
}

export function PipelineFunnelChart({ data }) {
  return (
    <ChartCard title="Pipeline by Stage" subtitle="Active leads across the funnel" empty={!data.length}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
        <XAxis type="number" tick={axisStyle} allowDecimals={false} />
        <YAxis type="category" dataKey="stage" tick={{ ...axisStyle, fontSize: 10 }} width={110} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Leads" fill="#22d3ee" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartCard>
  );
}

function DistributionPie({ title, subtitle, data, nameKey, valueKey, emptyLabel }) {
  return (
    <ChartCard title={title} subtitle={subtitle} empty={!data.length} emptyLabel={emptyLabel}>
      <PieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={45} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartCard>
  );
}

export function LeadsBySourceChart({ data }) { return <DistributionPie title="Leads by Source" data={data} nameKey="source" valueKey="count" />; }
export function LeadsByServiceChart({ data }) { return <DistributionPie title="Leads by Service" data={data} nameKey="service" valueKey="count" />; }
export function DepartmentDistributionChart({ data }) { return <DistributionPie title="Department Distribution" data={data} nameKey="department" valueKey="count" />; }
export function RoleDistributionChart({ data }) { return <DistributionPie title="Role Distribution" data={data} nameKey="role" valueKey="count" />; }

export function EmployeeGrowthChart({ data }) {
  return (
    <ChartCard title="Employee Growth" subtitle="New employees per month" empty={!data.length}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" tick={axisStyle} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="count" name="Employees" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartCard>
  );
}

export function DocumentUploadTrendChart({ data }) {
  return (
    <ChartCard title="Document Upload Trend" subtitle="Last 30 days" empty={!data.length}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="day" tick={axisStyle} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Uploads" fill="#facc15" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function UnavailableChart({ title, reason }) {
  return <ChartCard title={title} empty emptyLabel={reason} />;
}
