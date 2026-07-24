/**
 * Minimal, dependency-free Indonesian phone number handling for the
 * "share receipt via WhatsApp" flow. Deliberately not a full E.164 library —
 * just enough to turn what a cashier types (0812..., 62812..., +62812...,
 * 812...) into the digits-only country-code form wa.me expects.
 */

/**
 * Normalizes a loosely-formatted Indonesian phone number to '62XXXXXXXXXX'
 * (digits only, no leading '+'). Returns null if the input doesn't look like
 * a plausible Indonesian mobile number.
 */
export function normalizeIndonesianPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const digitsAndPlus = trimmed.replace(/[^\d+]/g, "");
  let normalized = digitsAndPlus;

  if (normalized.startsWith("+62")) {
    normalized = normalized.slice(1);
  } else if (normalized.startsWith("62")) {
    // already in country-code form
  } else if (normalized.startsWith("0")) {
    normalized = `62${normalized.slice(1)}`;
  } else if (normalized.startsWith("8")) {
    normalized = `62${normalized}`;
  } else {
    return null;
  }

  // Indonesian mobile numbers are typically 62 + 9-12 digits (e.g. 62812xxxxxxx).
  if (!/^62\d{8,13}$/.test(normalized)) return null;

  return normalized;
}

/** '628123456789' -> '+62 8123456789' (loose display formatting). */
export function formatPhoneForDisplay(normalizedPhone: string): string {
  return `+${normalizedPhone.slice(0, 2)} ${normalizedPhone.slice(2)}`;
}

/**
 * Builds a wa.me deep link that opens WhatsApp with the message prefilled.
 * The user still has to press send themselves — nothing here sends
 * anything automatically.
 */
export function buildWhatsAppLink(normalizedPhone: string, message: string): string {
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
