"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export default function ServiceChart({ data }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium mb-4">Leads by Service</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="service" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
            <YAxis tick={{ fill: "#a3a3a3", fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8 }} />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}