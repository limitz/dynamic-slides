import { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Layout components from project directory (resolved via Vite glob)
const layoutMap = import.meta.glob('./layouts/**/*.{jsx,tsx}');

function findLoader(map, name) {
  for (const [key, loader] of Object.entries(map)) {
    if (key.endsWith(`/${name}.jsx`) || key.endsWith(`/${name}.tsx`)) {
      return loader;
    }
  }
  return null;
}

export default function LayoutLoader({ layout, slots }) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!layout || layout === 'default') {
      setComponent(null);
      return;
    }

    const loader = findLoader(layoutMap, layout);

    if (!loader) {
      const available = Object.keys(layoutMap);
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

  // Default layout: just render all slots in order
  if (!Component) {
    return <>{Object.values(slots)}</>;
  }

  return (
    <ErrorBoundary key={layout}>
      <Component slots={slots} />
    </ErrorBoundary>
  );
}
