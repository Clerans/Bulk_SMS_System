import { axiosInstance } from "./axios";
import type { SMSTemplate } from "../types/common";

export const templateService = {
  async getTemplates(): Promise<SMSTemplate[]> {
    const res = await axiosInstance.get<any>("/templates");
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  async createTemplate(data: Omit<SMSTemplate, "id" | "createdAt">): Promise<SMSTemplate> {
    const payload = {
      title: data.name,
      category: data.category,
      message: data.message,
    };
    const res = await axiosInstance.post<any>("/templates", payload);
    return res.data?.data || res.data;
  },

  async updateTemplate(id: string, data: Partial<Omit<SMSTemplate, "id" | "createdAt">>): Promise<SMSTemplate> {
    const payload: any = {};
    if (data.name !== undefined) payload.title = data.name;
    if (data.category !== undefined) payload.category = data.category;
    if (data.message !== undefined) payload.message = data.message;
    const res = await axiosInstance.put<any>(`/templates/${id}`, payload);
    return res.data?.data || res.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await axiosInstance.delete(`/templates/${id}`);
  },
};
