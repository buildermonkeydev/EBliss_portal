import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Admin roles enum
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ACCOUNTANT = 'accountant',
  TECHNICAL = 'technical',
  READONLY = 'readonly',
}

// Accept both enum values and string literals
export const Roles = (...roles: (AdminRole | string)[]) => SetMetadata(ROLES_KEY, roles);