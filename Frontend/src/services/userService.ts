import { axiosInstance } from "./axios";
import type { User, CreateUserRequest, UpdateUserRequest } from "../types/common";

export interface UsersResponse {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}

export const userService = {
  async getUsers(params?: { skip?: number; limit?: number; search?: string; role?: string }): Promise<UsersResponse> {
    const res = await axiosInstance.get<{ success: boolean; data: UsersResponse }>("/users", { params });
    return res.data?.data || { items: [], total: 0, skip: 0, limit: 10 };
  },

  async createUser(data: CreateUserRequest): Promise<User> {
    const res = await axiosInstance.post<{ success: boolean; data: User }>("/users", data);
    return res.data.data;
  },

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const res = await axiosInstance.put<{ success: boolean; data: User }>(`/users/${id}`, data);
    return res.data.data;
  },

  async deleteUser(id: string): Promise<void> {
    await axiosInstance.delete(`/users/${id}`);
  }
};
