import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';

const md = new MarkdownIt({ html: true });
md.use(markdownItAttrs);

/**
 * Parse an animation value like "fade@500" into { name, delay }.
 * Plain "fade" becomes { name: "fade", delay: 0 }.
 */
function parseAnimation(value) {
  if (!value) return null;
  const at = value.indexOf('@');
  if (at === -1) return { name: value, delay: 0 };
  return { name: value.substring(0, at), delay: parseInt(value.substring(at + 1), 10) || 0 };
}

/**
 * Extract known attributes from a token's attrs array.
 * Returns an object with parsed values; remaining attrs are ignored.
 */
function extractAttrs(token) {
  const raw = {};
  if (!token.attrs) return raw;
  for (const [key, value] of token.attrs) {
    raw[key] = value;
  }
  return raw;
}

/**
 * Get the text content of an inline token (after markdown-it-attrs strips attribute text).
 */
function getInlineText(tokens, index) {
  const inline = tokens[index];
  if (!inline || inline.type !== 'inline') return '';
  // The children have the cleaned text
  return inline.children
    .filter(c => c.type === 'text')
    .map(c => c.content)
    .join('')
    .trim();
}

/**
 * Render an inline token's children to HTML using markdown-it's renderer.
 */
function renderInline(tokens, index, mdInstance) {
  const inline = tokens[index];
  if (!inline || inline.type !== 'inline' || !inline.children) return '';
  return mdInstance.renderer.render(inline.children, mdInstance.options, {});
}

/**
 * Collect all content tokens between start and end indices,
 * rendering them to HTML. Stops at the next h2, h3, or end of tokens.
 * Returns { html, bullets[], endIndex }.
 */
function collectSegmentContent(tokens, startIndex, mdInstance) {
  let html = '';
  const bullets = [];
  let i = startIndex;

  while (i < tokens.length) {
    const t = tokens[i];

    // Stop at next heading or hr (segment separator)
    if (t.type === 'heading_open') break;
    if (t.type === 'hr') break;

    // Bullet list
    if (t.type === 'bullet_list_open') {
      i++;
      while (i < tokens.length && tokens[i].type !== 'bullet_list_close') {
        if (tokens[i].type === 'list_item_open') {
          const liAttrs = extractAttrs(tokens[i]);
          i++;
          // Find the inline content inside the list item
          let bulletHtml = '';
          while (i < tokens.length && tokens[i].type !== 'list_item_close') {
            if (tokens[i].type === 'inline') {
              bulletHtml += renderInline(tokens, i, mdInstance);
            }
            i++;
          }
          bullets.push({
            html: bulletHtml.trim(),
            reveal: liAttrs.reveal != null ? parseInt(liAttrs.reveal, 10) : null,
            dismiss: liAttrs.dismiss != null ? parseInt(liAttrs.dismiss, 10) : null,
            enter: parseAnimation(liAttrs.enter),
            exit: parseAnimation(liAttrs.exit),
            class: liAttrs.class || null,
          });
        }
        i++;
      }
      i++; // skip bullet_list_close
      continue;
    }

    // Paragraph or other block content
    if (t.type === 'paragraph_open') {
      i++;
      if (i < tokens.length && tokens[i].type === 'inline') {
        html += '<p>' + renderInline(tokens, i, mdInstance) + '</p>';
        i++;
      }
      if (i < tokens.length && tokens[i].type === 'paragraph_close') i++;
      continue;
    }

    // HTML block (may contain comments — skip, already handled for notes)
    if (t.type === 'html_block') {
      // Don't include HTML comments in rendered content
      if (!t.content.trim().startsWith('<!--')) {
        html += t.content;
      }
      i++;
      continue;
    }

    // Skip other tokens
    i++;
  }

  return { html: html.trim(), bullets, endIndex: i };
}

/**
 * Parse a markdown presentation script into a structured object.
 *
 * @param {string} source - Raw markdown string
 * @returns {{ meta: object, slides: object[] }}
 */
export function parseScript(source) {
  const tokens = md.parse(source, {});
  const meta = {};
  const slides = [];
  let currentSlide = null;
  let currentSection = null;
  let i = 0;

  while (i < tokens.length) {
    const t = tokens[i];

    // H1 — presentation meta
    if (t.type === 'heading_open' && t.tag === 'h1') {
      const attrs = extractAttrs(t);
      i++; // inline
      meta.title = getInlineText(tokens, i);
      // All h1 attributes become meta key/value pairs
      Object.assign(meta, attrs);
      // Remove 'id' if markdown-it-attrs auto-assigned it
      delete meta.id;
      i++; // heading_close
      i++;
      continue;
    }

    // H2 — new slide
    if (t.type === 'heading_open' && t.tag === 'h2') {
      const attrs = extractAttrs(t);
      i++; // inline
      const title = getInlineText(tokens, i);
      i++; // heading_close
      i++;

      currentSlide = {
        title,
        layout: attrs.layout || 'default',
        enter: parseAnimation(attrs.enter),
        exit: parseAnimation(attrs.exit),
        class: attrs.class || null,
        module: attrs.module || null,
        notes: null,
        maxStep: 0,
        sections: [],
      };
      currentSection = null;
      slides.push(currentSlide);

      // Check for HTML comment (speaker notes) immediately after h2
      if (i < tokens.length && tokens[i].type === 'html_block') {
        const content = tokens[i].content.trim();
        const match = content.match(/^<!--\s*([\s\S]*?)\s*-->$/);
        if (match) {
          currentSlide.notes = match[1].trim();
        }
        i++;
      }

      continue;
    }

    // H3 — new section
    if (t.type === 'heading_open' && t.tag === 'h3') {
      const attrs = extractAttrs(t);
      i++; // inline
      const text = getInlineText(tokens, i);
      i++; // heading_close
      i++;

      currentSection = {
        id: attrs.id || null,
        title: text || null, // null for headerless sections
        layout: attrs.layout || null,
        reveal: attrs.reveal != null ? parseInt(attrs.reveal, 10) : null,
        dismiss: attrs.dismiss != null ? parseInt(attrs.dismiss, 10) : null,
        enter: parseAnimation(attrs.enter),
        exit: parseAnimation(attrs.exit),
        module: attrs.module || null,
        class: attrs.class || null,
        segments: [],
      };

      if (currentSlide) {
        currentSlide.sections.push(currentSection);
      }

      // Collect first segment content
      const seg = collectFirstSegment(tokens, i, md);
      if (seg.html || seg.bullets.length > 0) {
        currentSection.segments.push({
          reveal: null,
          content: seg.html,
          bullets: seg.bullets,
        });
      }
      i = seg.endIndex;

      // Continue collecting segments separated by ---
      while (i < tokens.length && tokens[i].type === 'hr') {
        const hrAttrs = extractAttrs(tokens[i]);
        i++;
        const nextSeg = collectFirstSegment(tokens, i, md);
        currentSection.segments.push({
          reveal: hrAttrs.reveal != null ? parseInt(hrAttrs.reveal, 10) : null,
          content: nextSeg.html,
          bullets: nextSeg.bullets,
        });
        i = nextSeg.endIndex;
      }

      continue;
    }

    // Content outside sections but inside a slide (before first ###)
    // This could be paragraphs, bullets, etc. directly under a ## heading.
    if (currentSlide && !currentSection) {
      if (t.type === 'paragraph_open' || t.type === 'bullet_list_open') {
        // Create an implicit default section
        currentSection = {
          id: null,
          title: null,
          layout: null,
          reveal: null,
          dismiss: null,
          enter: null,
          exit: null,
          module: null,
          class: null,
          segments: [],
        };
        currentSlide.sections.push(currentSection);

        const seg = collectFirstSegment(tokens, i, md);
        currentSection.segments.push({
          reveal: null,
          content: seg.html,
          bullets: seg.bullets,
        });
        i = seg.endIndex;

        while (i < tokens.length && tokens[i].type === 'hr') {
          const hrAttrs = extractAttrs(tokens[i]);
          i++;
          const nextSeg = collectFirstSegment(tokens, i, md);
          currentSection.segments.push({
            reveal: hrAttrs.reveal != null ? parseInt(hrAttrs.reveal, 10) : null,
            content: nextSeg.html,
            bullets: nextSeg.bullets,
          });
          i = nextSeg.endIndex;
        }
        continue;
      }
    }

    i++;
  }

  // Compute maxStep for each slide
  for (const slide of slides) {
    let max = 0;
    for (const section of slide.sections) {
      if (section.reveal != null && section.reveal > max) max = section.reveal;
      if (section.dismiss != null && section.dismiss > max) max = section.dismiss;
      for (const seg of section.segments) {
        if (seg.reveal != null && seg.reveal > max) max = seg.reveal;
        for (const bullet of seg.bullets) {
          if (bullet.reveal != null && bullet.reveal > max) max = bullet.reveal;
          if (bullet.dismiss != null && bullet.dismiss > max) max = bullet.dismiss;
        }
      }
    }
    slide.maxStep = max;
  }

  return { meta, slides };
}

// Alias for the segment collector
function collectFirstSegment(tokens, startIndex, mdInstance) {
  return collectSegmentContent(tokens, startIndex, mdInstance);
}
