import { axiosInstance } from "../../../services/axios";
import type { Campaign } from "../../../types/common";
import { MOCK_CAMPAIGNS } from "../../../mocks/data";

export const campaignsService = {
  async getCampaigns(): Promise<Campaign[]> {
    const res = await axiosInstance.get<Campaign[]>("/campaigns");
    return res.data;
  },

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const res = await axiosInstance.get<Campaign>(`/campaigns/${id}`);
    return res.data;
  },

  async retryFailed(id: string): Promise<void> {
    await axiosInstance.post(`/campaigns/${id}/retry-failed`);
  },

  async createCampaign(data: any): Promise<void> {
    await axiosInstance.post("/campaigns", data);
  },
};
