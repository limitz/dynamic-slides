// Animation plugins from project directory
const animationMap = import.meta.glob('./animations/**/*.js');

const cache = {};

/**
 * Load an animation plugin by name.
 * Returns { keyframes, options } for declarative animations,
 * or a function (el, { delay }) => void for legacy plugins.
 * Returns null if the plugin isn't found.
 */
export async function loadAnimation(name) {
  if (!name) return null;
  if (cache[name] !== undefined) return cache[name];

  const loader = animationMap[`./animations/${name}.js`];

  if (!loader) { cache[name] = null; return null; }

  const mod = await loader().catch(() => null);
  cache[name] = mod?.default ?? null;
  return cache[name];
}
