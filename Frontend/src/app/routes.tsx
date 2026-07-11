import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRoute } from "@/components/RoleRoute";

// Page Loader Spinner
const PageLoader = () => (
  <div className="min-h-[400px] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
  </div>
);

// Lazy Loaded Pages
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AllCampaigns = lazy(() => import("@/pages/campaigns/AllCampaigns"));
const CreateCampaign = lazy(() => import("@/pages/campaigns/CreateCampaign"));
const CampaignDetails = lazy(() => import("@/pages/campaigns/CampaignDetails"));
const Templates = lazy(() => import("@/pages/campaigns/Templates"));
const Customers = lazy(() => import("@/pages/customers/Customers"));
const CustomerGroups = lazy(() => import("@/pages/customers/CustomerGroups"));
const Users = lazy(() => import("@/pages/users/Users"));
const Roles = lazy(() => import("@/pages/users/Roles"));
const DeliveryLogs = lazy(() => import("@/pages/DeliveryLogs"));
const Reports = lazy(() => import("@/pages/Reports"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAF8]">
          <div className="w-10 h-10 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
        </div>
      }
    >
      <Routes>
        {/* Unprotected Login route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Layout routing */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          
          {/* Campaigns */}
          <Route path="campaigns" element={<AllCampaigns />} />
          <Route path="campaigns/create" element={<CreateCampaign />} />
          <Route path="campaigns/templates" element={<Templates />} />
          <Route path="campaigns/:id" element={<CampaignDetails />} />
          
          {/* Customers */}
          <Route path="customers" element={<Customers />} />
          <Route path="customers/groups" element={<CustomerGroups />} />

          {/* User Management (Admin only) */}
          <Route
            path="users"
            element={
              <RoleRoute allowedRoles={["Admin"]}>
                <Users />
              </RoleRoute>
            }
          />
          <Route
            path="users/roles"
            element={
              <RoleRoute allowedRoles={["Admin"]}>
                <Roles />
              </RoleRoute>
            }
          />

          {/* Core System Pages */}
          <Route path="delivery-logs" element={<DeliveryLogs />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
export default AppRoutes;
