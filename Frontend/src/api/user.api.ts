export interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  lastLogin: string;
  avatar: string;
}

export interface UserRole {
  name: string;
  users: number;
  color: string;
  colorBg: string;
  desc: string;
  perms: string[];
}

const initialUsers: SystemUser[] = [
  { id: 1, name: "Sarah Kumar", email: "sarah@company.com", role: "Admin", status: "active", lastLogin: "2025-01-09 09:00", avatar: "SK" },
  { id: 2, name: "James Lee", email: "james@company.com", role: "Campaign Manager", status: "active", lastLogin: "2025-01-09 08:30", avatar: "JL" },
  { id: 3, name: "Emma Roberts", email: "emma@company.com", role: "Campaign Manager", status: "active", lastLogin: "2025-01-08 17:00", avatar: "ER" },
  { id: 4, name: "Mike Thompson", email: "mike@company.com", role: "Viewer", status: "active", lastLogin: "2025-01-08 14:00", avatar: "MT" },
  { id: 5, name: "Lisa Martinez", email: "lisa@company.com", role: "Viewer", status: "inactive", lastLogin: "2025-01-06 10:00", avatar: "LM" },
];

const initialRoles: UserRole[] = [
  { name: "Administrator", users: 1, color: "#EF4444", colorBg: "#FEF2F2", desc: "Full system access including user management, settings, and billing.", perms: ["All Campaigns", "All Gateways", "User Management", "Billing", "Audit Logs", "Settings"] },
  { name: "Campaign Manager", users: 2, color: "#3B82F6", colorBg: "#EFF6FF", desc: "Create, edit and manage campaigns and customer groups.", perms: ["Create Campaigns", "Edit Campaigns", "Customer Groups", "Templates", "Delivery Logs", "Reports"] },
  { name: "Viewer", users: 2, color: "#8EA58C", colorBg: "#EEF4EC", desc: "Read-only access to campaigns and reports.", perms: ["View Campaigns", "View Reports", "View Logs"] },
];

const getUsers = (): SystemUser[] => {
  const data = localStorage.getItem("mock_users_list");
  if (!data) {
    localStorage.setItem("mock_users_list", JSON.stringify(initialUsers));
    return initialUsers;
  }
  return JSON.parse(data);
};

const saveUsers = (list: SystemUser[]) => {
  localStorage.setItem("mock_users_list", JSON.stringify(list));
};

const getRoles = (): UserRole[] => {
  const data = localStorage.getItem("mock_roles_list");
  if (!data) {
    localStorage.setItem("mock_roles_list", JSON.stringify(initialRoles));
    return initialRoles;
  }
  return JSON.parse(data);
};

const saveRoles = (list: UserRole[]) => {
  localStorage.setItem("mock_roles_list", JSON.stringify(list));
};

export const userApi = {
  getUsers: async (): Promise<SystemUser[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getUsers()), 400);
    });
  },

  createUser: async (user: Omit<SystemUser, "id" | "lastLogin" | "avatar">): Promise<SystemUser> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getUsers();
        const avatar = user.name.split(" ").map(n => n[0]).join("").toUpperCase();
        const newUser: SystemUser = {
          ...user,
          id: list.length + 1,
          lastLogin: "Never",
          avatar,
        };
        list.push(newUser);
        saveUsers(list);
        
        // increment count in roles
        const roles = getRoles();
        const rIdx = roles.findIndex(r => r.name === user.role);
        if (rIdx > -1) {
          roles[rIdx].users += 1;
          saveRoles(roles);
        }

        resolve(newUser);
      }, 500);
    });
  },

  updateUserStatus: async (id: number, status: "active" | "inactive"): Promise<SystemUser> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const list = getUsers();
        const idx = list.findIndex(u => u.id === id);
        if (idx > -1) {
          list[idx].status = status;
          saveUsers(list);
          resolve(list[idx]);
        } else {
          reject(new Error("User not found"));
        }
      }, 300);
    });
  },

  deleteUser: async (id: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getUsers();
        const user = list.find(u => u.id === id);
        const filtered = list.filter(u => u.id !== id);
        saveUsers(filtered);

        if (user) {
          const roles = getRoles();
          const rIdx = roles.findIndex(r => r.name === user.role);
          if (rIdx > -1 && roles[rIdx].users > 0) {
            roles[rIdx].users -= 1;
            saveRoles(roles);
          }
        }

        resolve();
      }, 400);
    });
  },

  getRoles: async (): Promise<UserRole[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(getRoles()), 400);
    });
  },

  createRole: async (role: UserRole): Promise<UserRole> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const list = getRoles();
        list.push(role);
        saveRoles(list);
        resolve(role);
      }, 500);
    });
  },
};
