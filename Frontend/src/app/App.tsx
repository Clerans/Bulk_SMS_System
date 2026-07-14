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

function ProtectedRoute({ isAuthenticated, children }: { isAuthenticated: boolean; children: React.ReactNode }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

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
