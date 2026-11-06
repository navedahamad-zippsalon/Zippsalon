export const isVendorRoleName = (name: string) => name.toUpperCase().includes("VENDOR");
export const isVendorUser = (roleNames: readonly string[]) => roleNames.some(isVendorRoleName);
export const isPureCustomerUser = (roleNames: readonly string[]) =>
  roleNames.includes("CUSTOMER") && !roleNames.some((role) => ["ADMIN", "SUPER_ADMIN", "VENDOR", "STAFF"].includes(role));
