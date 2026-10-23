/** Every new employee starts with this password and must change it on first login. */
export const DEFAULT_TEMP_PASSWORD = 'zuvius@123'

export const MIN_PASSWORD_LENGTH = 8

/** Returns an error message, or null when the new password is acceptable. */
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (password.trim().toLowerCase() === DEFAULT_TEMP_PASSWORD) {
    return 'Choose a password different from the temporary one.'
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return 'Use at least one letter and one number.'
  }
  if (password !== confirm) {
    return 'The two passwords do not match.'
  }
  return null
}
