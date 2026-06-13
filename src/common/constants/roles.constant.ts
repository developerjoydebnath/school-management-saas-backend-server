export const ROLES = {
  DEVELOPER: 'DEVELOPER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  SCHOOL_STAFF: 'SCHOOL_STAFF',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  USER: 'USER',
} as const;

export const roles = Object.values(ROLES);

export type Role = (typeof ROLES)[keyof typeof ROLES];
