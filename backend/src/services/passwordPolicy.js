/**
 * Minimum password requirements enforced everywhere a password is set:
 * account creation, admin-driven password changes. Deliberately simple
 * (length + a letter + a number) rather than an arbitrary complexity
 * checklist — those tend to push people toward predictable substitutions
 * ("Password1!") without meaningfully raising the guessing difficulty.
 */
export function validatePasswordStrength(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}
