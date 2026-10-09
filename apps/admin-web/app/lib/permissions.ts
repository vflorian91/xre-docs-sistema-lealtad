export function hasPermission(permissions: string[] | undefined, code: string) {
  return Boolean(permissions?.includes(code));
}

export function hasAnyPermission(permissions: string[] | undefined, codes: string[]) {
  return codes.some((code) => hasPermission(permissions, code));
}
