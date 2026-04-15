export type UserRole = 'admin' | 'managing_partner' | 'lawyer' | 'clerk';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  managing_partner: 3,
  lawyer: 2,
  clerk: 1,
};

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  practiceAreas: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
  createdBy: string;
  avatarUrl: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: UserRole;
  };
}
