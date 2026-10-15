export function isSuperAdmin(user) {
  return user?.role === 'ADMIN' && Boolean(user.isSuperAdmin);
}

export function hasPermission(user, permission) {
  if (!permission) return true;
  if (isSuperAdmin(user)) return true;
  return Array.isArray(user?.permissions) && user.permissions.includes(permission);
}
