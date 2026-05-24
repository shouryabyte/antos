import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { lifecycleBlockedStatuses, limitedPartnerStatuses, limitedStudentStatuses, profileCompletionStatuses } from "../lib/onboardingAutomation";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, profile, role } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#f5f2ea] text-sm font-semibold text-slate-600">Loading AntOS...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (profile?.status && lifecycleBlockedStatuses.includes(profile.status) && path !== "/account-disabled") return <Navigate to="/account-disabled" replace />;
  if (profile?.status && profileCompletionStatuses.includes(profile.status) && path !== "/complete-profile") return <Navigate to="/complete-profile" replace />;
  if (role === "Student" && profile?.status && limitedStudentStatuses.includes(profile.status) && !["/pending-verification","/complete-profile"].includes(path)) return <Navigate to="/pending-verification" replace />;
  if (role === "Corporate Partner" && profile?.status && limitedPartnerStatuses.includes(profile.status) && !["/pending-verification","/complete-profile"].includes(path)) return <Navigate to="/pending-verification" replace />;
  return <Outlet />;
}
