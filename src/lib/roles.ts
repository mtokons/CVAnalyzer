// Platform roles & ownership constants.
//
// Role hierarchy:
//   SUPER_ADMIN — Owner of the platform. Full access. Cannot be deleted/demoted.
//   ADMIN       — Manage users, projects, candidates, finance, reports.
//   MEMBER      — Internal staff (formerly "USER"). Uses CV tools, no admin.
//   EMPLOYER    — External partner/client. Read-only project reports they own.

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  EMPLOYER: "EMPLOYER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const VALID_ROLES: Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.MEMBER,
  ROLES.EMPLOYER,
];

// The permanent platform owner. This account is always SUPER_ADMIN and can
// never be deleted or demoted.
export const OWNER_EMAIL = "mhasnainn@gmail.com";

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === OWNER_EMAIL;
}

// Roles allowed to access the Project Management module.
export function canManageProjects(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

export function isAdminRole(role?: string | null): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}
