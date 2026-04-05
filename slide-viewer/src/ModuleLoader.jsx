import { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Module components from project directory
const moduleMap = import.meta.glob('./modules/**/*.{jsx,tsx}');

function findLoader(map, suffix) {
  for (const [key, loader] of Object.entries(map)) {
    if (key.endsWith(suffix)) return loader;
  }
  return null;
}

export default function ModuleLoader({ path, slide, section }) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!path) return;

    // Normalise: accept "modules/Foo.jsx", "./modules/Foo.jsx", or "Foo.jsx"
    let normalized = path.startsWith('./') ? path.slice(2) : path;
    if (!normalized.includes('/')) normalized = `modules/${normalized}`;
    if (!normalized.endsWith('.jsx') && !normalized.endsWith('.tsx')) normalized += '.jsx';

    const loader = findLoader(moduleMap, `/${normalized}`) || moduleMap[`./${normalized}`];

    if (!loader) {
      const allKeys = Object.keys(moduleMap);
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
    return <div className="module-loading">Loading {path}\u2026</div>;
  }

  return (
    <ErrorBoundary key={path}>
      <Component slide={slide} section={section} />
    </ErrorBoundary>
  );
}
