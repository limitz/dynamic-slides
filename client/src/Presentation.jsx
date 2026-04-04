import { useEffect, useState } from 'react';
import { usePresentation } from './usePresentation';
import SlideRenderer from './SlideRenderer';
import Overview from './Overview';

export default function Presentation() {
  const { state, connected, next, prev, goTo } = usePresentation();
  const [overview, setOverview] = useState(false);
  const currentSlide = state.slides[state.currentIndex];

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        setOverview((v) => !v);
        return;
      }
      if (e.key === 'Escape' && overview) {
        setOverview(false);
        return;
      }
      if (!overview) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, overview]);

  function handleOverviewSelect(index) {
    goTo(index);
    setOverview(false);
  }

  return (
    <div className="presentation">
      <div className="status">{connected ? '●' : '○'}</div>
      <SlideRenderer slide={currentSlide} />
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
  );
}
