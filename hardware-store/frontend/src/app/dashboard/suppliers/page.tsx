"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Edit, Phone, Mail, X, Truck, Loader2 } from "lucide-react";

function SupplierForm({ supplier, onClose, onSave }: any) {
  const [form, setForm] = useState(supplier || {
    name: "", contactPerson: "", email: "", phone: "",
    address: { city: "", county: "" }, kraPin: "", paymentTerms: 30,
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">{supplier ? "Edit Supplier" : "Add Supplier"}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input className="input" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+254..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">KRA PIN</label>
            <input className="input" value={form.kraPin} onChange={(e) => set("kraPin", e.target.value)} placeholder="P000000000A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input className="input" value={form.address?.city} onChange={(e) => set("address", { ...form.address, city: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
            <input type="number" className="input" value={form.paymentTerms} onChange={(e) => set("paymentTerms", Number(e.target.value))} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSave(form)} className="btn-primary flex-1">
            {supplier ? "Update" : "Add Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const qc = useQueryClient();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => supplierApi.getAll().then((r) => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (form: any) =>
      editSupplier ? supplierApi.update(editSupplier._id, form) : supplierApi.create(form),
    onSuccess: () => {
      toast.success(editSupplier ? "Supplier updated" : "Supplier added");
      setShowForm(false);
      setEditSupplier(null);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500">{(suppliers || []).length} suppliers</p>
        </div>
        <button onClick={() => { setEditSupplier(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
        ) : (suppliers || []).map((s: any) => (
          <div key={s._id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary-600" />
              </div>
              <button onClick={() => { setEditSupplier(s); setShowForm(true); }} className="btn-ghost btn-sm p-1.5">
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="font-semibold text-gray-900">{s.name}</h3>
            {s.contactPerson && <p className="text-sm text-gray-500">{s.contactPerson}</p>}
            <div className="mt-3 space-y-1">
              {s.phone && (
                <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600">
                  <Phone className="w-3.5 h-3.5" /> {s.phone}
                </a>
              )}
              {s.email && (
                <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600">
                  <Mail className="w-3.5 h-3.5" /> {s.email}
                </a>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {s.kraPin && <span className="badge badge-gray text-xs">{s.kraPin}</span>}
              <span className="badge badge-blue text-xs">Net {s.paymentTerms} days</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <SupplierForm
          supplier={editSupplier}
          onClose={() => { setShowForm(false); setEditSupplier(null); }}
          onSave={(form: any) => saveMutation.mutate(form)}
        />
      )}
    </div>
  );
}
