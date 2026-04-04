import { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Built-in layouts (drop files in src/layouts/ to add them)
const builtinMap = import.meta.glob('./layouts/**/*.{jsx,tsx}');

// User layouts from project directory
const projectMap = import.meta.glob('@project/layouts/**/*.{jsx,tsx}');

function findLoader(map, name) {
  // Accept "my-layout", "layouts/my-layout.jsx", etc.
  for (const [key, loader] of Object.entries(map)) {
    if (key.endsWith(`/${name}.jsx`) || key.endsWith(`/${name}.tsx`) || key.endsWith(`/${name}`)) {
      return loader;
    }
  }
  return null;
}

export default function LayoutLoader({ layout, slide, step, meta, slideNum, total, mini }) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!layout) return;

    // Try project layouts first, then built-in
    const loader = findLoader(projectMap, layout) || findLoader(builtinMap, layout);

    if (!loader) {
      const available = [...Object.keys(projectMap), ...Object.keys(builtinMap)];
      setError(`Layout not found: "${layout}"\nAvailable: ${available.join(', ') || '(none)'}`);
      return;
    }

    setError(null);
    loader()
      .then((mod) => setComponent(() => mod.default))
      .catch((err) => setError(err.message));
  }, [layout]);

  if (error) {
    return (
      <div className="module-error">
        <strong>Layout error</strong>
        <code>{error}</code>
      </div>
    );
  }

  if (!Component) {
    return <div className="module-loading">Loading layout "{layout}"…</div>;
  }

  return (
    <ErrorBoundary key={layout}>
      <Component slide={slide} step={step} meta={meta} slideNum={slideNum} total={total} mini={mini} />
    </ErrorBoundary>
  );
}
