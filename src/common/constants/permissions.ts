export const PERMISSIONS = {
  SESSIONS: {
    CREATE: 'academics.sessions.create',
    VIEW: 'academics.sessions.view',
    EDIT: 'academics.sessions.edit',
    DELETE: 'academics.sessions.delete',
    ALL: 'academics.sessions.all',
  },
  ROLES: {
    VIEW: 'roles.view',
    ALL: 'roles.all',
    MANAGEMENT: {
      ALL: 'roles.management.all',
      VIEW: 'roles.management.view',
      CREATE: 'roles.management.create',
      EDIT: 'roles.management.edit',
      DELETE: 'roles.management.delete',
    },
    MATRIX: {
      ALL: 'roles.matrix.all',
      VIEW: 'roles.matrix.view',
      CREATE: 'roles.matrix.create',
      EDIT: 'roles.matrix.edit',
      DELETE: 'roles.matrix.delete',
    },
  },
  // Add other modules permissions here as needed
};
