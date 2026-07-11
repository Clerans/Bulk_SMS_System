import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF8]">
        <div className="w-10 h-10 border-4 border-[#8EA58C]/20 border-t-[#8EA58C] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // If user doesn't have permissions, redirect to dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
