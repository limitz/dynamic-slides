#!/usr/bin/env node
/**
 * present-ctl — control the presentation server from the CLI (or Claude)
 *
 * Usage:
 *   node present-ctl.js state
 *   node present-ctl.js next
 *   node present-ctl.js prev
 *   node present-ctl.js goto <slide-id>
 *   node present-ctl.js reload
 *
 * Set PRESENT_URL to override the default server address.
 */

const BASE = process.env.PRESENT_URL || 'http://localhost:3001';

const [,, cmd, ...args] = process.argv;

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

const commands = {
  async state() {
    const data = await req('GET', '/state');
    const slide = data.slides[data.currentIndex];
    console.log(JSON.stringify({
      currentIndex: data.currentIndex,
      total: data.slides.length,
      slide: slide ? { id: slide.id, layout: slide.layout, heading: slide.content?.heading } : null,
      meta: data.meta,
    }, null, 2));
  },

  async next() {
    const data = await req('POST', '/slide/next');
    console.log(`→ slide ${data.currentIndex + 1}`);
  },

  async prev() {
    const data = await req('POST', '/slide/prev');
    console.log(`← slide ${data.currentIndex + 1}`);
  },

  async goto() {
    const id = args[0];
    if (!id) { console.error('Usage: goto <slide-id>'); process.exit(1); }
    const data = await req('POST', `/slide/${id}`);
    if (data.error) { console.error(data.error); process.exit(1); }
    console.log(`↷ jumped to slide ${data.currentIndex + 1} (${id})`);
  },

  async reload() {
    await req('POST', '/reload');
    console.log('↺ reloaded script from disk');
  },
};

if (!cmd || !commands[cmd]) {
  console.error(`Unknown command: ${cmd || '(none)'}`);
  console.error(`Available: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}

commands[cmd]().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
