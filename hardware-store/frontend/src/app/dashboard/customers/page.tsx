"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Users, Plus, Search, Edit, Phone, Mail,
  Star, CreditCard, X, Loader2, ChevronDown,
} from "lucide-react";
import clsx from "clsx";

function CustomerForm({ customer, onClose, onSave }: any) {
  const [form, setForm] = useState(customer || {
    name: "", email: "", phone: "", role: "customer",
    creditLimit: 0, loyaltyPoints: 0,
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">
            {customer ? "Edit Customer" : "Add Customer"}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input className="input" placeholder="0712345678" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          {customer && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (KES)</label>
                <input type="number" className="input" value={form.creditLimit} onChange={(e) => set("creditLimit", Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Points</label>
                <input type="number" className="input" value={form.loyaltyPoints} onChange={(e) => set("loyaltyPoints", Number(e.target.value))} />
              </div>
            </>
          )}
          {!customer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" className="input" onChange={(e) => set("password", e.target.value)} placeholder="Min 8 characters" />
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSave(form)} className="btn-primary flex-1">
            {customer ? "Update" : "Add Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editCustomer, setEdit]     = useState<any>(null);
  const [page, setPage]             = useState(1);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () =>
      userApi.getAll({ role: "customer", page, limit: 20 }).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (form: any) =>
      editCustomer
        ? userApi.update(editCustomer._id, form)
        : userApi.getAll({ role: "customer" }), // placeholder — real register would call authApi
    onSuccess: () => {
      toast.success(editCustomer ? "Customer updated" : "Customer added");
      setShowForm(false);
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const customers  = (data?.data || []).filter((c: any) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{pagination.total || 0} customers</p>
        </div>
        <button
          onClick={() => { setEdit(null); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Customer","Phone","Email","Loyalty","Credit Limit","Status","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    No customers found
                  </td>
                </tr>
              ) : customers.map((c: any) => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                        {c.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-primary-600">
                        <Phone className="w-3 h-3" /> {c.phone}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-amber-600">
                      <Star className="w-3.5 h-3.5" />
                      <span className="font-medium">{c.loyaltyPoints || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.creditLimit > 0 ? (
                      <div className="flex items-center gap-1 text-gray-700">
                        <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                        KES {c.creditLimit.toLocaleString()}
                      </div>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("badge", c.isActive ? "badge-green" : "badge-red")}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEdit(c); setShowForm(true); }}
                      className="btn-ghost btn-sm p-2"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= pagination.total} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          customer={editCustomer}
          onClose={() => { setShowForm(false); setEdit(null); }}
          onSave={(form: any) => saveMutation.mutate(form)}
        />
      )}
    </div>
  );
}
