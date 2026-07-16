import { axiosInstance } from "./axios";
import type { Campaign } from "../types/common";

export const campaignService = {
  async getCampaigns(): Promise<Campaign[]> {
    const res = await axiosInstance.get<any>("/campaigns");
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  async getCampaign(id: string): Promise<Campaign> {
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
