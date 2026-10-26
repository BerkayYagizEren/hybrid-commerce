import { UserRole } from "@prisma/client";

export type RoleType = UserRole;

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: RoleType;
  roles: RoleType[];
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  redirectUrl?: string;
  user?: SessionUser;
  error?: string;
}
