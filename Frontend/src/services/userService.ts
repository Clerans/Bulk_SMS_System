import { axiosInstance } from "./axios";
import type { User, CreateUserRequest, UpdateUserRequest } from "../types/common";

export interface UsersResponse {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}

export const userService = {
  async getUsers(params?: { skip?: number; limit?: number; search?: string; role?: string; status?: string }): Promise<UsersResponse> {
    const res = await axiosInstance.get<any>("/users", { params });
    const data = res.data;
    if (data && Array.isArray(data.items)) {
      return data;
    }
    if (data?.data && Array.isArray(data.data.items)) {
      return data.data;
    }
    if (Array.isArray(data)) {
      return { items: data, total: data.length, skip: 0, limit: data.length };
    }
    return { items: [], total: 0, skip: 0, limit: 10 };
  },

  async createUser(data: CreateUserRequest): Promise<User> {
    const res = await axiosInstance.post<any>("/users", data);
    return res.data?.data || res.data;
  },

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const res = await axiosInstance.put<any>(`/users/${id}`, data);
    return res.data?.data || res.data;
  },

  async deleteUser(id: string): Promise<void> {
    await axiosInstance.delete(`/users/${id}`);
  }
};
