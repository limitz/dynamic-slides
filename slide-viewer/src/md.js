import { marked } from 'marked';

marked.use({ gfm: true, breaks: true });

// Block markdown — for body/paragraph fields.
// Strips the outer <p> wrapper for single-paragraph content so it can be
// safely set as innerHTML of an existing <p> without invalid nesting.
export function md(text) {
  if (!text) return '';
  const html = marked.parse(String(text));
  const single = html.match(/^<p>([\s\S]*?)<\/p>\n?$/);
  return single ? single[1] : html;
}

// Inline markdown — for headings, captions, bullet text
export function mdi(text) {
  if (!text) return '';
  return marked.parseInline(String(text));
}
