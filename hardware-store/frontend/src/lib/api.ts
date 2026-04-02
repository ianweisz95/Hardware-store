import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
  const token = Cookies.get("accessToken") || localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

// Response interceptor — handle 401 and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === "TOKEN_EXPIRED" && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post("/auth/refresh");
        const { accessToken } = res.data.data;
        Cookies.set("accessToken", accessToken, { expires: 7, sameSite: "strict" });
        localStorage.setItem("accessToken", accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove("accessToken");
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ─── API helpers ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post("/auth/login", data),
  register: (data: any) => api.post("/auth/register", data),
  logout: () => api.post("/auth/logout"),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data: any) => api.put("/auth/profile", data),
  changePassword: (data: any) => api.put("/auth/password", data),
};

export const productApi = {
  getAll: (params?: any) => api.get("/products", { params }),
  getOne: (id: string) => api.get(`/products/${id}`),
  getByBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  create: (data: any) => api.post("/products", data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const inventoryApi = {
  getAll: (params?: any) => api.get("/inventory", { params }),
  adjust: (data: any) => api.post("/inventory/adjust", data),
  getMovements: (params?: any) => api.get("/inventory/movements", { params }),
};

export const posApi = {
  createSale: (data: any) => api.post("/pos/sale", data),
  getOrders: (params?: any) => api.get("/pos/orders", { params }),
  getDailySummary: (params?: any) => api.get("/pos/daily-summary", { params }),
  voidSale: (id: string, data: any) => api.put(`/pos/orders/${id}/void`, data),
};

export const paymentApi = {
  initiateMpesa: (data: any) => api.post("/payments/mpesa/initiate", data),
  queryStatus: (id: string) => api.get(`/payments/mpesa/${id}/status`),
  getAll: (params?: any) => api.get("/payments", { params }),
};

export const categoryApi = {
  getAll: () => api.get("/categories"),
  create: (data: any) => api.post("/categories", data),
};

export const supplierApi = {
  getAll: () => api.get("/suppliers"),
  create: (data: any) => api.post("/suppliers", data),
  update: (id: string, data: any) => api.put(`/suppliers/${id}`, data),
};

export const branchApi = {
  getAll: () => api.get("/branches"),
  create: (data: any) => api.post("/branches", data),
};

export const reportApi = {
  getSales: (params?: any) => api.get("/reports/sales", { params }),
  getTopProducts: (params?: any) => api.get("/reports/top-products", { params }),
};

export const userApi = {
  getAll: (params?: any) => api.get("/users", { params }),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
};
