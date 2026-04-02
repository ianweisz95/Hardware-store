"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { supplierApi, branchApi, productApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, X, Trash2, Loader2, FileText, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  draft:     "badge-gray",
  sent:      "badge-blue",
  partial:   "badge-yellow",
  received:  "badge-green",
  cancelled: "badge-red",
};

function POForm({ suppliers, branches, onClose, onSave }: any) {
  const [form, setForm] = useState({
    supplier: "", branch: "", expectedDelivery: "", notes: "", items: [] as any[],
  });
  const [search, setSearch] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products-po", search],
    queryFn: () => productApi.getAll({ search, limit: 10 }).then((r) => r.data.data),
    enabled: search.length > 1,
  });

  const addItem = (product: any) => {
    if (form.items.find((i) => i.product === product._id)) return;
    setForm((f) => ({
      ...f,
      items: [...f.items, { product: product._id, name: product.name, quantity: 1, unitCost: product.costPrice || 0 }],
    }));
    setSearch("");
  };

  const updateItem = (i: number, k: string, v: any) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((item, idx) => idx === i ? { ...item, [k]: Number(v) } : item),
    }));

  const removeItem = (i: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const total    = subtotal * 1.16;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="font-semibold text-gray-900">New Purchase Order</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <select className="input" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}>
                <option value="">Select supplier</option>
                {(suppliers || []).map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <select className="input" value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}>
                <option value="">Select branch</option>
                {(branches || []).map((b: any) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
              <input type="date" className="input" value={form.expectedDelivery} onChange={(e) => setForm((f) => ({ ...f, expectedDelivery: e.target.value }))} />
            </div>
          </div>

          {/* Item search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Add Products</label>
            <div className="relative">
              <input
                className="input"
                placeholder="Search product name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {products && products.length > 0 && search && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-48 overflow-y-auto">
                  {products.map((p: any) => (
                    <button
                      key={p._id}
                      onClick={() => addItem(p)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex justify-between"
                    >
                      <span>{p.name}</span>
                      <span className="text-gray-400">KES {p.costPrice?.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          {form.items.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-gray-500">Product</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500">Unit Cost</th>
                    <th className="text-right px-3 py-2 text-xs text-gray-500">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {form.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          className="w-16 text-right border border-gray-200 rounded px-1.5 py-0.5 text-xs"
                          value={item.quantity}
                          min={1}
                          onChange={(e) => updateItem(i, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          className="w-24 text-right border border-gray-200 rounded px-1.5 py-0.5 text-xs"
                          value={item.unitCost}
                          onChange={(e) => updateItem(i, "unitCost", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        KES {(item.quantity * item.unitCost).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-500">Subtotal</td>
                    <td className="px-3 py-2 text-right font-medium">KES {subtotal.toLocaleString()}</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-xs text-gray-500">VAT (16%)</td>
                    <td className="px-3 py-2 text-right font-medium">KES {(subtotal * 0.16).toLocaleString()}</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-bold text-gray-900">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">KES {Math.round(total).toLocaleString()}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.supplier || !form.branch || form.items.length === 0}
            className="btn-primary flex-1"
          >
            Create Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const [status, setStatus]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: pos, isLoading } = useQuery({
    queryKey: ["purchase-orders", status],
    queryFn: () => api.get("/purchase-orders", { params: { status } }).then((r) => r.data.data),
  });

  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: () => supplierApi.getAll().then((r) => r.data.data) });
  const { data: branches  } = useQuery({ queryKey: ["branches"],  queryFn: () => branchApi.getAll().then((r) => r.data.data)  });

  const createMutation = useMutation({
    mutationFn: (form: any) => api.post("/purchase-orders", form),
    onSuccess: () => { toast.success("Purchase order created"); setShowForm(false); qc.invalidateQueries({ queryKey: ["purchase-orders"] }); },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500">{(pos || []).length} orders</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New PO
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "draft", "sent", "partial", "received", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={clsx("btn btn-sm", status === s ? "btn-primary" : "btn-secondary")}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["PO Number","Supplier","Branch","Items","Total","Expected","Status","Created"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : (pos || []).length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  No purchase orders yet
                </td></tr>
              ) : (pos || []).map((po: any) => (
                <tr key={po._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">{po.poNumber}</td>
                  <td className="px-4 py-3 text-gray-900">{po.supplier?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{po.branch?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{po.items?.length || 0}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">KES {Math.round(po.total || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {po.expectedDelivery ? format(new Date(po.expectedDelivery), "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("badge", STATUS_COLORS[po.status] || "badge-gray")}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(po.createdAt), "dd MMM yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <POForm
          suppliers={suppliers}
          branches={branches}
          onClose={() => setShowForm(false)}
          onSave={(form: any) => createMutation.mutate(form)}
        />
      )}
    </div>
  );
}
