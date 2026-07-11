export type CampaignStatus =
  | "draft" | "queued" | "sending" | "running" | "completed"
  | "failed" | "cancelled" | "paused" | "scheduled";

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  status: CampaignStatus;
  senderId: string;
  group?: string;
  recipients: number;
  delivered: number;
  pending: number;
  failed: number;
  cost: number;
  createdBy: string;
  createdDate: string;
  priority?: "Low" | "Normal" | "High";
  messageBody?: string;
  scheduleMode?: "now" | "later" | "recurring";
  scheduleDate?: string;
  scheduleTime?: string;
  recipientMode?: "group" | "csv" | "manual";
  customerGroup?: string;
  manualRecipients?: string;
  trackDelivery?: boolean;
  retryFailed?: boolean;
  removeDuplicates?: boolean;
  businessHoursOnly?: boolean;
}

// Initial mock data from App.tsx
const initialCampaigns: Campaign[] = [
  { id: 1, name: "Black Friday Mega Sale", status: "completed", senderId: "SHOPFAST", group: "All Customers", recipients: 45230, delivered: 43120, pending: 0, failed: 2110, cost: 226.15, createdBy: "Sarah K.", createdDate: "2024-11-29", priority: "High", messageBody: "Hi {name}! Get 20% OFF with code SAVE20. Valid until Jan 31, 2025. Shop now!", scheduleMode: "now" },
  { id: 2, name: "Holiday Season Greetings", status: "sending", senderId: "SHOPFAST", group: "VIP Members", recipients: 8540, delivered: 6120, pending: 2300, failed: 120, cost: 42.70, createdBy: "James L.", createdDate: "2024-12-15", priority: "Normal" },
  { id: 3, name: "OTP Verification Service", status: "running", senderId: "AUTHSVC", group: "Active Users", recipients: 12000, delivered: 11800, pending: 150, failed: 50, cost: 60.00, createdBy: "Admin", createdDate: "2024-12-20", priority: "High" },
  { id: 4, name: "January Newsletter", status: "draft", senderId: "SHOPFAST", group: "Subscribers", recipients: 24800, delivered: 0, pending: 0, failed: 0, cost: 0, createdBy: "Emma R.", createdDate: "2025-01-05", priority: "Normal" },
  { id: 5, name: "Flash Sale Alert", status: "queued", senderId: "SHOPFAST", group: "Premium Users", recipients: 5200, delivered: 0, pending: 5200, failed: 0, cost: 26.00, createdBy: "Mike T.", createdDate: "2025-01-08", priority: "High" },
  { id: 6, name: "Account Security Alert", status: "failed", senderId: "SECALERT", group: "All Users", recipients: 32000, delivered: 28000, pending: 0, failed: 4000, cost: 160.00, createdBy: "Admin", createdDate: "2025-01-02", priority: "High" },
  { id: 7, name: "New Year Promo 2025", status: "completed", senderId: "SHOPFAST", group: "All Customers", recipients: 67890, delivered: 65432, pending: 0, failed: 2458, cost: 327.16, createdBy: "Sarah K.", createdDate: "2024-12-31", priority: "Normal" },
  { id: 8, name: "Survey Invitation", status: "paused", senderId: "SURVEY", group: "Recent Buyers", recipients: 9800, delivered: 4200, pending: 5600, failed: 0, cost: 49.00, createdBy: "Lisa M.", createdDate: "2025-01-06", priority: "Normal" },
  { id: 9, name: "Premium Renewal Reminder", status: "scheduled", senderId: "SHOPFAST", group: "VIP Members", recipients: 2340, delivered: 0, pending: 2340, failed: 0, cost: 11.70, createdBy: "James L.", createdDate: "2025-01-09", priority: "Normal" },
  { id: 10, name: "App Update Notification", status: "cancelled", senderId: "TECHSVC", group: "App Users", recipients: 15600, delivered: 0, pending: 0, failed: 0, cost: 0, createdBy: "Dev Team", createdDate: "2025-01-04", priority: "Low" },
];

export interface DeliveryLog {
  id: number;
  recipient: string;
  phone: string;
  status: "delivered" | "pending" | "failed";
  gateway: string;
  timestamp: string;
  retry: number;
  latency: string;
  response: string;
}

const initialDeliveryLogs: DeliveryLog[] = [
  { id: 1, recipient: "Kamal Perera", phone: "+94771234567", status: "delivered", gateway: "Notify.lk", timestamp: "2025-01-09 14:23:45", retry: 0, latency: "340ms", response: "OK" },
  { id: 2, recipient: "Nimali Silva", phone: "+94712345678", status: "delivered", gateway: "Notify.lk", timestamp: "2025-01-09 14:23:47", retry: 0, latency: "290ms", response: "OK" },
  { id: 3, recipient: "Rohan Fernando", phone: "+94759876543", status: "failed", gateway: "Twilio", timestamp: "2025-01-09 14:23:51", retry: 2, latency: "—", response: "Invalid number" },
  { id: 4, recipient: "Sanduni Bandara", phone: "+94772345678", status: "pending", gateway: "Infobip", timestamp: "2025-01-09 14:23:52", retry: 0, latency: "—", response: "Queued" },
  { id: 5, recipient: "Tharaka Wijesinghe", phone: "+94765432109", status: "delivered", gateway: "Notify.lk", timestamp: "2025-01-09 14:23:55", retry: 0, latency: "410ms", response: "OK" },
  { id: 6, recipient: "Dilshan Rajapaksa", phone: "+94784567890", status: "delivered", gateway: "Notify.lk", timestamp: "2025-01-09 14:23:58", retry: 0, latency: "315ms", response: "OK" },
  { id: 7, recipient: "Priya Sharma", phone: "+94718765432", status: "failed", gateway: "AWS SNS", timestamp: "2025-01-09 14:24:02", retry: 3, latency: "—", response: "DND active" },
  { id: 8, recipient: "Ruwan Dissanayake", phone: "+94776543210", status: "delivered", gateway: "Twilio", timestamp: "2025-01-09 14:24:05", retry: 0, latency: "680ms", response: "OK" },
];

// Read/write to localStorage helper so data persists during active mock testing
const getCampaigns = (): Campaign[] => {
  const data = localStorage.getItem("mock_campaigns");
  if (!data) {
    localStorage.setItem("mock_campaigns", JSON.stringify(initialCampaigns));
    return initialCampaigns;
  }
  return JSON.parse(data);
};

const saveCampaigns = (list: Campaign[]) => {
  localStorage.setItem("mock_campaigns", JSON.stringify(list));
};

const getDeliveryLogs = (): DeliveryLog[] => {
  const data = localStorage.getItem("mock_delivery_logs");
  if (!data) {
    localStorage.setItem("mock_delivery_logs", JSON.stringify(initialDeliveryLogs));
    return initialDeliveryLogs;
  }
  return JSON.parse(data);
};

export const campaignApi = {
  list: async (): Promise<Campaign[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getCampaigns()), 500);
    });
  },

  getById: async (id: number): Promise<Campaign | undefined> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const item = getCampaigns().find((c) => c.id === id);
        resolve(item);
      }, 300);
    });
  },

  create: async (payload: Omit<Campaign, "id" | "delivered" | "pending" | "failed" | "cost" | "createdBy" | "createdDate" | "status">): Promise<Campaign> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getCampaigns();
        const segments = Math.ceil((payload.messageBody?.length || 0) / 160) || 1;
        const count = payload.recipients || 67890;
        const newCampaign: Campaign = {
          ...payload,
          id: list.length + 1,
          status: payload.scheduleMode === "now" ? "sending" : payload.scheduleMode === "later" ? "scheduled" : "draft",
          group: payload.customerGroup || (payload.recipientMode === "manual" ? "Manual Contacts" : "CSV Upload"),
          recipients: count,
          delivered: payload.scheduleMode === "now" ? Math.round(count * 0.9) : 0,
          pending: payload.scheduleMode === "now" ? Math.round(count * 0.1) : count,
          failed: 0,
          cost: count * segments * 0.005,
          createdBy: "Sarah K.",
          createdDate: new Date().toISOString().split("T")[0],
        };
        list.unshift(newCampaign);
        saveCampaigns(list);
        resolve(newCampaign);
      }, 800);
    });
  },

  updateStatus: async (id: number, status: CampaignStatus): Promise<Campaign> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getCampaigns();
        const idx = list.findIndex((c) => c.id === id);
        if (idx > -1) {
          list[idx].status = status;
          saveCampaigns(list);
          resolve(list[idx]);
        } else {
          reject(new Error("Campaign not found"));
        }
      }, 300);
    });
  },

  delete: async (id: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getCampaigns().filter((c) => c.id !== id);
        saveCampaigns(list);
        resolve();
      }, 400);
    });
  },

  getDeliveryLogs: async (): Promise<DeliveryLog[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getDeliveryLogs()), 400);
    });
  },
};
