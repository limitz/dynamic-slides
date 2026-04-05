import { useRef, useLayoutEffect } from 'react';
import { loadAnimation } from './AnimationLoader';

/**
 * Wraps an element with a reversible entrance animation.
 * Element starts at opacity:0 when animation is defined.
 * Supports declarative { keyframes, options } plugins with auto-reverse.
 */
export default function Animated({ name, delay = 0, trigger = true, children }) {
  const ref = useRef(null);
  const firedRef = useRef(false);
  const animRef = useRef(null);

  useLayoutEffect(() => {
    if (!name || !ref.current) return;
    const el = ref.current;

    loadAnimation(name).then(plugin => {
      if (!plugin || !ref.current) return;

      if (typeof plugin === 'function') {
        if (trigger && !firedRef.current) {
          firedRef.current = true;
          plugin(el, { delay });
        }
        return;
      }

      const { keyframes, options } = plugin;

      if (trigger && !firedRef.current) {
        firedRef.current = true;
        if (animRef.current) animRef.current.cancel();
        animRef.current = el.animate(keyframes, { ...options, delay, fill: 'both' });
      } else if (!trigger && firedRef.current) {
        firedRef.current = false;
        if (animRef.current) animRef.current.cancel();
        const reverse = el.animate([...keyframes].reverse(), { ...options, delay: 0, fill: 'both' });
        reverse.addEventListener('finish', () => reverse.cancel(), { once: true });
        animRef.current = reverse;
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
