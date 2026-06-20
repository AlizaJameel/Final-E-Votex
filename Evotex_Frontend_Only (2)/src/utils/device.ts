/** True on phones/tablets — face WebAuthn uses platform biometrics (no USB passkey picker). */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
