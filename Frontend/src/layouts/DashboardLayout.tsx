import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Users,
  UserCheck,
  List,
  BarChart3,
  Shield,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  ChevronRight,
  Send,
  Plus,
  Key,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/utils/cn";

// Navigation Items with Submenus
interface NavChildItem {
  id: string;
  label: string;
  path: string;
  adminOnly?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavChildItem[];
}

const navConfig: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={17} />,
    path: "/",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    icon: <MessageSquare size={17} />,
    children: [
      { id: "campaigns-all", label: "All Campaigns", path: "/campaigns" },
      { id: "campaigns-create", label: "Create Campaign", path: "/campaigns/create" },
      { id: "campaigns-templates", label: "Templates", path: "/campaigns/templates" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: <Users size={17} />,
    children: [
      { id: "customers-list", label: "Customers", path: "/customers" },
      { id: "customers-groups", label: "Customer Groups", path: "/customers/groups" },
    ],
  },
  {
    id: "users-mgmt",
    label: "User Management",
    icon: <Shield size={17} />,
    children: [
      { id: "users-list", label: "Users", path: "/users", adminOnly: true },
      { id: "users-roles", label: "Roles & Permissions", path: "/users/roles", adminOnly: true },
    ],
  },
  {
    id: "delivery-logs",
    label: "Delivery Logs",
    icon: <List size={17} />,
    path: "/delivery-logs",
  },
  {
    id: "reports",
    label: "Reports",
    icon: <BarChart3 size={17} />,
    path: "/reports",
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    icon: <Shield size={17} />,
    path: "/audit-logs",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={17} />,
    path: "/settings",
  },
];

// Breadcrumbs builder mapping
const getBreadcrumbs = (pathname: string) => {
  const crumbs = ["Home"];
  if (pathname === "/") {
    crumbs.push("Dashboard");
    return crumbs;
  }

  if (pathname.startsWith("/campaigns")) {
    crumbs.push("Campaigns");
    if (pathname === "/campaigns/create") crumbs.push("Create Campaign");
    else if (pathname === "/campaigns/templates") crumbs.push("Templates");
    else if (pathname.includes("/campaigns/")) crumbs.push("Campaign Details");
    else crumbs.push("All Campaigns");
  } else if (pathname.startsWith("/customers")) {
    crumbs.push("Customers");
    if (pathname === "/customers/groups") crumbs.push("Customer Groups");
    else crumbs.push("Contacts");
  } else if (pathname.startsWith("/users")) {
    crumbs.push("User Management");
    if (pathname === "/users/roles") crumbs.push("Roles & Permissions");
    else crumbs.push("Users List");
  } else if (pathname === "/delivery-logs") {
    crumbs.push("Delivery Logs");
  } else if (pathname === "/reports") {
    crumbs.push("Reports & Analytics");
  } else if (pathname === "/audit-logs") {
    crumbs.push("Audit Logs");
  } else if (pathname === "/settings") {
    crumbs.push("Settings");
  }

  return crumbs;
};

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Expansions state
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("sidebar_open_menus");
    if (saved) return JSON.parse(saved);
    return {
      campaigns: location.pathname.startsWith("/campaigns"),
      customers: location.pathname.startsWith("/customers"),
      "users-mgmt": location.pathname.startsWith("/users"),
    };
  });

  // Persist expansions
  const toggleMenu = (menuId: string) => {
    setOpenMenus((prev) => {
      const next = { ...prev, [menuId]: !prev[menuId] };
      localStorage.setItem("sidebar_open_menus", JSON.stringify(next));
      return next;
    });
  };

  // Auto-expand menu on active route matches
  useEffect(() => {
    let changed = false;
    const next = { ...openMenus };
    if (location.pathname.startsWith("/campaigns") && !next.campaigns) {
      next.campaigns = true;
      changed = true;
    }
    if (location.pathname.startsWith("/customers") && !next.customers) {
      next.customers = true;
      changed = true;
    }
    if (location.pathname.startsWith("/users") && !next["users-mgmt"]) {
      next["users-mgmt"] = true;
      changed = true;
    }
    if (changed) {
      setOpenMenus(next);
      localStorage.setItem("sidebar_open_menus", JSON.stringify(next));
    }
  }, [location.pathname]);

  const activeBreadcrumbs = getBreadcrumbs(location.pathname);

  // Checks if a parent menu holds active routes
  const isParentActive = (item: typeof navConfig[0]) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path);
    }
    return location.pathname === item.path;
  };

  return (
    <div className="flex h-screen bg-[#F8FAF8] font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-56 flex-shrink-0 flex flex-col h-screen sticky top-0" style={{ background: "#16211D" }}>
        <div className="px-4 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8EA58C] flex items-center justify-center flex-shrink-0">
              <Send size={14} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">BulkSMS Pro</div>
              <div className="text-[10px] text-white/40 mt-0.5">Enterprise console</div>
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {navConfig.map((item) => {
            const hasChildren = !!item.children;
            const open = !!openMenus[item.id];
            const active = isParentActive(item);

            if (hasChildren) {
              return (
                <div key={item.id} className="space-y-0.5">
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer group transition-all duration-150",
                      active
                        ? "bg-[#8EA58C]/10 text-[#8EA58C]"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={active ? "text-[#8EA58C]" : "text-white/35 group-hover:text-white/60"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>

                  {open && (
                    <div className="pl-7 pr-1.5 py-1 space-y-0.5 border-l border-white/5 ml-5">
                      {item.children
                        ?.filter((child) => !child.adminOnly || user?.role === "Admin")
                        .map((child) => {
                          const childActive = location.pathname === child.path;
                          return (
                            <Link
                              key={child.id}
                              to={child.path}
                              className={cn(
                                "block px-3 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer",
                                childActive
                                  ? "text-[#8EA58C] font-semibold"
                                  : "text-white/45 hover:text-white/90 hover:bg-white/5"
                              )}
                            >
                              {child.label}
                            </Link>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.path || "/"}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer group transition-all duration-150",
                  active
                    ? "bg-[#8EA58C]/20 text-[#8EA58C]"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className={active ? "text-[#8EA58C]" : "text-white/35 group-hover:text-white/60"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* USER PROFILE INFO & LOGOUT */}
        <div className="px-2.5 py-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-[#8EA58C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.avatar || "SK"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.name || "Sarah Kumar"}</div>
              <div className="text-[10px] text-white/35 truncate">{user?.role || "Administrator"}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="cursor-pointer text-white/30 hover:text-white/90 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* CORE DISPLAY WINDOW */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOPBAR */}
        <header className="h-14 bg-white border-b border-[#E4EAE2] px-6 flex items-center justify-between sticky top-0 z-10">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
            {activeBreadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={11} />}
                <span
                  className={cn(
                    "font-medium",
                    idx === activeBreadcrumbs.length - 1 ? "text-[#1F2937] font-semibold" : ""
                  )}
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Search */}
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Quick search…"
                className="pl-9 pr-4 py-1.5 text-xs bg-[#F8FAF8] border border-[#E4EAE2] rounded-lg w-52 focus:outline-none focus:border-[#8EA58C] transition-colors"
              />
            </div>

            {/* Notification alert bell */}
            <button
              onClick={() => navigate("/settings")}
              className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F8FAF8] transition-colors text-[#64748B] cursor-pointer"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#EF4444] rounded-full" />
            </button>

            <div className="w-8 h-8 rounded-lg bg-[#8EA58C] flex items-center justify-center text-white text-xs font-bold">
              {user?.avatar || "SK"}
            </div>
          </div>
        </header>

        {/* ROUTE CONTENT WINDOW */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
