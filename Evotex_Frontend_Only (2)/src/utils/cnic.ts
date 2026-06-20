/** Pakistani CNIC format: XXXXX-XXXXXXX-X */
export const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;

export function formatCnicInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function isValidCnic(value: string): boolean {
  return CNIC_PATTERN.test(value.trim());
}

export function cnicToDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function cnicValidationMessage(value: string): string {
  if (!value.trim()) return 'CNIC is required.';
  if (!/^[0-9-]+$/.test(value)) return 'CNIC can only contain numbers and hyphens.';
  if (!CNIC_PATTERN.test(value)) return 'CNIC must be in format XXXXX-XXXXXXX-X (5-7-1 digits).';
  return '';
}
