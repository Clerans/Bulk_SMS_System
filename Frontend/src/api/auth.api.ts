export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  token: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<UserSession> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && email.includes("@")) {
          const session: UserSession = {
            id: 1,
            name: "Sarah Kumar",
            email: email,
            role: "Admin",
            avatar: "SK",
            token: "fake-jwt-token-12345",
          };
          localStorage.setItem("auth_token", session.token);
          localStorage.setItem("auth_user", JSON.stringify(session));
          resolve(session);
        } else {
          reject(new Error("Invalid email or password"));
        }
      }, 800);
    });
  },

  logout: async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        resolve();
      }, 300);
    });
  },

  getCurrentUser: async (): Promise<UserSession | null> => {
    const userStr = localStorage.getItem("auth_user");
    if (!userStr) return null;
    return JSON.parse(userStr);
  },
};
