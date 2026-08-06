"use client";

import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const COLORS = ["#6366f1", "#22d3ee", "#34d399", "#facc15", "#f87171", "#a78bfa", "#fb923c", "#f472b6", "#60a5fa", "#4ade80"];
const tooltipStyle = { background: "#171717", border: "1px solid #262626", borderRadius: 8, fontSize: 12 };
const axisStyle = { fontSize: 11, fill: "#737373" };

function ChartCard({ title, subtitle, children, empty }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium">{title}</p>
      {subtitle && <p className="text-neutral-500 text-xs mb-1">{subtitle}</p>}
      <div className="h-64 mt-3">
        {empty ? (
          <div className="h-full flex items-center justify-center text-neutral-600 text-sm">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function CompanyGrowthChart({ data }) {
  return (
    <ChartCard title="Company Growth" subtitle="New companies per month" empty={!data.length}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="month" tick={axisStyle} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="count" name="Companies" stroke="#6366f1" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartCard>
  );
}

export function LoginActivityChart({ data }) {
  return (
    <ChartCard title="Login Activity" subtitle="Logins vs. distinct active users, selected range" empty={!data.length}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="day" tick={axisStyle} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="logins" name="Logins" stroke="#22d3ee" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="active_users" name="Active Users" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartCard>
  );
}

export function ProvisioningHistoryChart({ data }) {
  return (
    <ChartCard title="Provisioning History" subtitle="Selected range" empty={!data.length}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="day" tick={axisStyle} />
        <YAxis tick={axisStyle} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="success" name="Success" fill="#34d399" radius={[4, 4, 0, 0]} />
        <Bar dataKey="failed" name="Failed" fill="#f87171" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartCard>
  );
}

export function ModuleUsageChart({ data }) {
  return (
    <ChartCard title="Module Usage" subtitle="Companies with module enabled" empty={!data.length}>
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
        <XAxis type="number" tick={axisStyle} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={axisStyle} width={110} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="company_count" name="Companies" fill="#a78bfa" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartCard>
  );
}

function DistributionPie({ title, subtitle, data, nameKey, valueKey }) {
  return (
    <ChartCard title={title} subtitle={subtitle} empty={!data.length}>
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

export function PlanDistributionChart({ data }) {
  return <DistributionPie title="Plan Distribution" subtitle="Current subscription plan per company" data={data} nameKey="plan" valueKey="count" />;
}

export function SubscriptionStatusChart({ data }) {
  const labeled = data.map((d) => ({ ...d, status: d.status[0].toUpperCase() + d.status.slice(1) }));
  return <DistributionPie title="Subscription Trend" subtitle="Current status across all tenants" data={labeled} nameKey="status" valueKey="count" />;
}
