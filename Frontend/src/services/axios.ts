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

// Queue to hold requests failed with 401 while refreshing token
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

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
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is 401 Unauthorized and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If we are trying to refresh or log in, don't attempt to refresh again
      if (originalRequest.url?.includes("/auth/refresh") || originalRequest.url?.includes("/auth/login")) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const stored = sessionStorage.getItem("sms_auth");
        if (stored) {
          const parsed = JSON.parse(stored);
          const refreshToken = parsed.refresh_token;
          if (refreshToken) {
            // Call auth/refresh directly via raw axios to avoid interceptor loop
            const refreshRes = await axios.post(`${BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken
            });
            
            if (refreshRes.data && refreshRes.data.success) {
              const { token: newToken, refresh_token: newRefreshToken } = refreshRes.data.data;
              
              // Update storage
              parsed.token = newToken;
              parsed.refresh_token = newRefreshToken;
              sessionStorage.setItem("sms_auth", JSON.stringify(parsed));
              
              // Process queue
              processQueue(null, newToken);
              
              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axiosInstance(originalRequest);
            }
          }
        }
        throw new Error("No refresh token available");
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clean session and redirect/logout
        sessionStorage.removeItem("sms_auth");
        // Dispatch window event so hooks or components can detect session expiration
        window.dispatchEvent(new Event("sms_auth_expired"));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message = error.response?.data?.message ?? error.message ?? "Request failed";
    return Promise.reject(new Error(message));
  }
);
