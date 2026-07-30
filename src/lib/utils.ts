import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
 
// ---------------------------------------------------------------------------
// Aadhaar validation
//
// UIDAI generates every Aadhaar number with a Verhoeff checksum digit, the
// same class of algorithm used for IMEI/credit-card style checks but more
// resistant to common transposition errors. We can verify the *format* is
// structurally valid without ever contacting UIDAI's servers (that requires
// an official AUA/KUA license and live eKYC access, which this app does not
// have). This is format validation only — it confirms the number *could* be
// a real Aadhaar, not that it belongs to the person submitting it.
// ---------------------------------------------------------------------------
 
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
 
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
 
function verhoeffChecksumOk(numStr: string): boolean {
  let c = 0;
  const digits = numStr.split("").reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }
  return c === 0;
}
 
/** Strips spaces/dashes so "XXXX-XXXX-1234" or "1234 5678 9012" both normalize cleanly. */
export function normalizeAadhaar(raw: string): string {
  return raw.replace(/[\s-]/g, "");
}
 
export interface AadhaarValidationResult {
  valid: boolean;
  reason?: string;
}
 
/**
 * Validates structural correctness of an Aadhaar number:
 * - exactly 12 digits
 * - first digit is 2-9 (UIDAI never issues numbers starting with 0 or 1)
 * - passes the Verhoeff checksum
 *
 * NOTE: This does NOT confirm the number is real, active, or belongs to the
 * submitter. True verification requires UIDAI's official eKYC/OTP API via a
 * licensed AUA/KUA, which is a separate, regulated integration.
 */
export function validateAadhaar(raw: string): AadhaarValidationResult {
  const num = normalizeAadhaar(raw);
 
  if (!/^\d{12}$/.test(num)) {
    return { valid: false, reason: "Aadhaar number must be exactly 12 digits." };
  }
  if (/^[01]/.test(num)) {
    return { valid: false, reason: "Aadhaar numbers never start with 0 or 1." };
  }
  if (!verhoeffChecksumOk(num)) {
    return { valid: false, reason: "Checksum invalid — number does not match Aadhaar's issuance format." };
  }
  return { valid: true };
}
 
/** Returns a display-safe masked form, e.g. "XXXX-XXXX-1234". Never store or log the raw number. */
export function maskAadhaar(raw: string): string {
  const num = normalizeAadhaar(raw);
  const last4 = num.slice(-4);
  return `XXXX-XXXX-${last4}`;
}
 