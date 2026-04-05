import { useRef, useLayoutEffect } from 'react';
import { loadAnimation } from './AnimationLoader';

/**
 * Wraps an element with an entrance animation.
 * Element starts at opacity:0 when animation is defined.
 * All animations use fill:'forwards' — no snap-back.
 */
export default function Animated({ name, delay = 0, trigger = true, children }) {
  const ref = useRef(null);
  const firedRef = useRef(false);

  useLayoutEffect(() => {
    if (!trigger || firedRef.current || !name || !ref.current) return;
    firedRef.current = true;
    loadAnimation(name).then(fn => {
      if (!fn || !ref.current) return;
      fn(ref.current, { delay });
    });
  }, [trigger]);

  return (
    <div
      ref={ref}
      style={name ? { opacity: 0 } : undefined}
    >
      {children}
    </div>
  );
}
