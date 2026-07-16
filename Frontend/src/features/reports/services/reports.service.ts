import { axiosInstance } from "../../../services/axios";
import type { DeliveryReport } from "../../../types/common";
import { MOCK_REPORTS } from "../../../mocks/data";

export const reportsService = {
  async getReports(): Promise<DeliveryReport[]> {
    const res = await axiosInstance.get<DeliveryReport[]>("/delivery-reports");
    return res.data;
  },

  async exportCsv(): Promise<void> {
    window.open(`${axiosInstance.defaults.baseURL}/delivery-reports/export`);
  },
};
