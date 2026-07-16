import { axiosInstance } from "./axios";
import type { DashboardSummary, DeliveryTrend } from "../types/common";

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    const res = await axiosInstance.get<DashboardSummary>("/dashboard/summary");
    return res.data;
  },

  async getDeliveryTrend(range: string = "30d"): Promise<DeliveryTrend[]> {
    const res = await axiosInstance.get<any>(`/dashboard/delivery-trend?range=${range}`);
    return Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
  },
};
