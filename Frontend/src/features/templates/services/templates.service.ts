import { axiosInstance } from "../../../services/axios";
import type { SMSTemplate } from "../../../types/common";
import { MOCK_TEMPLATES } from "../../../mocks/data";

export const templatesService = {
  async getTemplates(): Promise<SMSTemplate[]> {
    // In production:
    // const res = await axiosInstance.get<SMSTemplate[]>("/templates");
    // return res.data;
    return MOCK_TEMPLATES;
  },

  async createTemplate(data: Omit<SMSTemplate, "id" | "createdAt">): Promise<SMSTemplate> {
    // In production:
    // const res = await axiosInstance.post<SMSTemplate>("/templates", data);
    // return res.data;
    return {
      id: `tpl_local_${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    };
  },

  async deleteTemplate(id: string): Promise<void> {
    // In production:
    // await axiosInstance.delete(`/templates/${id}`);
    await new Promise<void>((r) => setTimeout(r, 200));
  },
};
