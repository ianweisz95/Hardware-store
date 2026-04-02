"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/lib/api";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingBag, BarChart3 } from "lucide-react";

const COLORS = ["#2563eb", "#16a34a", "#f97316", "#8b5cf6", "#ec4899"];

const presets = [
  { label: "Today", from: () => format(new Date(), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd"), group: "day" },
  { label: "Last 7 days", from: () => format(subDays(new Date(), 6), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd"), group: "day" },
  { label: "This month", from: () => format(startOfMonth(new Date()), "yyyy-MM-dd"), to: () => format(endOfMonth(new Date()), "yyyy-MM-dd"), group: "day" },
  { label: "Last 3 months", from: () => format(subDays(new Date(), 90), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd"), group: "month" },
];

export default function ReportsPage() {
  const [preset, setPreset] = useState(1);
  const [from, setFrom] = useState(presets[1].from());
  const [to, setTo] = useState(presets[1].to());
  const [groupBy, setGroupBy] = useState("day");

  const applyPreset = (i: number) => {
    const p = presets[i];
    setPreset(i);
    setFrom(p.from());
    setTo(p.to());
    setGroupBy(p.group);
  };

  const { data: salesData } = useQuery({
    queryKey: ["sales", from, to, groupBy],
    queryFn: () => reportApi.getSales({ from, to, groupBy }).then((r) => r.data.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products", from, to],
    queryFn: () => reportApi.getTopProducts({ from, to, limit: 10 }).then((r) => r.data.data),
  });

  const chartData = (salesData || []).map((d: any) => ({
    date: d._id,
    Revenue: d.revenue,
    Profit: d.profit,
    Orders: d.count,
  }));

  const totals = (salesData || []).reduce(
    (acc: any, d: any) => ({
      revenue: acc.revenue + d.revenue,
      profit: acc.profit + d.profit,
      orders: acc.orders + d.count,
      discount: acc.discount + d.discount,
    }),
    { revenue: 0, profit: 0, orders: 0, discount: 0 }
  );

  const downloadCSV = () => {
    if (!salesData?.length) return;
    const rows = [
      ["Date", "Orders", "Revenue (KES)", "Profit (KES)", "Discount (KES)"],
      ...salesData.map((d: any) => [d._id, d.count, d.revenue, d.profit, d.discount]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${from}-to-${to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
        <button onClick={downloadCSV} className="btn-secondary btn-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Date filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2 flex-wrap">
          {presets.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className={`btn btn-sm ${preset === i ? "btn-primary" : "btn-secondary"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" className="input w-40 text-sm" value={from} onChange={(e) => { setFrom(e.target.value); setPreset(-1); }} />
          <span className="text-gray-400">—</span>
          <input type="date" className="input w-40 text-sm" value={to} onChange={(e) => { setTo(e.target.value); setPreset(-1); }} />
        </div>
        <select className="input w-32 text-sm" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
          <option value="day">Daily</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `KES ${Math.round(totals.revenue).toLocaleString()}`, icon: DollarSign, color: "text-primary-600 bg-primary-50" },
          { label: "Total Profit", value: `KES ${Math.round(totals.profit).toLocaleString()}`, icon: TrendingUp, color: "text-green-600 bg-green-50" },
          { label: "Total Orders", value: totals.orders.toLocaleString(), icon: ShoppingBag, color: "text-orange-600 bg-orange-50" },
          { label: "Discounts Given", value: `KES ${Math.round(totals.discount).toLocaleString()}`, icon: TrendingDown, color: "text-red-600 bg-red-50" },
        ].map((c, i) => (
          <div key={i} className="card p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Revenue & Profit Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: any, name: string) => [`KES ${Math.round(v).toLocaleString()}`, name]}
              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
            />
            <Legend />
            <Area type="monotone" dataKey="Revenue" stroke="#2563eb" strokeWidth={2} fill="url(#rev)" />
            <Area type="monotone" dataKey="Profit" stroke="#16a34a" strokeWidth={2} fill="url(#prof)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Orders chart */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Orders Volume</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Products by Revenue</h2>
          <div className="space-y-3">
            {(topProducts || []).slice(0, 8).map((p: any, i: number) => {
              const maxRev = topProducts?.[0]?.totalRevenue || 1;
              const pct = (p.totalRevenue / maxRev) * 100;
              return (
                <div key={p._id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="truncate text-gray-900 font-medium">{p.name}</span>
                    <span className="text-gray-500 ml-2 flex-shrink-0">KES {Math.round(p.totalRevenue).toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
