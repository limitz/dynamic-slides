import { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Pre-register all modules in src/modules/ — Vite resolves these at build time
const moduleMap = import.meta.glob('./modules/**/*.{jsx,tsx}');

export default function ModuleLoader({ path, slide }) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!path) return;

    // Normalise: accept "modules/Foo.jsx", "./modules/Foo.jsx", or "Foo.jsx"
    let key = path.startsWith('./') ? path : `./${path}`;
    if (!key.includes('/')) key = `./modules/${key}`;

    const loader = moduleMap[key];
    if (!loader) {
      setError(`Module not found: ${key}\nAvailable: ${Object.keys(moduleMap).join(', ') || '(none)'}`);
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
