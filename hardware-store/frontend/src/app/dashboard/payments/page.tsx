"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentApi } from "@/lib/api";
import { format } from "date-fns";
import {
  Smartphone, CheckCircle, XCircle, Clock,
  Search, Filter, RefreshCw, Loader2,
} from "lucide-react";
import clsx from "clsx";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending:   { label: "Pending",   icon: Clock,         color: "badge-yellow" },
  completed: { label: "Completed", icon: CheckCircle,   color: "badge-green"  },
  failed:    { label: "Failed",    icon: XCircle,       color: "badge-red"    },
  cancelled: { label: "Cancelled", icon: XCircle,       color: "badge-gray"   },
  timeout:   { label: "Timeout",   icon: Clock,         color: "badge-red"    },
};

export default function PaymentsPage() {
  const [status, setStatus] = useState("");
  const [phone, setPhone]   = useState("");
  const [page, setPage]     = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["payments", status, phone, page],
    queryFn: () =>
      paymentApi.getAll({ status, phone, page, limit: 25 }).then((r) => r.data),
  });

  const payments    = data?.data        || [];
  const pagination  = data?.pagination  || {};

  const totalCompleted = payments.filter((p: any) => p.status === "completed").length;
  const totalAmount    = payments
    .filter((p: any) => p.status === "completed")
    .reduce((s: number, p: any) => s + p.amount, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">M-Pesa Payments</h1>
          <p className="text-sm text-gray-500">{pagination.total || 0} transactions</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary btn-sm" disabled={isFetching}>
          <RefreshCw className={clsx("w-3.5 h-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Successful (this page)</p>
          <p className="text-xl font-bold text-green-700">{totalCompleted}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Amount (this page)</p>
          <p className="text-xl font-bold text-gray-900">KES {totalAmount.toLocaleString()}</p>
        </div>
        <div className="card p-4 hidden sm:block">
          <p className="text-xs text-gray-500">Success Rate</p>
          <p className="text-xl font-bold text-primary-700">
            {payments.length > 0
              ? `${Math.round((totalCompleted / payments.length) * 100)}%`
              : "—"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Filter by phone..."
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-40"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {Object.keys(statusConfig).map((s) => (
            <option key={s} value={s}>{statusConfig[s].label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Date/Time","Phone","Amount","Order","Receipt","Status","Desc"].map((h) => (
                  <th
                    key={h}
                    className={clsx(
                      "px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide",
                      h === "Amount" || h === "Status" ? "text-right" : "text-left"
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    No payment records found
                  </td>
                </tr>
              ) : (
                payments.map((p: any) => {
                  const cfg = statusConfig[p.status] || statusConfig.pending;
                  return (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {format(new Date(p.createdAt), "dd MMM yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-900">{p.phoneNumber}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        KES {p.amount?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {p.order?.orderNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                        {p.mpesaReceiptNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={clsx("badge", cfg.color)}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                        {p.resultDesc || p.transactionDesc || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 25 >= pagination.total}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
