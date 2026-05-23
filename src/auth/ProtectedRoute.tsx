import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="grid min-h-screen place-items-center bg-[#f5f2ea] text-sm font-semibold text-slate-600">Loading AntOS...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
