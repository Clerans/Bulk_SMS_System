import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Menu, Sun, Moon, Settings, LogOut } from "lucide-react";
import type { User } from "../../../types/common";
import type { Theme } from "../../../hooks/useTheme";

interface HeaderProps {
  onMenuOpen: () => void;
  user: User;
  theme: Theme;
  onThemeToggle: () => void;
  onLogout: () => void;
}

/** Maps route paths to human-readable page titles & descriptions (matching the HTML template). */
const PAGE_META: Record<string, { title: string; description: string; crumb: string }> = {
  "/dashboard":  { title: "Enterprise Dashboard",        description: "Monitor and analyze real-time multi-channel delivery metrics.",              crumb: "Dashboard"         },
  "/send-sms":   { title: "Campaign Orchestrator",       description: "Compose highly targeted bulk messages with live budget calculation.",        crumb: "Send SMS"          },
  "/campaigns":  { title: "Campaign Directory",          description: "Track progress, cancel, or re-run marketing campaign cycles.",               crumb: "Campaigns"         },
  "/contacts":   { title: "Audience Segments",           description: "Group contacts dynamically based on behaviors or parameters.",               crumb: "Contacts"          },
  "/templates":  { title: "Quick-Response Templates",    description: "Create standardized templates to speed up message dispatch.",                crumb: "Templates"         },
  "/reports":    { title: "Delivery Intelligence",       description: "Trace exact logs and carrier success rates.",                                crumb: "Delivery Reports"  },
  "/settings":   { title: "System Configurations",       description: "Manage your credentials, custom sender IDs, and webhooks.",                 crumb: "Settings"          },
};

function getPageMeta(pathname: string) {
  // Match exact or starts-with (e.g. /campaigns/123)
  const key = Object.keys(PAGE_META).find(
    (k) => pathname === k || pathname.startsWith(k + "/")
  );
  return key ? PAGE_META[key] : { title: "SMSBlast", description: "", crumb: "Console" };
}

export function Header({ onMenuOpen, user, theme, onThemeToggle, onLogout }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const meta = getPageMeta(location.pathname);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive initials (up to 2 chars)
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-[72px] border-b border-border bg-card flex items-center px-6 justify-between flex-shrink-0">
      {/* Left side: Hamburger (mobile) + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuOpen}
          className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right side: Controls */}
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left focus:outline-none"
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">{initials}</span>
            </div>
            <span className="text-sm font-medium text-foreground hidden sm:block truncate max-w-[120px]">
              {user.name}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-11 w-56 mt-1.5 rounded-xl border border-border bg-card text-card-foreground shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right">
              {/* Profile details */}
              <div className="px-4 py-2 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>

              {/* Actions */}
              <div className="pt-1.5">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/settings");
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Settings
                </button>
                
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

