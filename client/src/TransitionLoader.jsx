import { useState, useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Pre-register all transition plugins in src/transitions/
const transitionMap = import.meta.glob('./transitions/**/*.{jsx,tsx}');

// Instant passthrough: show entering slide, signal completion immediately
function Passthrough({ entering, onExited }) {
  useEffect(() => { onExited?.(); }, []);
  return <>{entering}</>;
}

/**
 * Loads a transition plugin by name and orchestrates enter/exit.
 *
 * Plugin contract:
 *   props: { entering, exiting, direction, onExited }
 *   - entering:  ReactNode — the slide coming in
 *   - exiting:   ReactNode | null — the slide going out
 *   - direction: 'forward' | 'backward'
 *   - onExited:  () => void — MUST be called when the exit animation finishes
 */
export default function TransitionLoader({ name, entering, exiting, direction, onExited }) {
  // undefined = loading, null = not found / no-op
  const [Component, setComponent] = useState(undefined);

  useEffect(() => {
    if (!name || name === 'none') { setComponent(null); return; }

    const key = `./transitions/${name}.jsx`;
    const loader = transitionMap[key] || transitionMap[`./transitions/${name}.tsx`];
    if (!loader) { setComponent(null); return; }

    loader()
      .then(mod => setComponent(() => mod.default))
      .catch(() => setComponent(null));
  }, [name]);

  // Still loading: show entering immediately (no exit animation)
  if (Component === undefined) return <Passthrough entering={entering} onExited={onExited} />;

  // Plugin not found, transition = "none", or nothing to exit
  if (!Component || !exiting) return <Passthrough entering={entering} onExited={onExited} />;

  return (
    <ErrorBoundary>
      <Component
        entering={entering}
        exiting={exiting}
        direction={direction}
        onExited={onExited}
      />
    </ErrorBoundary>
  );
}
