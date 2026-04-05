import { useRef, useLayoutEffect } from 'react';
import { loadAnimation } from './AnimationLoader';

/**
 * Wraps an element with an entrance animation.
 * Element starts at opacity:0 when animation is defined.
 */
export default function Animated({ name, delay = 0, trigger = true, children }) {
  const ref = useRef(null);
  const firedRef = useRef(false);

  useLayoutEffect(() => {
    if (!trigger || firedRef.current || !name || !ref.current) return;
    firedRef.current = true;

    loadAnimation(name).then(plugin => {
      if (!plugin || !ref.current) return;
      const el = ref.current;

      if (typeof plugin === 'function') {
        plugin(el, { delay });
      } else {
        el.animate(plugin.keyframes, { ...plugin.options, delay, fill: 'both' });
      }
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
