import { useEffect, useRef } from 'react';

const DURATION = 350;

export default function Fade({ entering, exiting, onExited }) {
  const exitRef = useRef(null);
  const enterRef = useRef(null);

  useEffect(() => {
    const exitEl = exitRef.current;
    const enterEl = enterRef.current;

    enterEl?.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: DURATION, easing: 'ease', fill: 'forwards' }
    );

    const exitAnim = exitEl?.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: DURATION, easing: 'ease', fill: 'forwards' }
    );

    if (exitAnim) exitAnim.onfinish = () => onExited?.();
    else onExited?.();

    return () => exitAnim?.cancel();
  }, []);

  return (
    <>
      <div ref={exitRef} className="transition-layer">{exiting}</div>
      <div ref={enterRef} className="transition-layer" style={{ opacity: 0 }}>{entering}</div>
    </>
  );
}
