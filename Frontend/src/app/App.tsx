import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { useAuth } from "../features/auth/hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { AppLayout } from "../components/layout/AppLayout";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { CampaignsPage } from "../features/campaigns/pages/CampaignsPage";
import { CampaignDetailsPage } from "../features/campaigns/pages/CampaignDetailsPage";
import { SendSMSPage } from "../features/smsGateway/pages/SendSMSPage";
import { ContactsPage } from "../features/contacts/pages/ContactsPage";
import { TemplatesPage } from "../features/templates/pages/TemplatesPage";
import { DeliveryReportsPage } from "../features/reports/pages/DeliveryReportsPage";
import { SettingsPage } from "../features/settings/pages/SettingsPage";
import { toast } from "sonner";
import { websocketService } from "../services/websocket";
import { useEffect } from "react";

function ProtectedRoute({ isAuthenticated, children }: { isAuthenticated: boolean; children: React.ReactNode }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, user, token, login, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  // Establish WebSocket connection when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      websocketService.connect(token);
    } else {
      websocketService.disconnect();
    }
    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated, token]);

  // Listen for auth expiration events from Axios interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
      toast.error("Your session has expired. Please sign in again.");
    };
    window.addEventListener("sms_auth_expired", handleAuthExpired);
    return () => {
      window.removeEventListener("sms_auth_expired", handleAuthExpired);
    };
  }, [logout]);

  async function handleLogin(email: string, password: string) {
    await login(email, password);
    toast.success("Signed in successfully.");
  }

  function handleLogout() {
    logout();
    toast.success("Signed out.");
  }

  return (
    <BrowserRouter>
      <Toaster richColors position="top-right" closeButton />
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to="/dashboard" replace />
              : <LoginPage onLogin={handleLogin} />
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected */}
        <Route
          path="/*"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AppLayout
                user={user!}
                onLogout={handleLogout}
                theme={theme}
                onThemeToggle={toggleTheme}
              >
                <Routes>
                  <Route path="/dashboard"              element={<DashboardPage />} />
                  <Route path="/send-sms"               element={<SendSMSPage />} />
                  <Route path="/campaigns"              element={<CampaignsPage />} />
                  <Route path="/campaigns/:campaignId"  element={<CampaignDetailsPage />} />
                  <Route path="/contacts"               element={<ContactsPage />} />
                  <Route path="/templates"              element={<TemplatesPage />} />
                  <Route path="/reports"                element={<DeliveryReportsPage />} />
                  <Route path="/settings"               element={<SettingsPage theme={theme} onThemeToggle={toggleTheme} />} />
                  <Route path="*"                       element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
