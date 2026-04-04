import { useEffect, useState, useRef } from 'react';
import { usePresentation } from './usePresentation';
import { PresentationContext } from './PresentationContext';
import { useTheme } from './useTheme';
import SlideRenderer from './SlideRenderer';
import TransitionLoader from './TransitionLoader';
import Overview from './Overview';

export default function Presentation() {
  const { state, connected, next, prev, goTo, send } = usePresentation();
  const [overview, setOverview] = useState(false);

  // --- Theme ---
  useTheme(state.meta, state.theme);

  // --- Transitions ---
  const prevIndexRef = useRef(state.currentIndex);
  const [transitionKey, setTransitionKey] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [exitingSlide, setExitingSlide] = useState(null);

  useEffect(() => {
    if (state.currentIndex !== prevIndexRef.current) {
      const dir = state.currentIndex > prevIndexRef.current ? 'forward' : 'backward';
      setExitingSlide(state.slides[prevIndexRef.current] ?? null);
      setDirection(dir);
      setTransitionKey(k => k + 1);
      prevIndexRef.current = state.currentIndex;
    }
  }, [state.currentIndex, state.slides]);

  const currentSlide = state.slides[state.currentIndex];
  // Per-slide transition, falling back to global meta default
  const transition = currentSlide?.transition ?? state.meta?.transition ?? 'none';

  // --- Keyboard ---
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Tab')               { e.preventDefault(); setOverview(v => !v); return; }
      if (e.key === 'Escape')            { setOverview(false); return; }
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
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }

  return (
    <PresentationContext.Provider value={{ state, connected, send, next, prev, goTo }}>
      <div className="presentation">
        <div className="status">{connected ? '●' : '○'}</div>

        <div className="transition-stage">
          <TransitionLoader
            key={transitionKey}
            name={transition}
            entering={<SlideRenderer slide={currentSlide} step={state.currentStep ?? 0} />}
            exiting={exitingSlide ? <SlideRenderer slide={exitingSlide} step={Infinity} /> : null}
            direction={direction}
            onExited={() => setExitingSlide(null)}
          />
        </div>

        <div className="progress">
          {state.slides.length > 0 && `${state.currentIndex + 1} / ${state.slides.length}`}
        </div>

        {overview && (
          <Overview
            slides={state.slides}
            currentIndex={state.currentIndex}
            onSelect={(i) => { goTo(i); setOverview(false); }}
            onClose={() => setOverview(false)}
          />
        )}
      </div>
    </PresentationContext.Provider>
  );
}
