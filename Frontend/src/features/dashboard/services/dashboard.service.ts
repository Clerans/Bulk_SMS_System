import { axiosInstance } from "../../../services/axios";
import type { DashboardSummary, DeliveryTrend } from "../../../types/common";
import { MOCK_SUMMARY, MOCK_TREND } from "../../../mocks/data";

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    // In production:
    // const res = await axiosInstance.get<DashboardSummary>("/dashboard/summary");
    // return res.data;
    return MOCK_SUMMARY;
  },

  async getDeliveryTrend(range: string = "30d"): Promise<DeliveryTrend[]> {
    // In production:
    // const res = await axiosInstance.get<DeliveryTrend[]>(`/dashboard/delivery-trend?range=${range}`);
    // return res.data;
    return MOCK_TREND;
  },
};
