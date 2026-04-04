// Pre-register all animation plugins in src/animations/
const animMap = import.meta.glob('./animations/**/*.js');
const cache = {};

/**
 * Load an animation plugin by name.
 * Returns a function: (el, { delay }) => void
 * Returns null if the plugin isn't found.
 */
export async function loadAnimation(name) {
  if (!name) return null;
  if (cache[name] !== undefined) return cache[name];

  const key = `./animations/${name}.js`;
  const loader = animMap[key];
  if (!loader) { cache[name] = null; return null; }

  const mod = await loader().catch(() => null);
  cache[name] = mod?.default ?? null;
  return cache[name];
}
