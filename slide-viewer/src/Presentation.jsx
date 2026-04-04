import { useEffect, useState, useRef, useLayoutEffect } from 'react';
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
  const stageRef = useRef(null);
  const exitRef = useRef(null);

  // Refs used to pass data from render phase to layout effect
  const snapshotRef = useRef(null);
  const pendingRef = useRef(null);

  const currentSlide = state.slides[state.currentIndex];

  // During render (before React commits), detect slide change and
  // clone the current DOM so the exit layer shows the exact same pixels.
  if (state.currentIndex !== prevIndexRef.current) {
    const dir = state.currentIndex > prevIndexRef.current ? 'forward' : 'backward';
    const incoming = state.slides[state.currentIndex];
    const t = incoming?.transition ?? state.meta?.transition ?? 'none';

    if (t !== 'none' && stageRef.current) {
      snapshotRef.current = stageRef.current.cloneNode(true);
    }
    pendingRef.current = { dir, transition: t };
    prevIndexRef.current = state.currentIndex;
  }

  // After React commits the new slide content, set up the animations.
  // Runs every render but bails immediately when there's no pending transition.
  useLayoutEffect(() => {
    const info = pendingRef.current;
    if (!info) return;
    pendingRef.current = null;

    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    const exitEl = exitRef.current;
    const stageEl = stageRef.current;

    // Exit layer: insert the cloned old-slide DOM (untouched, no re-render)
    if (snapshot && exitEl) {
      exitEl.innerHTML = '';
      while (snapshot.firstChild) exitEl.appendChild(snapshot.firstChild);
      exitEl.className = `transition-layer slide-exit--${info.transition} dir-${info.dir}`;
      exitEl.addEventListener('animationend', () => {
        exitEl.className = 'transition-layer';
        exitEl.innerHTML = '';
      }, { once: true });
    }

    // Enter animation on the stage
    if (stageEl && info.transition !== 'none') {
      stageEl.className = 'transition-layer';
      void stageEl.offsetWidth; // force reflow to restart animation
      stageEl.className = `transition-layer slide-enter--${info.transition} dir-${info.dir}`;
    }
  });

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

  return (
    <PresentationContext.Provider value={{ state, connected, send, next, prev, goTo }}>
      <div className="presentation">
        <div className="status">{connected ? '●' : '○'}</div>

        <div className="transition-stage">
          {/* Exit layer — populated with cloned DOM during transitions */}
          <div ref={exitRef} className="transition-layer" />
          {/* Stage — always shows current slide, keyed to remount on slide change */}
          <div ref={stageRef} className="transition-layer">
            <SlideRenderer key={state.currentIndex} slide={currentSlide} step={state.currentStep ?? 0} meta={state.meta} slideNum={state.currentIndex + 1} total={state.slides.length} />
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
