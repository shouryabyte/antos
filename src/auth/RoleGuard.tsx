import type { ReactNode } from "react";
import type { Permission, RoleName } from "./permissions";
import { useAuth } from "./useAuth";

export function RoleGuard({ roles, permission, children, fallback = null }: { roles?: RoleName[]; permission?: Permission; children: ReactNode; fallback?: ReactNode }) {
  const auth = useAuth();
  const allowedByRole = roles ? auth.hasRole(roles) : true;
  const allowedByPermission = permission ? auth.hasPermission(permission) : true;
  return allowedByRole && allowedByPermission ? <>{children}</> : <>{fallback}</>;
}
