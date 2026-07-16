import { axiosInstance } from "./axios";
import type { DeliveryReport } from "../types/common";

export const reportService = {
  async getReports(params?: { campaignId?: string; status?: string; search?: string }): Promise<DeliveryReport[]> {
    const res = await axiosInstance.get<any>("/delivery-reports", { params });
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },

  async exportCsv(): Promise<void> {
    window.open(`${axiosInstance.defaults.baseURL}/delivery-reports/export`);
  },
};
