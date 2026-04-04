// Built-in animation plugins
const builtinMap = import.meta.glob('./animations/**/*.js');

// User animation plugins from project directory
const projectMap = import.meta.glob('@project/animations/**/*.js');

const cache = {};

/**
 * Load an animation plugin by name.
 * Checks the user's project directory first, then falls back to built-ins.
 * Returns a function: (el, { delay }) => void
 * Returns null if the plugin isn't found.
 */
export async function loadAnimation(name) {
  if (!name) return null;
  if (cache[name] !== undefined) return cache[name];

  // Try project animations first
  const projectKey = `@project/animations/${name}.js`;
  // Vite resolves the glob keys with the alias, but the actual keys
  // in the map use the resolved path. Try matching by suffix.
  let loader = findLoader(projectMap, `/animations/${name}.js`);

  // Fall back to built-in
  if (!loader) {
    loader = builtinMap[`./animations/${name}.js`];
  }

  if (!loader) { cache[name] = null; return null; }

  const mod = await loader().catch(() => null);
  cache[name] = mod?.default ?? null;
  return cache[name];
}

function findLoader(map, suffix) {
  for (const [key, loader] of Object.entries(map)) {
    if (key.endsWith(suffix)) return loader;
  }
  return null;
}
