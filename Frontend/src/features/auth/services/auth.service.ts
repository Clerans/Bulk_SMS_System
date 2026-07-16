import { axiosInstance } from "../../../services/axios";
import type { LoginRequest, LoginResponse } from "../../../types/common";

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>("/auth/login", data);
    return response.data;
  },
};
