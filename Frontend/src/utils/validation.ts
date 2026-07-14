export function validateEmail(email: string): boolean {
  if (!email) return false;
  return email.includes("@") && email.trim().length > 3;
}

export function isRequired(value: string): boolean {
  return value !== undefined && value !== null && value.trim().length > 0;
}
