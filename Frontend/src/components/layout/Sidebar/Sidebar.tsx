import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, Send, List, Users, FileText, BarChart2, Settings,
  ChevronLeft, ChevronRight, LogOut, MessageSquare,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import type { User } from "../../../types/common";

const NAV_ITEMS = [
  { path: "/dashboard",  label: "Dashboard",       icon: LayoutDashboard },
  { path: "/send-sms",   label: "Send SMS",         icon: Send            },
  { path: "/campaigns",  label: "Campaigns",        icon: List            },
  { path: "/contacts",   label: "Contacts",         icon: Users           },
  { path: "/templates",  label: "Templates",        icon: FileText        },
  { path: "/reports",    label: "Delivery Reports", icon: BarChart2       },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

export function Sidebar({ collapsed, onToggle, onLogout }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 h-[72px] border-b border-sidebar-border flex-shrink-0",
          collapsed && "justify-center px-0"
        )}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 animate-bounce-soft"
          style={{ background: "#004953" }}
        >
          <MessageSquare className="w-4 h-4 animate-pulse" style={{ color: "#5eead4" }} />
        </div>
        {!collapsed && (
          <span className="font-extrabold text-base tracking-wide" style={{ color: "#ffffff" }}>
            SMS<span style={{ color: "#2dd4bf" }}>Blast</span>
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              title={collapsed ? label : undefined}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-xl border-l-4 border-y-0 border-r-0 border-l-transparent",
                collapsed && "justify-center px-0",
                active
                  ? "font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              style={active ? { background: "rgba(0,73,83,0.55)", color: "#5eead4", borderColor: "#5eead4" } : {}}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}

        <div className="mt-2 pt-2 border-t border-sidebar-border">
          <button
            onClick={() => navigate("/settings")}
            title={collapsed ? "Settings" : undefined}
            aria-label="Settings"
            aria-current={isActive("/settings") ? "page" : undefined}
            className={cn(
              "relative w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all rounded-xl border-l-4 border-y-0 border-r-0 border-l-transparent",
              collapsed && "justify-center px-0",
              isActive("/settings")
                ? "font-semibold"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            style={isActive("/settings") ? { background: "rgba(0,73,83,0.55)", color: "#5eead4", borderColor: "#5eead4" } : {}}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-1 flex-shrink-0">
        {/* Logout */}
        <button
          onClick={onLogout}
          title={collapsed ? "Sign out" : undefined}
          aria-label="Sign out"
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
            "text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
            "text-muted-foreground hover:bg-sidebar-accent transition-colors",
            collapsed ? "justify-center px-0" : "justify-end"
          )}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4" />
            : <><span className="text-xs">Collapse</span><ChevronLeft className="w-4 h-4" /></>
          }
        </button>
      </div>
    </aside>
  );
}
