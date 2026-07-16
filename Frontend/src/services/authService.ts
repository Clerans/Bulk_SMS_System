import { axiosInstance } from "./axios";
import type { LoginRequest, LoginResponse } from "../types/common";

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>("/auth/login", data);
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<{ token: string; refresh_token: string }> {
    const response = await axiosInstance.post("/auth/refresh", { refresh_token: refreshToken }, {
      headers: {
        Authorization: "",
      }
    });
    return response.data;
  }
};
