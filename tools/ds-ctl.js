#!/usr/bin/env node
/**
 * ds-ctl — control the dynamic-slides server from the CLI (or Claude)
 *
 * Usage:
 *   node ds-ctl.js state
 *   node ds-ctl.js next
 *   node ds-ctl.js prev
 *   node ds-ctl.js goto <slide-index>
 *   node ds-ctl.js reload
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
      currentStep: data.currentStep,
      total: data.slides.length,
      slide: slide ? { layout: slide.layout, title: slide.title, maxStep: slide.maxStep } : null,
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
    const index = args[0];
    if (index == null) { console.error('Usage: goto <slide-index>'); process.exit(1); }
    const data = await req('POST', `/slide/${index}`);
    if (data.error) { console.error(data.error); process.exit(1); }
    console.log(`jumped to slide ${data.currentIndex + 1}`);
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
