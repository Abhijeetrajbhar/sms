import { Role } from '@prisma/client';

export interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  permissions: string[];
  isSuperAdmin: boolean;
  mustChangePassword?: boolean;
}
