export function normalizeTextLinkURL(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith('#')) return raw;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : 'https://' + raw);
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function sanitizeHref(value: string, fallback = '#'): string {
  return normalizeTextLinkURL(value) ?? fallback;
}
