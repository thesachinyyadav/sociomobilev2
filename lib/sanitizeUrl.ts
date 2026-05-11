/**
 * Validates and sanitizes a given URL string.
 * Ensures the URL only uses safe protocols to prevent XSS attacks (e.g. javascript:).
 * 
 * @param url The untrusted URL string
 * @param fallbackUrl The fallback URL if the given URL is malicious or invalid
 * @returns The sanitized URL or the fallback URL
 */
export function sanitizeUrl(url?: string | null, fallbackUrl = "#"): string {
  if (!url) return fallbackUrl;

  // Trim whitespace
  const trimmed = url.trim();

  try {
    // If it's a relative path, it's generally safe
    if (trimmed.startsWith("/") || trimmed.startsWith("#") || trimmed.startsWith("?")) {
      return trimmed;
    }

    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    // Allowed protocols
    const safeProtocols = [
      "http:",
      "https:",
      "mailto:",
      "tel:",
      "whatsapp:",
      "socio:"
    ];

    if (safeProtocols.includes(protocol)) {
      return parsed.href;
    }

    console.warn(`[Security] Blocked unsafe URL protocol: ${protocol}`);
    return fallbackUrl;
  } catch {
    // If it cannot be parsed as a URL, it might be a malformed string or relative without base.
    // To be strictly secure, we block unparseable absolute-looking URLs.
    if (trimmed.match(/^[a-zA-Z0-9]+:/)) {
       console.warn(`[Security] Blocked unparseable absolute URL: ${trimmed}`);
       return fallbackUrl;
    }
    
    // Fallback allowing relative strings that don't match a protocol
    return trimmed;
  }
}
