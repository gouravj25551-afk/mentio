"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function AnalyticsChart({ data }: { data: { day: string; bookings: number; revenue: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(263 90% 65%)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="hsl(263 90% 65%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="day" tickFormatter={(v) => v.slice(5)} fontSize={11} />
          <YAxis fontSize={11} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
          <Area type="monotone" dataKey="bookings" stroke="hsl(263 90% 55%)" fill="url(#grad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
