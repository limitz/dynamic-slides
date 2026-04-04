import { useEffect, useState, useRef } from 'react';
import { usePresentation } from './usePresentation';
import { PresentationContext } from './PresentationContext';
import { useTheme } from './useTheme';
import SlideRenderer from './SlideRenderer';
import Overview from './Overview';

export default function Presentation() {
  const { state, connected, next, prev, goTo, send } = usePresentation();
  const [overview, setOverview] = useState(false);

  useTheme(state.meta, state.theme);

  // --- Transitions ---
  const prevIndexRef = useRef(state.currentIndex);
  const [transitionKey, setTransitionKey] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [exitingSlide, setExitingSlide] = useState(null);

  useEffect(() => {
    if (state.currentIndex === prevIndexRef.current) return;
    const dir = state.currentIndex > prevIndexRef.current ? 'forward' : 'backward';
    const incoming = state.slides[state.currentIndex];
    const t = incoming?.transition ?? state.meta?.transition ?? 'none';
    // Only track exiting slide when there's a transition to show
    setExitingSlide(t !== 'none' ? (state.slides[prevIndexRef.current] ?? null) : null);
    setDirection(dir);
    setTransitionKey(k => k + 1);
    prevIndexRef.current = state.currentIndex;
  }, [state.currentIndex, state.slides]);

  const currentSlide = state.slides[state.currentIndex];
  const transition = currentSlide?.transition ?? state.meta?.transition ?? 'none';

  // --- Keyboard ---
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Tab')                { e.preventDefault(); setOverview(v => !v); return; }
      if (e.key === 'Escape')             { setOverview(false); return; }
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

  const enterCls = transition !== 'none'
    ? `transition-layer slide-enter--${transition} dir-${direction}`
    : 'transition-layer';

  const exitCls = `transition-layer slide-exit--${transition} dir-${direction}`;

  return (
    <PresentationContext.Provider value={{ state, connected, send, next, prev, goTo }}>
      <div className="presentation">
        <div className="status">{connected ? '●' : '○'}</div>

        <div className="transition-stage">
          {/* Exiting slide — removed when its CSS animation ends */}
          {exitingSlide && (
            <div
              key={`exit-${transitionKey}`}
              className={exitCls}
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget) setExitingSlide(null);
              }}
            >
              <SlideRenderer slide={exitingSlide} step={Infinity} />
            </div>
          )}
          {/* Entering slide */}
          <div key={`enter-${transitionKey}`} className={enterCls}>
            <SlideRenderer slide={currentSlide} step={state.currentStep ?? 0} />
          </div>
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
