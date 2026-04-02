import { create } from "zustand";
import { persist } from "zustand/middleware";
import Cookies from "js-cookie";
import { authApi } from "@/lib/api";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "admin" | "manager" | "cashier" | "customer";
  branch?: string;
  loyaltyPoints?: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isAuthenticated: false,

      setToken: (token: string) => {
        Cookies.set("accessToken", token, { expires: 7, sameSite: "strict" });
        localStorage.setItem("accessToken", token);
        set({ accessToken: token });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({ email, password });
          const { user, accessToken } = res.data.data;
          Cookies.set("accessToken", accessToken, { expires: 7, sameSite: "strict" });
          localStorage.setItem("accessToken", accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {}
        Cookies.remove("accessToken");
        localStorage.removeItem("accessToken");
        set({ user: null, accessToken: null, isAuthenticated: false });
        window.location.href = "/login";
      },

      fetchMe: async () => {
        try {
          const res = await authApi.getMe();
          set({ user: res.data.data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: "auth-store",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ─── POS Cart Store ───────────────────────────────────────────────────────────
interface CartItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  customerName: string;
  customerPhone: string;
  paymentMethod: "cash" | "mpesa" | "credit" | "mixed";
  addItem: (product: any, qty?: number) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updatePrice: (productId: string, price: number) => void;
  setDiscount: (amount: number) => void;
  setCustomer: (name: string, phone: string) => void;
  setPaymentMethod: (method: "cash" | "mpesa" | "credit" | "mixed") => void;
  clearCart: () => void;
  subtotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  discount: 0,
  customerName: "",
  customerPhone: "",
  paymentMethod: "cash",

  addItem: (product: any, qty = 1) => {
    const items = get().items;
    const existing = items.find((i) => i.productId === product._id);
    if (existing) {
      set({
        items: items.map((i) =>
          i.productId === product._id
            ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unitPrice }
            : i
        ),
      });
    } else {
      const price = product.effectivePrice || product.price;
      set({
        items: [
          ...items,
          {
            productId: product._id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            quantity: qty,
            unitPrice: price,
            total: qty * price,
          },
        ],
      });
    }
  },

  removeItem: (productId: string) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

  updateQty: (productId: string, qty: number) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.productId === productId ? { ...i, quantity: qty, total: qty * i.unitPrice } : i
      ),
    })),

  updatePrice: (productId: string, price: number) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.productId === productId ? { ...i, unitPrice: price, total: i.quantity * price } : i
      ),
    })),

  setDiscount: (amount: number) => set({ discount: amount }),
  setCustomer: (name: string, phone: string) => set({ customerName: name, customerPhone: phone }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  clearCart: () => set({ items: [], discount: 0, customerName: "", customerPhone: "", paymentMethod: "cash" }),

  subtotal: () => get().items.reduce((s, i) => s + i.total, 0),
  total: () => get().subtotal() - get().discount,
}));
