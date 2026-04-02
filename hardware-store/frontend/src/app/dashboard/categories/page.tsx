"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryApi } from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, X, Loader2, Tag } from "lucide-react";
import clsx from "clsx";

const ICONS = ["building","wrench","zap","droplets","paintbrush","home","truck","package","box","layers","tool","settings"];

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "package", parent: "" });
  const qc = useQueryClient();

  const { data: cats, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getAll().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => {
      toast.success("Category created");
      setShowForm(false);
      setForm({ name: "", description: "", icon: "package", parent: "" });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const roots = (cats || []).filter((c: any) => !c.parent);
  const subs  = (cats || []).filter((c: any) => !!c.parent);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500">{(cats || []).length} categories</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : roots.map((cat: any) => {
          const children = subs.filter((s: any) =>
            s.parent === cat._id || s.parent?._id === cat._id
          );
          return (
            <div key={cat._id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Tag className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                  {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                </div>
              </div>
              {children.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {children.map((child: any) => (
                    <span key={child._id} className="badge badge-gray text-xs">{child.name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Add Category</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Cement & Concrete"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category (optional)</label>
                <select
                  className="input"
                  value={form.parent}
                  onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
                >
                  <option value="">Root category</option>
                  {roots.map((c: any) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!form.name}
                className="btn-primary flex-1"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
