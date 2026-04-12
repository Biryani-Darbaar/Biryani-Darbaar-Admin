import axios from "axios";

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor — attach JWT on every request ────────────────────────
// Reading from localStorage on each request (rather than a one-time header set)
// ensures the token is always current, even after page reload or token refresh,
// without depending on AuthContext having already run its useEffect.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_access_token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — normalise errors + handle 401 ─────────────────────
// On 401 (token expired / invalid) we clear local auth state and redirect to
// /login so the admin never sees a broken dashboard.
// With the access token now set to 7 days this should be extremely rare.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear stored credentials and redirect to login page
      localStorage.removeItem("admin_access_token");
      localStorage.removeItem("admin_refresh_token");
      localStorage.removeItem("admin_user");
      delete api.defaults.headers.common["Authorization"];

      // Only redirect if not already on the login page
      if (!window.location.pathname.startsWith("/login")) {
        window.location.replace("/login");
      }
    }

    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "An unexpected error occurred";
    return Promise.reject(new Error(msg));
  }
);

export default api;

// ─────────────────────────────────────────────────────────────────────────────
// ── API helpers (one function per backend endpoint) ──────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Auth
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get("/admin/dashboard"),
};

// Orders
export const ordersAPI = {
  getAll:  (params = {}) => api.get("/admin/orders",      { params }),
  getLive: ()             => api.get("/admin/orders/live"),
  updateStatus: (id, orderStatus, userId) =>
    api.patch(`/admin/orders/${id}`, { orderStatus, userId }),
};

// Users
export const usersAPI = {
  getAll:       ()            => api.get("/admin/users"),
  getOrders:    (id)          => api.get(`/admin/users/${id}/orders`),
  updateWallet: (id, payload) => api.patch(`/admin/users/${id}/wallet`, payload),
};

// Dishes
export const dishesAPI = {
  getCategories:   () => api.get("/admin/dishes/categories"),
  createCategory:  (name) => api.post("/admin/dishes/categories", { name }),
  deleteCategory:  (name) => api.delete(`/admin/dishes/categories/${encodeURIComponent(name)}`),
  getByCategory:   (category) => api.get(`/admin/dishes/${encodeURIComponent(category)}`),
  add: (formData) =>
    api.post("/admin/dishes", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  // With a file: send FormData (multipart). Without a file: send JSON so booleans stay typed.
  update: (category, id, formDataOrJson, hasFile = false) =>
    hasFile
      ? api.put(`/admin/dishes/${encodeURIComponent(category)}/${id}`, formDataOrJson, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      : api.put(`/admin/dishes/${encodeURIComponent(category)}/${id}`, formDataOrJson),
  // Toggle availability via a JSON-only PUT (no file, so multer passes through)
  toggleAvailability: (category, id, available) =>
    api.put(`/admin/dishes/${encodeURIComponent(category)}/${id}`, { available }),
  delete: (category, id) =>
    api.delete(`/admin/dishes/${encodeURIComponent(category)}/${id}`),
};

// Special Offer Media
export const mediaAPI = {
  getAll: () => api.get("/admin/special-offer-media"),
  upload: (formData) =>
    api.post("/admin/special-offer-media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete:  (id)   => api.delete(`/admin/special-offer-media/${id}`),
  reorder: (items) => api.put("/admin/special-offer-media/reorder", { items }),
};

// Contact / Catering Responses
export const contactAPI = {
  getAll:    (params = {}) => api.get("/admin/contact-responses", { params }),
  markRead:  (id)          => api.patch(`/admin/contact-responses/${id}/read`),
  delete:    (id)          => api.delete(`/admin/contact-responses/${id}`),
};
