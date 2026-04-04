import { marked } from 'marked';

marked.use({ gfm: true, breaks: true });

// Block markdown — for body/paragraph fields
export function md(text) {
  if (!text) return '';
  return marked.parse(String(text));
}

// Inline markdown — for headings, captions, bullet text
export function mdi(text) {
  if (!text) return '';
  return marked.parseInline(String(text));
}
