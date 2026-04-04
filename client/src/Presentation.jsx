import { useEffect, useState, useRef } from 'react';
import { usePresentation } from './usePresentation';
import { PresentationContext } from './PresentationContext';
import { useTheme } from './useTheme';
import SlideRenderer from './SlideRenderer';
import Overview from './Overview';

export default function Presentation() {
  const { state, connected, next, prev, goTo, send } = usePresentation();
  const [overview, setOverview] = useState(false);

  // --- Theme ---
  useTheme(state.meta, state.theme);

  // --- Transitions ---
  const prevIndexRef = useRef(state.currentIndex);
  const [animKey, setAnimKey] = useState(0);
  const [direction, setDirection] = useState('forward');

  useEffect(() => {
    if (state.currentIndex !== prevIndexRef.current) {
      setDirection(state.currentIndex > prevIndexRef.current ? 'forward' : 'backward');
      setAnimKey(k => k + 1);
      prevIndexRef.current = state.currentIndex;
    }
  }, [state.currentIndex]);

  const currentSlide = state.slides[state.currentIndex];
  const transition = currentSlide?.transition || 'none';

  // --- Keyboard ---
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Tab') { e.preventDefault(); setOverview(v => !v); return; }
      if (e.key === 'Escape') { setOverview(false); return; }
      if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
      if (!overview) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, overview]);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function handleOverviewSelect(index) {
    goTo(index);
    setOverview(false);
  }

  const animClass = transition !== 'none'
    ? `slide-anim--${transition} dir-${direction}`
    : '';

  return (
    <PresentationContext.Provider value={{ state, connected, send, next, prev, goTo }}>
      <div className="presentation">
        <div className="status">{connected ? '●' : '○'}</div>
        <div key={animKey} className={animClass}>
          <SlideRenderer slide={currentSlide} />
        </div>
        <div className="progress">
          {state.slides.length > 0 && `${state.currentIndex + 1} / ${state.slides.length}`}
        </div>
        {overview && (
          <Overview
            slides={state.slides}
            currentIndex={state.currentIndex}
            onSelect={handleOverviewSelect}
            onClose={() => setOverview(false)}
          />
        )}
      </div>
    </PresentationContext.Provider>
  );
}
