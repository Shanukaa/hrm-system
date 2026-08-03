import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const api = axios.create({ baseURL: API_BASE });

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

export const downloadPayslip = async (empNo, period) => {
  const res = await api.get(`/payslips/${encodeURIComponent(empNo)}`, {
    params: period ? { period } : {},
    responseType: "blob",
  });
  triggerDownload(res.data, `payslip-${empNo}.pdf`);
};

export const downloadAllPayslips = async (period, empNos) => {
  const res = await api.get(`/payslips`, {
    params: { ...(period ? { period } : {}), ...(empNos ? { empNos: empNos.join(",") } : {}) },
    responseType: "blob",
  });
  triggerDownload(res.data, `payslips.zip`);
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
