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

// --- Leave management ---
export const getLeavePolicy = () => api.get("/leaves/policy").then((r) => r.data);

export const getLeaveProfile = (empNo) => api.get(`/leaves/profile/${encodeURIComponent(empNo)}`).then((r) => r.data);

export const updateLeaveProfile = (empNo, data) =>
  api.put(`/leaves/profile/${encodeURIComponent(empNo)}`, data).then((r) => r.data);

// Lightweight endpoint any HR role that can edit employees can use — doesn't
// require the fuller leave-profile permission, so date of birth can be set
// for every employee regardless of their leave setup.
export const updateEmployeeBirthDate = (empNo, birthDate) =>
  api.put(`/employees/${encodeURIComponent(empNo)}/birthdate`, { birthDate }).then((r) => r.data);

export const getLeaveBalance = (empNo) =>
  api.get("/leaves/balance", { params: empNo ? { empNo } : {} }).then((r) => r.data);

export const previewLeaveDays = (startDate, endDate) =>
  api.get("/leaves/preview", { params: { startDate, endDate } }).then((r) => r.data);

export const createLeaveRequest = (data) => api.post("/leaves/requests", data).then((r) => r.data);

export const getMyLeaveRequests = (empNo, months) =>
  api.get("/leaves/requests/mine", { params: { ...(empNo ? { empNo } : {}), ...(months ? { months } : {}) } }).then((r) => r.data);

export const getLeaveNotifications = (empNo) =>
  api.get("/leaves/notifications", { params: empNo ? { empNo } : {} }).then((r) => r.data);

export const ackLeaveRequest = (id, empNo) =>
  api.post(`/leaves/requests/${id}/ack`, {}, { params: empNo ? { empNo } : {} }).then((r) => r.data);

export const getAllLeaveRequests = (status) =>
  api.get("/leaves/requests", { params: status ? { status } : {} }).then((r) => r.data);

export const decideLeaveRequest = (id, decision, note) =>
  api.put(`/leaves/requests/${id}/decision`, { decision, note }).then((r) => r.data);

export const checkLeaveCapacity = (startDate, endDate, empNo) =>
  api.get("/leaves/capacity-check", { params: { startDate, endDate, ...(empNo ? { empNo } : {}) } }).then((r) => r.data);

export const getAvailabilityCalendar = (year, month, departmentId) =>
  api.get("/leaves/availability", { params: { year, month, ...(departmentId ? { departmentId } : {}) } }).then((r) => r.data);

// --- Departments ---
export const getDepartments = () => api.get("/departments").then((r) => r.data);
export const getMyDepartment = () => api.get("/departments/mine").then((r) => r.data);
export const getDepartmentEmployees = (id) => api.get(`/departments/${id}/employees`).then((r) => r.data);
export const createDepartment = (data) => api.post("/departments", data).then((r) => r.data);
export const updateDepartment = (id, data) => api.put(`/departments/${id}`, data).then((r) => r.data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`).then((r) => r.data);

// --- Notifications & announcements ---
export const getNotifications = () => api.get("/notifications").then((r) => r.data);
export const createAnnouncement = (data) => api.post("/notifications/announcements", data).then((r) => r.data);
export const deleteAnnouncement = (id) => api.delete(`/notifications/announcements/${id}`).then((r) => r.data);

export default api;
