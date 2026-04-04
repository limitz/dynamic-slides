import { useEffect, useRef } from 'react';

const DURATION = 300;
const DIST = '52px';

export default function Slide({ entering, exiting, direction, onExited }) {
  const exitRef = useRef(null);
  const enterRef = useRef(null);

  useEffect(() => {
    const exitEl = exitRef.current;
    const enterEl = enterRef.current;

    const exitTo   = direction === 'forward' ? `-${DIST}` : DIST;
    const enterFrom = direction === 'forward' ?   DIST    : `-${DIST}`;

    const exitAnim = exitEl?.animate(
      [
        { transform: 'translateX(0)',         opacity: 1 },
        { transform: `translateX(${exitTo})`, opacity: 0 },
      ],
      { duration: DURATION, easing: 'ease', fill: 'forwards' }
    );

    enterEl?.animate(
      [
        { transform: `translateX(${enterFrom})`, opacity: 0 },
        { transform: 'translateX(0)',             opacity: 1 },
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
