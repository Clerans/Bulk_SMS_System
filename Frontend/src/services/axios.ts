import axios from "axios";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach token if available
axiosInstance.interceptors.request.use(
  (config) => {
    try {
      const stored = sessionStorage.getItem("sms_auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        const token = parsed.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parsing errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle errors cleanly & unpack standard JSON envelope
axiosInstance.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && response.data.success !== undefined) {
      if (response.data.success) {
        response.data = response.data.data;
      } else {
        return Promise.reject(new Error(response.data.message || "Request failed"));
      }
    }
    return response;
  },
  (error) => {
    const message = error.response?.data?.message ?? error.message ?? "Request failed";
    return Promise.reject(new Error(message));
  }
);
