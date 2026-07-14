import { useState } from "react";
import { Sidebar } from "../Sidebar";
import { Header } from "../Header";
import { cn } from "../../../lib/utils";
import type { Theme } from "../../../hooks/useTheme";
import type { User } from "../../../types/common";

interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  theme: Theme;
  onThemeToggle: () => void;
}

export function AppLayout({ children, user, onLogout, theme, onThemeToggle }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onLogout={onLogout}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-[240px] h-full shadow-2xl">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onLogout={onLogout}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuOpen={() => setMobileOpen(true)}
          user={user}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
