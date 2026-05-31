/**
 * Input sanitization utility.
 * Strips HTML tags and escapes special characters to prevent XSS.
 */

/**
 * Strip all HTML tags from a string.
 */
export function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Escape special HTML characters to their entity equivalents.
 */
export function escapeSpecialChars(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize input by stripping HTML tags and escaping special characters.
 * Returns the sanitized string.
 */
export function sanitize(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  const stripped = stripHtmlTags(input);
  return escapeSpecialChars(stripped);
}

/**
 * Sanitize chat messages: strip all HTML tags but preserve text content.
 * Does NOT escape special characters — preserves readable text for chat display.
 */
export function sanitizeChatMessage(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return stripHtmlTags(input).trim();
}
