"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productApi, categoryApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Plus, Search, Edit, Trash2, Package, Filter,
  ChevronLeft, ChevronRight, X, Loader2, Image,
} from "lucide-react";
import clsx from "clsx";

function ProductForm({ product, categories, onClose, onSave }: any) {
  const [form, setForm] = useState(product || {
    name: "", sku: "", barcode: "", price: "", costPrice: "",
    category: "", brand: "", unit: "piece", description: "",
    lowStockThreshold: 10, taxRate: 16, isActive: true,
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold">{product ? "Edit Product" : "Add Product"}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="AUTO-GENERATED" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input className="input" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (KES) *</label>
            <input type="number" className="input" value={form.price} onChange={(e) => set("price", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (KES)</label>
            <input type="number" className="input" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select className="input" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select category</option>
              {(categories || []).map((c: any) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <select className="input" value={form.unit} onChange={(e) => set("unit", e.target.value)}>
              {["piece", "bag", "meter", "kg", "litre", "roll", "box", "set"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
            <input type="number" className="input" value={form.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
            <input type="number" className="input" value={form.taxRate} onChange={(e) => set("taxRate", Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="rounded" />
              <span className="text-sm text-gray-700">Featured</span>
            </label>
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSave(form)} className="btn-primary flex-1">
            {product ? "Update Product" : "Add Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["products", search, page, category],
    queryFn: () => productApi.getAll({ search, page, limit: 20, category }).then((r) => r.data),
  });

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getAll().then((r) => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (form: any) =>
      editProduct ? productApi.update(editProduct._id, form) : productApi.create(form),
    onSuccess: () => {
      toast.success(editProduct ? "Product updated" : "Product created");
      setShowForm(false);
      setEditProduct(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => { toast.success("Product deactivated"); qc.invalidateQueries({ queryKey: ["products"] }); },
  });

  const products = data?.data || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">{pagination.total || 0} products</p>
        </div>
        <button onClick={() => { setEditProduct(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input w-48" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {(cats || []).map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={8} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  No products found
                </td></tr>
              ) : products.map((p: any) => {
                const margin = p.costPrice > 0 ? ((p.price - p.costPrice) / p.price * 100).toFixed(1) : "—";
                return (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Image className="w-4 h-4 text-gray-300" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold">KES {p.price?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-gray-500">KES {p.costPrice?.toLocaleString()}</td>
                    <td className={clsx("px-4 py-3 text-right font-medium", parseFloat(margin) > 20 ? "text-green-600" : "text-orange-500")}>
                      {margin !== "—" ? `${margin}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx("badge", p.isActive ? "badge-green" : "badge-red")}>
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditProduct(p); setShowForm(true); }} className="btn-ghost btn-sm p-2">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { if (confirm("Deactivate this product?")) deleteMutation.mutate(p._id); }} className="btn-ghost btn-sm p-2 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn-secondary btn-sm">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ProductForm
          product={editProduct}
          categories={cats}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          onSave={(form: any) => saveMutation.mutate(form)}
        />
      )}
    </div>
  );
}
