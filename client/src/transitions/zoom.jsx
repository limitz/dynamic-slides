import { useEffect, useRef } from 'react';

const DURATION = 300;

export default function Zoom({ entering, exiting, onExited }) {
  const exitRef = useRef(null);
  const enterRef = useRef(null);

  useEffect(() => {
    const exitEl = exitRef.current;
    const enterEl = enterRef.current;

    enterEl?.animate(
      [
        { transform: 'scale(1.04)', opacity: 0 },
        { transform: 'scale(1)',    opacity: 1 },
      ],
      { duration: DURATION, easing: 'ease', fill: 'forwards' }
    );

    const exitAnim = exitEl?.animate(
      [
        { transform: 'scale(1)',    opacity: 1 },
        { transform: 'scale(0.94)', opacity: 0 },
      ],
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
