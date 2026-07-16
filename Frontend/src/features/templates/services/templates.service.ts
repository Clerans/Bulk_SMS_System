import { axiosInstance } from "../../../services/axios";
import type { SMSTemplate } from "../../../types/common";
import { MOCK_TEMPLATES } from "../../../mocks/data";

export const templatesService = {
  async getTemplates(): Promise<SMSTemplate[]> {
    const res = await axiosInstance.get<SMSTemplate[]>("/templates");
    return res.data;
  },

  async createTemplate(data: Omit<SMSTemplate, "id" | "createdAt">): Promise<SMSTemplate> {
    const res = await axiosInstance.post<SMSTemplate>("/templates", data);
    return res.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await axiosInstance.delete(`/templates/${id}`);
  },
};
