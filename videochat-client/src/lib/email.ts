export function hasWiscDomain(email: string) {
  const parts = normalizeEmail(email).split("@");
  return parts.length === 2 && parts[1] === "wisc.edu";
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
