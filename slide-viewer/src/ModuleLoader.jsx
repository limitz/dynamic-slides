import { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Built-in modules
const builtinMap = import.meta.glob('./modules/**/*.{jsx,tsx}');

// User modules from project directory
const projectMap = import.meta.glob('@project/modules/**/*.{jsx,tsx}');

function findLoader(map, suffix) {
  for (const [key, loader] of Object.entries(map)) {
    if (key.endsWith(suffix)) return loader;
  }
  return null;
}

export default function ModuleLoader({ path, slide }) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!path) return;

    // Normalise: accept "modules/Foo.jsx", "./modules/Foo.jsx", or "Foo.jsx"
    let normalized = path.startsWith('./') ? path.slice(2) : path;
    if (!normalized.includes('/')) normalized = `modules/${normalized}`;

    // Try project modules first, then built-in
    let loader = findLoader(projectMap, `/${normalized}`);
    if (!loader) {
      loader = findLoader(builtinMap, `/${normalized}`) || builtinMap[`./${normalized}`];
    }

    if (!loader) {
      const allKeys = [...Object.keys(projectMap), ...Object.keys(builtinMap)];
      setError(`Module not found: ${normalized}\nAvailable: ${allKeys.join(', ') || '(none)'}`);
      return;
    }

    setError(null);
    loader()
      .then((mod) => setComponent(() => mod.default))
      .catch((err) => setError(err.message));
  }, [path]);

  if (error) {
    return (
      <div className="module-error">
        <strong>Module error</strong>
        <code>{error}</code>
      </div>
    );
  }

  if (!Component) {
    return <div className="module-loading">Loading {path}…</div>;
  }

  return (
    <ErrorBoundary key={path}>
      <Component slide={slide} />
    </ErrorBoundary>
  );
}
