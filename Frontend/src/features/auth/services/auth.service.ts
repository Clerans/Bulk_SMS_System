import { axiosInstance } from "../../../services/axios";
import type { LoginRequest, LoginResponse } from "../../../types/common";

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    // In production:
    // const response = await axiosInstance.post<LoginResponse>("/auth/login", data);
    // return response.data;

    // Mock implementation mirroring current logic:
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    if (!data.email || !data.email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    return {
      token: "session_token_replace_with_real",
      user: {
        id: "usr_01",
        name: "Anika Perera",
        email: data.email,
        role: "ADMIN",
      },
    };
  },
};
