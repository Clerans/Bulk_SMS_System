export interface SmsGateway {
  id: number;
  name: string;
  abbr: string;
  status: "active" | "inactive";
  latency: string;
  health: number;
  successRate: number;
  dailyUsage: number;
  maxDaily: number;
  color: string;
}

export interface ApiKey {
  name: string;
  key: string;
  created: string;
  lastUsed: string;
}

export interface SecuritySetting {
  label: string;
  desc: string;
  enabled: boolean;
}

export interface CompanyInfo {
  name: string;
  email: string;
  phone: string;
  country: string;
  timezone: string;
  industry: string;
}

const initialGateways: SmsGateway[] = [
  { id: 1, name: "Notify.lk", abbr: "NL", status: "active", latency: "45ms", health: 99.2, successRate: 98.7, dailyUsage: 45230, maxDaily: 100000, color: "#8EA58C" },
  { id: 2, name: "Twilio", abbr: "TW", status: "active", latency: "120ms", health: 98.5, successRate: 97.3, dailyUsage: 12800, maxDaily: 50000, color: "#F22F46" },
  { id: 3, name: "Infobip", abbr: "IB", status: "active", latency: "89ms", health: 99.8, successRate: 99.1, dailyUsage: 8950, maxDaily: 75000, color: "#FF6B35" },
  { id: 4, name: "Vonage", abbr: "VN", status: "inactive", latency: "—", health: 0, successRate: 95.8, dailyUsage: 0, maxDaily: 30000, color: "#5D3FD3" },
  { id: 5, name: "AWS SNS", abbr: "AWS", status: "active", latency: "210ms", health: 96.5, successRate: 96.5, dailyUsage: 3420, maxDaily: 200000, color: "#FF9900" },
];

const initialApiKeys: ApiKey[] = [
  { name: "Production Key", key: "sk_live_••••••••••••••••••••4a2c", created: "2024-09-01", lastUsed: "2 hours ago" },
  { name: "Staging Key", key: "sk_test_••••••••••••••••••••8f3d", created: "2024-10-15", lastUsed: "3 days ago" },
];

const initialSecurity: SecuritySetting[] = [
  { label: "Two-Factor Authentication", desc: "Require 2FA for all admin logins", enabled: true },
  { label: "Login Notifications", desc: "Send email alerts on new logins", enabled: true },
  { label: "IP Whitelist", desc: "Restrict access to specific IP addresses", enabled: false },
  { label: "Session Timeout", desc: "Automatically logout after 30 minutes of inactivity", enabled: true },
];

const initialCompany: CompanyInfo = {
  name: "TechRetail Lanka (Pvt) Ltd",
  email: "admin@techretail.lk",
  phone: "+94 11 234 5678",
  country: "Sri Lanka",
  timezone: "Asia/Colombo (UTC+5:30)",
  industry: "Retail / E-commerce",
};

const getGateways = (): SmsGateway[] => {
  const data = localStorage.getItem("mock_gateways");
  if (!data) {
    localStorage.setItem("mock_gateways", JSON.stringify(initialGateways));
    return initialGateways;
  }
  return JSON.parse(data);
};

const saveGateways = (list: SmsGateway[]) => {
  localStorage.setItem("mock_gateways", JSON.stringify(list));
};

const getSecurity = (): SecuritySetting[] => {
  const data = localStorage.getItem("mock_security");
  if (!data) {
    localStorage.setItem("mock_security", JSON.stringify(initialSecurity));
    return initialSecurity;
  }
  return JSON.parse(data);
};

const saveSecurity = (list: SecuritySetting[]) => {
  localStorage.setItem("mock_security", JSON.stringify(list));
};

export const settingsApi = {
  getGateways: async (): Promise<SmsGateway[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getGateways()), 400);
    });
  },

  updateGatewayStatus: async (id: number, status: "active" | "inactive"): Promise<SmsGateway> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getGateways();
        const idx = list.findIndex(g => g.id === id);
        if (idx > -1) {
          list[idx].status = status;
          if (status === "inactive") {
            list[idx].latency = "—";
            list[idx].health = 0;
            list[idx].dailyUsage = 0;
          } else {
            list[idx].latency = "50ms";
            list[idx].health = 100;
          }
          saveGateways(list);
          resolve(list[idx]);
        } else {
          reject(new Error("Gateway not found"));
        }
      }, 300);
    });
  },

  getApiKeys: async (): Promise<ApiKey[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(initialApiKeys), 300);
    });
  },

  getSecuritySettings: async (): Promise<SecuritySetting[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getSecurity()), 300);
    });
  },

  toggleSecuritySetting: async (label: string): Promise<SecuritySetting[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getSecurity();
        const idx = list.findIndex(s => s.label === label);
        if (idx > -1) {
          list[idx].enabled = !list[idx].enabled;
          saveSecurity(list);
        }
        resolve(list);
      }, 250);
    });
  },

  getCompanyInfo: async (): Promise<CompanyInfo> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const saved = localStorage.getItem("mock_company_info");
        resolve(saved ? JSON.parse(saved) : initialCompany);
      }, 300);
    });
  },

  updateCompanyInfo: async (info: CompanyInfo): Promise<CompanyInfo> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem("mock_company_info", JSON.stringify(info));
        resolve(info);
      }, 400);
    });
  },
};
