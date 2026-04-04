// Minimal markdown parser — no external dependency.
// Supports: **bold**, *italic*, `code`, ~~strike~~, [text](url), line breaks.

function inline(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/  \n/g, '<br>');
}

// Inline markdown — for headings, captions, bullet text
export function mdi(text) {
  if (!text) return '';
  return inline(text);
}

// Block markdown — for body/paragraph fields.
// Handles multiple paragraphs separated by blank lines.
export function md(text) {
  if (!text) return '';
  const paragraphs = String(text).split(/\n{2,}/);
  if (paragraphs.length === 1) return inline(text);
  return paragraphs.map(p => `<p>${inline(p.trim())}</p>`).join('');
}
