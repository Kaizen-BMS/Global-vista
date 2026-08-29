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

export function CompanyGrowthChart({ data }) {
  return (
    <ChartCard title="Company Growth" subtitle="New companies per month" empty={!data.length} data={data} csvColumns={["month", "count"]}
      renderChart={({ fullscreen }) => (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="month" tick={axisStyle} />
          <YAxis tick={axisStyle} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="count" name="Companies" stroke="var(--chart-1)" strokeWidth={2} dot={fullscreen} />
          {fullscreen && <Brush dataKey="month" height={24} stroke="var(--chart-1)" travellerWidth={8} fill="var(--muted)" />}
        </LineChart>
      )}
    />
  );
}

export function LoginActivityChart({ data }) {
  return (
    <ChartCard title="Login Activity" subtitle="Logins vs. distinct active users, selected range" empty={!data.length} data={data} csvColumns={["day", "logins", "active_users"]}
      renderChart={({ fullscreen }) => (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="day" tick={axisStyle} />
          <YAxis tick={axisStyle} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Line type="monotone" dataKey="logins" name="Logins" stroke="var(--chart-2)" strokeWidth={2} dot={fullscreen} />
          <Line type="monotone" dataKey="active_users" name="Active Users" stroke="var(--chart-3)" strokeWidth={2} dot={fullscreen} />
          {fullscreen && <Brush dataKey="day" height={24} stroke="var(--chart-2)" travellerWidth={8} fill="var(--muted)" />}
        </LineChart>
      )}
    />
  );
}

export function RevenueTrendChart({ data, currencies }) {
  return (
    <ChartCard title="Revenue" subtitle="Completed payments, selected range" empty={!data.length} data={data} csvColumns={["day", ...currencies]}
      renderChart={({ fullscreen }) => (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="day" tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          {currencies.length > 1 && <Legend wrapperStyle={legendStyle} />}
          {currencies.map((cur, i) => (
            <Line key={cur} type="monotone" dataKey={cur} name={cur} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={fullscreen} connectNulls />
          ))}
          {fullscreen && <Brush dataKey="day" height={24} stroke={COLORS[0]} travellerWidth={8} fill="var(--muted)" />}
        </LineChart>
      )}
    />
  );
}

export function ProvisioningHistoryChart({ data }) {
  return (
    <ChartCard title="Provisioning History" subtitle="Selected range" empty={!data.length} data={data} csvColumns={["day", "success", "failed"]}
      renderChart={({ fullscreen }) => (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis dataKey="day" tick={axisStyle} />
          <YAxis tick={axisStyle} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} />
          <Bar dataKey="success" name="Success" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="failed" name="Failed" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
          {fullscreen && <Brush dataKey="day" height={24} stroke="var(--chart-3)" travellerWidth={8} fill="var(--muted)" />}
        </BarChart>
      )}
    />
  );
}

export function ModuleUsageChart({ data }) {
  return (
    <ChartCard title="Module Usage" subtitle="Companies with module enabled" empty={!data.length} data={data} csvColumns={["name", "company_count"]}
      renderChart={({ fullscreen }) => (
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" tick={axisStyle} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={axisStyle} width={fullscreen ? 160 : 110} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="company_count" name="Companies" fill="#a78bfa" radius={[0, 4, 4, 0]} />
        </BarChart>
      )}
    />
  );
}

function DistributionPie({ title, subtitle, data, nameKey, valueKey }) {
  return (
    <ChartCard title={title} subtitle={subtitle} empty={!data.length} data={data} csvColumns={[nameKey, valueKey]}
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

export function PlanDistributionChart({ data }) {
  return <DistributionPie title="Plan Distribution" subtitle="Current subscription plan per company" data={data} nameKey="plan" valueKey="count" />;
}

export function SubscriptionStatusChart({ data }) {
  const labeled = data.map((d) => ({ ...d, status: d.status[0].toUpperCase() + d.status.slice(1) }));
  return <DistributionPie title="Subscription Trend" subtitle="Current status across all tenants" data={labeled} nameKey="status" valueKey="count" />;
}
