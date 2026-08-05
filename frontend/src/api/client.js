import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const TOKEN_KEY = "hrm_token";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Central 401 handling: if a call ever comes back unauthenticated (expired
// or missing token), clear the stored session and send the user to /login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("hrm_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// --- Auth ---
export const login = (email, password) => api.post("/auth/login", { email, password }).then((r) => r.data);
export const logoutRequest = () => api.post("/auth/logout").catch(() => {});
export const getMe = () => api.get("/auth/me").then((r) => r.data);

// --- Users (admin only) ---
export const getUsers = () => api.get("/users").then((r) => r.data);
export const getRoles = () => api.get("/users/roles").then((r) => r.data);
export const createUser = (data) => api.post("/users", data).then((r) => r.data);
export const updateUser = (id, data) => api.put(`/users/${encodeURIComponent(id)}`, data).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/users/${encodeURIComponent(id)}`);

// --- Audit logs ---
export const getLogs = (limit) => api.get("/logs", { params: limit ? { limit } : {} }).then((r) => r.data);

export const getEmployees = () => api.get("/employees").then((r) => r.data);

export const getEmployee = (empNo) => api.get(`/employees/${encodeURIComponent(empNo)}`).then((r) => r.data);

export const createEmployee = (data) => api.post("/employees", data).then((r) => r.data);

export const updateEmployee = (empNo, data) =>
  api.put(`/employees/${encodeURIComponent(empNo)}`, data).then((r) => r.data);

export const deleteEmployee = (empNo) => api.delete(`/employees/${encodeURIComponent(empNo)}`);

export const getDashboardSummary = () => api.get("/dashboard/summary").then((r) => r.data);

export const importFile = (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  return api
    .post("/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
    })
    .then((r) => r.data);
};

export const downloadPayslip = async (empNo, period, format) => {
  const res = await api.get(`/payslips/${encodeURIComponent(empNo)}`, {
    params: { ...(period ? { period } : {}), ...(format ? { format } : {}) },
    responseType: "blob",
  });
  triggerDownload(res.data, `payslip-${empNo}${format === "simple" ? "-simple" : ""}.pdf`);
};

export const downloadAllPayslips = async (period, empNos, format) => {
  const res = await api.get(`/payslips`, {
    params: {
      ...(period ? { period } : {}),
      ...(empNos ? { empNos: empNos.join(",") } : {}),
      ...(format ? { format } : {}),
    },
    responseType: "blob",
  });
  triggerDownload(res.data, `payslips${format === "simple" ? "-simple" : ""}.zip`);
};

function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default api;
