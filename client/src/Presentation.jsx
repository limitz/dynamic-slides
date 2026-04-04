import { useEffect } from 'react';
import { usePresentation } from './usePresentation';
import SlideRenderer from './SlideRenderer';

export default function Presentation() {
  const { state, connected, next, prev } = usePresentation();
  const currentSlide = state.slides[state.currentIndex];

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  return (
    <div className="presentation">
      <div className="status">{connected ? '●' : '○'}</div>
      <SlideRenderer slide={currentSlide} />
      <div className="progress">
        {state.slides.length > 0 && `${state.currentIndex + 1} / ${state.slides.length}`}
      </div>
    </div>
  );
}
