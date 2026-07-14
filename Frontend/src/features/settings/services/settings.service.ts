import { axiosInstance } from "../../../services/axios";
import type { AppSettings } from "../../../types/common";
import { MOCK_SETTINGS } from "../../../mocks/data";

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    // In production:
    // const res = await axiosInstance.get<AppSettings>("/settings");
    // return res.data;
    return MOCK_SETTINGS;
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    // In production:
    // const res = await axiosInstance.patch<AppSettings>("/settings", settings);
    // return res.data;
    return settings;
  },
};
