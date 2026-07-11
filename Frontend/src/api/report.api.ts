export interface SmsUsageTrend {
  date: string;
  sent: number;
  delivered: number;
}

export interface GatewayPerformance {
  name: string;
  success: number;
  failed: number;
}

export interface CampaignStatusDistribution {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyCostBreakdown {
  month: string;
  cost: number;
}

export interface AuditLog {
  id: number;
  action: string;
  user: string;
  detail: string;
  timestamp: string;
  type: "create" | "send" | "import" | "login" | "logout" | "delete" | "permission" | "update";
}

const smsUsageData: SmsUsageTrend[] = [
  { date: "Dec 10", sent: 8200, delivered: 7900 },
  { date: "Dec 14", sent: 12400, delivered: 11900 },
  { date: "Dec 18", sent: 15200, delivered: 14600 },
  { date: "Dec 22", sent: 18900, delivered: 18100 },
  { date: "Dec 26", sent: 14500, delivered: 13900 },
  { date: "Dec 30", sent: 31200, delivered: 29800 },
  { date: "Jan 1", sent: 45800, delivered: 44200 },
  { date: "Jan 3", sent: 28600, delivered: 27500 },
  { date: "Jan 5", sent: 22400, delivered: 21600 },
  { date: "Jan 7", sent: 18900, delivered: 18200 },
  { date: "Jan 9", sent: 24100, delivered: 23200 },
];

const gatewayPerfData: GatewayPerformance[] = [
  { name: "Notify.lk", success: 98.7, failed: 1.3 },
  { name: "Twilio", success: 97.3, failed: 2.7 },
  { name: "Infobip", success: 99.1, failed: 0.9 },
  { name: "Vonage", success: 95.8, failed: 4.2 },
  { name: "AWS SNS", success: 96.5, failed: 3.5 },
];

const statusDist: CampaignStatusDistribution[] = [
  { name: "Completed", value: 198, color: "#22C55E" },
  { name: "Failed", value: 14, color: "#EF4444" },
  { name: "Sending", value: 3, color: "#3B82F6" },
  { name: "Draft", value: 12, color: "#94A3B8" },
  { name: "Queued", value: 8, color: "#F59E0B" },
  { name: "Other", value: 12, color: "#8EA58C" },
];

const monthlyCostData: MonthlyCostBreakdown[] = [
  { month: "Aug", cost: 1820 },
  { month: "Sep", cost: 2340 },
  { month: "Oct", cost: 1980 },
  { month: "Nov", cost: 3120 },
  { month: "Dec", cost: 4560 },
  { month: "Jan", cost: 2890 },
];

const auditLogs: AuditLog[] = [
  { id: 1, action: "Campaign Created", user: "Sarah K.", detail: "Created campaign \"Holiday Season Greetings\"", timestamp: "2025-01-09 15:42:00", type: "create" },
  { id: 2, action: "Campaign Dispatched", user: "James L.", detail: "Dispatched \"Flash Sale Alert\" to 5,200 recipients", timestamp: "2025-01-09 14:30:00", type: "send" },
  { id: 3, action: "Customer Import", user: "Emma R.", detail: "Imported 847 contacts to \"Subscribers\" group", timestamp: "2025-01-09 12:15:00", type: "import" },
  { id: 4, action: "User Login", user: "Admin", detail: "Logged in from IP 192.168.1.45", timestamp: "2025-01-09 09:00:00", type: "login" },
  { id: 5, action: "Campaign Deleted", user: "Mike T.", detail: "Deleted campaign \"Old Promo December\"", timestamp: "2025-01-08 17:22:00", type: "delete" },
  { id: 6, action: "Permission Changed", user: "Admin", detail: "Updated role permissions for \"Campaign Manager\"", timestamp: "2025-01-08 16:00:00", type: "permission" },
  { id: 7, action: "User Logout", user: "Lisa M.", detail: "Session ended for lisa@company.com", timestamp: "2025-01-08 15:30:00", type: "logout" },
  { id: 8, action: "Gateway Updated", user: "Admin", detail: "Updated Notify.lk API credentials and timeout settings", timestamp: "2025-01-07 11:00:00", type: "update" },
];

export const reportApi = {
  getSmsUsageTrend: async (): Promise<SmsUsageTrend[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(smsUsageData), 300);
    });
  },

  getGatewayPerformance: async (): Promise<GatewayPerformance[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(gatewayPerfData), 300);
    });
  },

  getCampaignStatusDistribution: async (): Promise<CampaignStatusDistribution[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(statusDist), 300);
    });
  },

  getMonthlyCostBreakdown: async (): Promise<MonthlyCostBreakdown[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(monthlyCostData), 300);
    });
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(auditLogs), 400);
    });
  },
};
