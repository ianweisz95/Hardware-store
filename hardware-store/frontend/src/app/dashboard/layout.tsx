"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store";
import {
  LayoutDashboard, Package, ShoppingCart, CreditCard,
  Users, BarChart3, Settings, LogOut, Menu, X,
  Boxes, Truck, ChevronDown, Store, Bell, Sun, Moon,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "cashier"] },
  { href: "/dashboard/pos", label: "POS", icon: ShoppingCart, roles: ["admin", "manager", "cashier"] },
  {
    label: "Inventory",
    icon: Boxes,
    roles: ["admin", "manager"],
    children: [
      { href: "/dashboard/products", label: "Products" },
      { href: "/dashboard/inventory", label: "Stock Levels" },
      { href: "/dashboard/categories", label: "Categories" },
    ],
  },
  {
    label: "Procurement",
    icon: Truck,
    roles: ["admin", "manager"],
    children: [
      { href: "/dashboard/suppliers", label: "Suppliers" },
      { href: "/dashboard/purchase-orders", label: "Purchase Orders" },
    ],
  },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard, roles: ["admin", "manager"] },
  { href: "/dashboard/customers", label: "Customers", icon: Users, roles: ["admin", "manager", "cashier"] },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, roles: ["admin", "manager"] },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: ["admin"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["admin"] },
];

function NavItem({ item, collapsed }: { item: any; collapsed: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();

  if (item.roles && !item.roles.includes(user?.role || "")) return null;

  if (item.children) {
    const isActive = item.children.some((c: any) => pathname.startsWith(c.href));
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronDown className={clsx("w-4 h-4 transition-transform", open && "rotate-180")} />
            </>
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child: any) => (
              <Link
                key={child.href}
                href={child.href}
                className={clsx(
                  "block px-3 py-1.5 rounded-lg text-sm transition-colors",
                  pathname === child.href ? "bg-primary-100 text-primary-700 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const isActive = pathname === item.href;
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        isActive ? "bg-primary-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  if (!user) return null;

  const roleColors: Record<string, string> = {
    admin: "badge-red",
    manager: "badge-blue",
    cashier: "badge-green",
    customer: "badge-gray",
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 h-16">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">HardwarePro</p>
                <p className="text-xs text-gray-500">Kenya</p>
              </div>
            </div>
          )}
          {collapsed && <Store className="w-6 h-6 text-primary-600 mx-auto" />}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 hidden lg:block">
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item, i) => (
            <NavItem key={i} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-200">
          {!collapsed ? (
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                {user.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <span className={clsx("badge text-xs", roleColors[user.role])}>{user.role}</span>
              </div>
              <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={logout} className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => setDark(!dark)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
