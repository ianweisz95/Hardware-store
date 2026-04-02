"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi, branchApi } from "@/lib/api";
import { useAuthStore } from "@/store";
import toast from "react-hot-toast";
import {
  AlertTriangle, Package, ArrowUpDown, Filter,
  TrendingDown, RefreshCw, X, Loader2,
} from "lucide-react";
import clsx from "clsx";

function AdjustStockModal({ inventory, onClose, onSave }: any) {
  const [qty, setQty] = useState(0);
  const [type, setType] = useState("adjustment");
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Adjust Stock</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="mb-3">
          <p className="font-medium text-gray-900">{inventory.product?.name}</p>
          <p className="text-sm text-gray-500">Current stock: <strong>{inventory.quantity}</strong> {inventory.product?.unit}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="adjustment">Manual Adjustment</option>
              <option value="purchase">Purchase / GRN</option>
              <option value="damage">Damage / Write-off</option>
              <option value="return">Customer Return</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity (+ to add, - to remove)
            </label>
            <input type="number" className="input" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            {qty !== 0 && (
              <p className="text-xs mt-1 text-gray-500">
                New stock: <strong className={clsx((inventory.quantity + qty) < 0 ? "text-red-600" : "text-green-600")}>
                  {inventory.quantity + qty}
                </strong>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for adjustment..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => onSave({ productId: inventory.product._id, branchId: inventory.branch._id, quantity: qty, type, note })}
            className="btn-primary flex-1"
            disabled={qty === 0}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuthStore();
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [branch, setBranch] = useState(user?.branch || "");
  const [adjustItem, setAdjustItem] = useState<any>(null);
  const qc = useQueryClient();

  const { data: inventory, isLoading, refetch } = useQuery({
    queryKey: ["inventory", branch, lowStockOnly],
    queryFn: () => inventoryApi.getAll({ branchId: branch, lowStock: lowStockOnly }).then((r) => r.data.data),
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchApi.getAll().then((r) => r.data.data),
    enabled: user?.role === "admin" || user?.role === "manager",
  });

  const adjustMutation = useMutation({
    mutationFn: inventoryApi.adjust,
    onSuccess: () => {
      toast.success("Stock adjusted");
      setAdjustItem(null);
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const lowStockCount = (inventory || []).filter((i: any) => i.quantity <= i.lowStockThreshold).length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{(inventory || []).length} items tracked</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary btn-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Alert banner */}
      {lowStockCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-orange-800">{lowStockCount} items are running low on stock</p>
            <p className="text-sm text-orange-600">Review and reorder soon to avoid stockouts</p>
          </div>
          <button
            onClick={() => setLowStockOnly(true)}
            className="ml-auto btn btn-sm bg-orange-100 text-orange-700 hover:bg-orange-200"
          >
            View All
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {(user?.role === "admin" || user?.role === "manager") && branches && (
          <select className="input w-48" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded text-orange-500"
          />
          <span className="text-sm text-gray-700 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-orange-500" /> Low stock only
          </span>
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Branch</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">In Stock</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reserved</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Available</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Low Stock At</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : (inventory || []).length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  No inventory records
                </td></tr>
              ) : (inventory || []).map((inv: any) => {
                const isLow = inv.quantity <= inv.lowStockThreshold;
                const isOut = inv.quantity === 0;
                const available = Math.max(0, inv.quantity - (inv.reservedQuantity || 0));
                return (
                  <tr key={inv._id} className={clsx("hover:bg-gray-50 transition-colors", isLow && "bg-orange-50/50")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                        <div>
                          <p className="font-medium text-gray-900">{inv.product?.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{inv.product?.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.branch?.name || "—"}</td>
                    <td className={clsx("px-4 py-3 text-right font-semibold", isOut ? "text-red-600" : isLow ? "text-orange-600" : "text-gray-900")}>
                      {inv.quantity} <span className="text-xs font-normal text-gray-400">{inv.product?.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{inv.reservedQuantity || 0}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{available}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{inv.lowStockThreshold}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx("badge", isOut ? "badge-red" : isLow ? "badge-yellow" : "badge-green")}>
                        {isOut ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setAdjustItem(inv)}
                        className="btn-ghost btn-sm flex items-center gap-1 ml-auto"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" /> Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {adjustItem && (
        <AdjustStockModal
          inventory={adjustItem}
          onClose={() => setAdjustItem(null)}
          onSave={(data: any) => adjustMutation.mutate(data)}
        />
      )}
    </div>
  );
}
