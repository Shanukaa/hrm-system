import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const TOKEN_KEY = "hrm_token";

// withCredentials so the browser sends/receives the httpOnly session cookie
// set by the backend on login — this is the preferred mechanism and works
// transparently in most browsers. It's not enough on its own though: Safari
// (iOS in particular) fully blocks cookies between different root domains
// regardless of SameSite/Secure, which a split frontend+backend deployment
// runs into. So we also keep a copy of the token in sessionStorage (cleared
// when the tab closes — deliberately not localStorage, to limit how long
// it's readable if an XSS bug is ever introduced) and attach it as a
// fallback Authorization header on every request. Browsers where the
// cookie works ignore the extra header; browsers where it doesn't get one
// anyway.
const api = axios.create({ baseURL: API_BASE, withCredentials: true });

export function setAuthToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Central 401 handling: if a call ever comes back unauthenticated (expired
// or missing session), clear the cached user display info and send the
// user to /login. The actual session cookie is cleared server-side on
// logout / left to expire naturally otherwise.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("hrm_user");
      setAuthToken(null);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// --- Auth ---
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => {
    setAuthToken(r.data.token);
    return r.data;
  });
export const logoutRequest = () => api.post("/auth/logout").catch(() => {}).finally(() => setAuthToken(null));
export const getMe = () => api.get("/auth/me").then((r) => r.data);

// --- Users (admin only) ---
export const getUsers = () => api.get("/users").then((r) => r.data);
export const getRoles = () => api.get("/users/roles").then((r) => r.data);
export const createUser = (data) => api.post("/users", data).then((r) => r.data);
export const updateUser = (id, data) => api.put(`/users/${encodeURIComponent(id)}`, data).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/users/${encodeURIComponent(id)}`);

// --- Audit logs ---
export const getLogs = (limit) => api.get("/logs", { params: limit ? { limit } : {} }).then((r) => r.data);

export const getLogsPaged = ({ page, pageSize, search }) =>
  api.get("/logs", { params: { page, pageSize, ...(search ? { search } : {}) } }).then((r) => r.data);

export const getEmployees = () => api.get("/employees").then((r) => r.data);

export const getEmployeesPaged = ({ page, pageSize, search }) =>
  api.get("/employees", { params: { page, pageSize, ...(search ? { search } : {}) } }).then((r) => r.data);

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

// Admin/HR-manager only: clears a locked payslip snapshot so the next
// download re-locks against the employee's current data. Use this to
// correct a payslip that was generated with wrong figures.
export const unlockPayslip = (empNo, period) =>
  api.delete(`/payslips/${encodeURIComponent(empNo)}/snapshot`, { params: { period } }).then((r) => r.data);

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
export const updateLeavePolicy = (data) => api.put("/leaves/policy", data).then((r) => r.data);

// --- Public holidays ---
export const getHolidays = () => api.get("/holidays").then((r) => r.data);
export const createHoliday = (data) => api.post("/holidays", data).then((r) => r.data);
export const deleteHoliday = (id) => api.delete(`/holidays/${id}`).then((r) => r.data);

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

export const withdrawLeaveRequest = (id, empNo) =>
  api.post(`/leaves/requests/${id}/withdraw`, empNo ? { empNo } : {}).then((r) => r.data);

export const getAllLeaveRequests = (status) =>
  api.get("/leaves/requests", { params: status ? { status } : {} }).then((r) => r.data);

export const getAllLeaveRequestsPaged = ({ status, page, pageSize, empNos }) =>
  api
    .get("/leaves/requests", {
      params: { page, pageSize, ...(status ? { status } : {}), ...(empNos !== undefined ? { empNos: empNos.join(",") } : {}) },
    })
    .then((r) => r.data);

export const decideLeaveRequest = (id, decision, note) =>
  api.put(`/leaves/requests/${id}/decision`, { decision, note }).then((r) => r.data);

export const getLeaveSummary = (empNos) =>
  api.get("/leaves/summary", { params: empNos !== undefined ? { empNos: empNos.join(",") } : {} }).then((r) => r.data);

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
