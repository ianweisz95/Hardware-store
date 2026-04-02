"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, branchApi } from "@/lib/api";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Plus, Edit, Shield, X, Loader2, Users } from "lucide-react";
import clsx from "clsx";

const ROLES = ["admin", "manager", "cashier", "customer"];
const roleColors: Record<string, string> = {
  admin:    "badge-red",
  manager:  "badge-blue",
  cashier:  "badge-green",
  customer: "badge-gray",
};

function UserForm({ user, branches, onClose, onSave }: any) {
  const [form, setForm] = useState(user || {
    name: "", email: "", phone: "", password: "",
    role: "cashier", branch: "", isActive: true,
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900">{user ? "Edit User" : "Create User"}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input className="input" placeholder="0712345678" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          {!user && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" className="input" onChange={(e) => set("password", e.target.value)} placeholder="Min 8 chars" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select className="input" value={form.role} onChange={(e) => set("role", e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          {["manager","cashier"].includes(form.role) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select className="input" value={form.branch} onChange={(e) => set("branch", e.target.value)}>
                <option value="">Select branch</option>
                {(branches || []).map((b: any) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Active account</span>
          </label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onSave(form)} className="btn-primary flex-1">
            {user ? "Update User" : "Create User"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editUser, setEditUser]     = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["users", roleFilter],
    queryFn: () => userApi.getAll({ role: roleFilter || undefined, limit: 100 }).then((r) => r.data),
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchApi.getAll().then((r) => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (form: any) =>
      editUser
        ? userApi.update(editUser._id, form)
        : api.post("/auth/register", form),
    onSuccess: () => {
      toast.success(editUser ? "User updated" : "User created");
      setShowForm(false);
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed"),
  });

  const users = data?.data || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">{users.length} users</p>
        </div>
        <button onClick={() => { setEditUser(null); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Create User
        </button>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 flex-wrap">
        {["", ...ROLES].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={clsx(
              "btn btn-sm",
              roleFilter === r ? "btn-primary" : "btn-secondary"
            )}
          >
            {r ? r.charAt(0).toUpperCase() + r.slice(1) : "All"}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="col-span-3 py-12 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            No users found
          </div>
        ) : users.map((u: any) => (
          <div key={u._id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                  {u.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{u.name}</p>
                  <span className={clsx("badge text-xs", roleColors[u.role])}>{u.role}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setEditUser(u); setShowForm(true); }}
                  className="btn-ghost btn-sm p-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-500">
              <p className="truncate">{u.email}</p>
              {u.phone && <p>{u.phone}</p>}
              {u.branch?.name && (
                <p className="flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {u.branch.name}
                </p>
              )}
              {u.lastLogin && (
                <p className="text-xs text-gray-400">
                  Last login: {new Date(u.lastLogin).toLocaleDateString("en-KE")}
                </p>
              )}
            </div>
            <div className="mt-3">
              <span className={clsx("badge text-xs", u.isActive ? "badge-green" : "badge-red")}>
                {u.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <UserForm
          user={editUser}
          branches={branches}
          onClose={() => { setShowForm(false); setEditUser(null); }}
          onSave={(form: any) => saveMutation.mutate(form)}
        />
      )}
    </div>
  );
}
