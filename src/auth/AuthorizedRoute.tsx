import { Outlet, useLocation } from "react-router-dom";
import { routePermissions } from "./permissions";
import { AccessDeniedPage } from "./AccessDeniedPage";
import { useAuth } from "./useAuth";

export function AuthorizedRoute() {
  const { hasPermission, hasRole } = useAuth();
  const location = useLocation();
  const permissions = getRoutePermissions(location.pathname);

  if (hasRole("Super Admin")) return <Outlet />;
  if (!permissions || permissions.some((permission) => hasPermission(permission))) return <Outlet />;
  return <AccessDeniedPage />;
}

function getRoutePermissions(pathname: string) {
  const normalized = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return routePermissions[normalized];
}
