import { axiosInstance } from "../../../services/axios";
import type { Campaign } from "../../../types/common";
import { MOCK_CAMPAIGNS } from "../../../mocks/data";

export const campaignsService = {
  async getCampaigns(): Promise<Campaign[]> {
    // In production:
    // const res = await axiosInstance.get<Campaign[]>("/campaigns");
    // return res.data;
    return MOCK_CAMPAIGNS;
  },

  async getCampaign(id: string): Promise<Campaign | undefined> {
    // In production:
    // const res = await axiosInstance.get<Campaign>(`/campaigns/${id}`);
    // return res.data;
    return MOCK_CAMPAIGNS.find((c) => c.id === id);
  },

  async retryFailed(id: string): Promise<void> {
    // In production:
    // await axiosInstance.post(`/campaigns/${id}/retry-failed`);
    await new Promise<void>((r) => setTimeout(r, 500));
  },

  async createCampaign(data: any): Promise<void> {
    // In production:
    // await axiosInstance.post("/campaigns", data);
    await new Promise<void>((r) => setTimeout(r, 1200));
  },
};
