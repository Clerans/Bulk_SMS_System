import { axiosInstance } from "../../../services/axios";
import type { DeliveryReport } from "../../../types/common";
import { MOCK_REPORTS } from "../../../mocks/data";

export const reportsService = {
  async getReports(): Promise<DeliveryReport[]> {
    // In production:
    // const res = await axiosInstance.get<DeliveryReport[]>("/delivery-reports");
    // return res.data;
    return MOCK_REPORTS;
  },

  async exportCsv(): Promise<void> {
    // In production:
    // window.open(`${axiosInstance.defaults.baseURL}/delivery-reports?export=csv`);
  },
};
