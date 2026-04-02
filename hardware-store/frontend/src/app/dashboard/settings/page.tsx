"use client";
import { useState } from "react";
import { useAuthStore } from "@/store";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { User, Lock, Bell, Store, Shield, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("profile");

  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile(profile);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success("Password changed");
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "profile",  label: "Profile",   icon: User    },
    { id: "security", label: "Security",  icon: Lock    },
    { id: "store",    label: "Store",     icon: Store   },
    { id: "system",   label: "System",    icon: Shield  },
  ];

  return (
    <div className="max-w-3xl space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === "profile" && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="badge badge-blue text-xs mt-1">{user?.role}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              className="input"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              className="input"
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="0712345678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input className="input bg-gray-50" value={user?.email} disabled />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary">
            <CheckCircle className="w-4 h-4" />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      )}

      {/* Security tab */}
      {tab === "security" && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Change Password</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              className="input"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              className="input"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
            />
          </div>
          <button onClick={changePassword} disabled={saving} className="btn-primary">
            <Lock className="w-4 h-4" />
            {saving ? "Updating..." : "Change Password"}
          </button>
        </div>
      )}

      {/* Store tab */}
      {tab === "store" && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Store Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Store Name", placeholder: "Hardware Store Ltd" },
              { label: "KRA PIN",    placeholder: "P000000000A"        },
              { label: "M-Pesa Paybill/Till", placeholder: "174379"   },
              { label: "Default VAT Rate (%)", placeholder: "16"       },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input className="input" placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <div className="pt-2">
            <button className="btn-primary">
              <CheckCircle className="w-4 h-4" /> Save Store Settings
            </button>
          </div>
        </div>
      )}

      {/* System tab */}
      {tab === "system" && (
        <div className="card p-6 space-y-6">
          <h2 className="font-semibold text-gray-900">System Information</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Version",       value: "1.0.0"        },
              { label: "Environment",   value: "Production"   },
              { label: "Database",      value: "MongoDB Atlas" },
              { label: "M-Pesa Env",    value: process.env.NEXT_PUBLIC_MPESA_ENV || "sandbox" },
              { label: "Currency",      value: "KES"          },
              { label: "VAT Rate",      value: "16%"          },
            ].map((i) => (
              <div key={i.label} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">{i.label}</span>
                <span className="font-medium text-gray-900">{i.value}</span>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <p className="font-medium text-blue-800">M-Pesa Integration</p>
            </div>
            <p className="text-sm text-blue-700">
              Currently running in <strong>{process.env.NEXT_PUBLIC_MPESA_ENV || "sandbox"}</strong> mode.
              Switch to production in <code className="bg-blue-100 px-1 rounded">.env</code> to process live payments.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
