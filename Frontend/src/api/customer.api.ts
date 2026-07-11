import { Users, Star, Building2, AlignLeft, Target, Key } from "lucide-react";

export interface CustomerGroup {
  id: number;
  name: string;
  members: number;
  description: string;
  iconName: "Users" | "Star" | "Building2" | "AlignLeft" | "Target" | "Key";
  color: string;
  colorBg: string;
  campaigns: number;
  lastUsed: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  group: string;
  status: "active" | "inactive";
  added: string;
}

const initialGroups: CustomerGroup[] = [
  { id: 1, name: "VIP Members", members: 2847, description: "High-value customers with premium subscriptions", iconName: "Star", color: "#F59E0B", colorBg: "#FFFBEB", campaigns: 45, lastUsed: "2 days ago" },
  { id: 2, name: "Staff", members: 124, description: "All company staff and management personnel", iconName: "Building2", color: "#3B82F6", colorBg: "#EFF6FF", campaigns: 12, lastUsed: "1 week ago" },
  { id: 3, name: "General Customers", members: 67890, description: "Regular registered customer accounts", iconName: "Users", color: "#8EA58C", colorBg: "#F0F7EF", campaigns: 89, lastUsed: "Yesterday" },
  { id: 4, name: "Subscribers", members: 24567, description: "Newsletter and promotional SMS subscribers", iconName: "AlignLeft", color: "#A78BFA", colorBg: "#F5F3FF", campaigns: 67, lastUsed: "3 days ago" },
  { id: 5, name: "Owners", members: 38, description: "Business owners and franchise partners", iconName: "Key", color: "#EF4444", colorBg: "#FEF2F2", campaigns: 8, lastUsed: "2 weeks ago" },
  { id: 6, name: "Recent Buyers", members: 9823, description: "Customers who purchased in the last 30 days", iconName: "Target", color: "#22C55E", colorBg: "#F0FDF4", campaigns: 23, lastUsed: "Today" },
];

const initialCustomers: Customer[] = [
  { id: 1, name: "Kamal Perera", phone: "+94771234567", email: "kamal@email.com", group: "VIP Members", status: "active", added: "2024-09-12" },
  { id: 2, name: "Nimali Silva", phone: "+94712345678", email: "nimali@email.com", group: "General Customers", status: "active", added: "2024-10-01" },
  { id: 3, name: "Rohan Fernando", phone: "+94759876543", email: "rohan@email.com", group: "Subscribers", status: "inactive", added: "2024-08-20" },
  { id: 4, name: "Sanduni Bandara", phone: "+94772345678", email: "sanduni@email.com", group: "VIP Members", status: "active", added: "2024-11-05" },
  { id: 5, name: "Tharaka Wijesinghe", phone: "+94765432109", email: "tharaka@email.com", group: "Recent Buyers", status: "active", added: "2024-12-18" },
  { id: 6, name: "Dilshan Rajapaksa", phone: "+94784567890", email: "dilshan@email.com", group: "General Customers", status: "active", added: "2024-07-30" },
];

// Resolvers to icon component mapping
export const iconMap = {
  Users,
  Star,
  Building2,
  AlignLeft,
  Target,
  Key,
};

const getGroups = (): CustomerGroup[] => {
  const data = localStorage.getItem("mock_customer_groups");
  if (!data) {
    localStorage.setItem("mock_customer_groups", JSON.stringify(initialGroups));
    return initialGroups;
  }
  return JSON.parse(data);
};

const saveGroups = (list: CustomerGroup[]) => {
  localStorage.setItem("mock_customer_groups", JSON.stringify(list));
};

const getCustomers = (): Customer[] => {
  const data = localStorage.getItem("mock_customers");
  if (!data) {
    localStorage.setItem("mock_customers", JSON.stringify(initialCustomers));
    return initialCustomers;
  }
  return JSON.parse(data);
};

const saveCustomers = (list: Customer[]) => {
  localStorage.setItem("mock_customers", JSON.stringify(list));
};

export const customerApi = {
  getGroups: async (): Promise<CustomerGroup[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getGroups()), 400);
    });
  },

  createGroup: async (group: Omit<CustomerGroup, "id" | "members" | "campaigns" | "lastUsed">): Promise<CustomerGroup> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getGroups();
        const newGroup: CustomerGroup = {
          ...group,
          id: list.length + 1,
          members: 0,
          campaigns: 0,
          lastUsed: "Just now",
        };
        list.push(newGroup);
        saveGroups(list);
        resolve(newGroup);
      }, 500);
    });
  },

  getCustomers: async (): Promise<Customer[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getCustomers()), 400);
    });
  },

  createCustomer: async (customer: Omit<Customer, "id" | "added">): Promise<Customer> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getCustomers();
        const newCustomer: Customer = {
          ...customer,
          id: list.length + 1,
          added: new Date().toISOString().split("T")[0],
        };
        list.unshift(newCustomer);
        saveCustomers(list);
        resolve(newCustomer);
      }, 500);
    });
  },

  updateCustomer: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getCustomers();
        const idx = list.findIndex((c) => c.id === id);
        if (idx > -1) {
          list[idx] = { ...list[idx], ...customer };
          saveCustomers(list);
          resolve(list[idx]);
        } else {
          reject(new Error("Customer not found"));
        }
      }, 400);
    });
  },

  deleteCustomer: async (id: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getCustomers().filter((c) => c.id !== id);
        saveCustomers(list);
        resolve();
      }, 300);
    });
  },
};
