"use client";
import { useQuery } from "@tanstack/react-query";
import { reportApi, posApi } from "@/lib/api";
import { useAuthStore } from "@/store";
import {
  TrendingUp, ShoppingBag, DollarSign, Package,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { format, subDays } from "date-fns";

function StatCard({ title, value, change, icon: Icon, color, prefix = "KES " }: any) {
  const isPositive = change >= 0;
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {prefix}{typeof value === "number" ? value.toLocaleString("en-KE") : value}
      </p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}% vs yesterday
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const today = format(new Date(), "yyyy-MM-dd");
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data: summary } = useQuery({
    queryKey: ["daily-summary", today],
    queryFn: () => posApi.getDailySummary({ date: today }).then((r) => r.data.data),
  });

  const { data: salesData } = useQuery({
    queryKey: ["sales-chart", weekAgo, today],
    queryFn: () =>
      reportApi.getSales({ from: weekAgo, to: today, groupBy: "day" }).then((r) => r.data.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products"],
    queryFn: () => reportApi.getTopProducts({ limit: 5, from: weekAgo }).then((r) => r.data.data),
  });

  const s = summary?.summary || {};
  const chartData = (salesData || []).map((d: any) => ({
    date: format(new Date(d._id), "EEE"),
    Revenue: d.revenue,
    Orders: d.count,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
          {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={s.totalRevenue || 0}
          change={12}
          icon={DollarSign}
          color="bg-primary-600"
        />
        <StatCard
          title="Today's Sales"
          value={s.totalSales || 0}
          change={8}
          icon={ShoppingBag}
          color="bg-green-600"
          prefix=""
        />
        <StatCard
          title="M-Pesa Today"
          value={s.totalMpesa || 0}
          change={15}
          icon={TrendingUp}
          color="bg-orange-500"
        />
        <StatCard
          title="Cash Today"
          value={s.totalCash || 0}
          change={-3}
          icon={Package}
          color="bg-purple-600"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-gray-900">Revenue (Last 7 Days)</h2>
            <span className="badge badge-blue">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                formatter={(v: any) => [`KES ${v.toLocaleString()}`, "Revenue"]}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px" }}
              />
              <Area
                type="monotone" dataKey="Revenue" stroke="#2563eb"
                strokeWidth={2} fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Products (7 days)</h2>
          <div className="space-y-3">
            {(topProducts || []).slice(0, 5).map((p: any, i: number) => (
              <div key={p._id} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.totalQty} sold</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  KES {p.totalRevenue?.toLocaleString()}
                </p>
              </div>
            ))}
            {!topProducts?.length && (
              <p className="text-sm text-gray-400 text-center py-8">No sales data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Avg. Order Value</p>
          <p className="text-xl font-bold text-gray-900">
            KES {Math.round(s.avgOrderValue || 0).toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total Discount Given</p>
          <p className="text-xl font-bold text-orange-600">
            KES {(s.totalDiscount || 0).toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">VAT Collected</p>
          <p className="text-xl font-bold text-gray-900">
            KES {Math.round(s.totalTax || 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
