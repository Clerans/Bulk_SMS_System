import { axiosInstance } from "./axios";
import type { AppSettings } from "../types/common";

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    const res = await axiosInstance.get<AppSettings>("/settings");
    return res.data;
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const res = await axiosInstance.put<AppSettings>("/settings", settings);
    return res.data;
  },
};
