import { useRef, useLayoutEffect } from 'react';
import { loadAnimation } from './AnimationLoader';

/**
 * Wraps a block element with an entrance animation.
 *
 * Props:
 *   name    — animation plugin name (e.g. "fade-up")
 *   delay   — ms delay before animation starts
 *   trigger — when this flips from false→true the animation fires;
 *             defaults to true (fires on mount)
 *   children
 *
 * Usage:
 *   <Animated name="fade-up" delay={100}>
 *     <h2>Hello</h2>
 *   </Animated>
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
      ref.current.style.opacity = '';
    });
  }, [trigger]);

  return (
    <div
      ref={ref}
      style={(!trigger || name) ? { opacity: 0, pointerEvents: trigger ? undefined : 'none' } : undefined}
    >
      {children}
    </div>
  );
}
