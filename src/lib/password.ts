import { z } from "zod";

// Same rules as the backend's passwordRule: 8–128 characters, a letter and a digit.
export const passwordRule = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one digit.");

export const PASSWORD_HINT = "At least 8 characters, with a letter and a digit.";

/** 14 characters from an unambiguous alphabet, always with a letter and a digit. */
export function generatePassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const bytes = crypto.getRandomValues(new Uint32Array(28));
  const chars = Array.from(bytes.subarray(0, 14), (n) => all[n % all.length]);
  chars[0] = letters[bytes[0] % letters.length];
  chars[1] = digits[bytes[1] % digits.length];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = bytes[14 + i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
