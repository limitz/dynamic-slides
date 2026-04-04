import { useState, useEffect, useRef } from 'react';
import { usePresentation } from './usePresentation';

function useClock() {
  const [now, setNow] = useState(new Date());
  const [start, setStart] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.floor((now - start) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return {
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    elapsed: `${mm}:${ss}`,
    elapsedSecs: elapsed,
    reset: () => setStart(new Date()),
  };
}

export default function Controller() {
  const { state, connected, next, prev, goTo } = usePresentation();
  const { time, elapsed, elapsedSecs, reset } = useClock();

  const currentSlide = state.slides[state.currentIndex];
  const nextSlide = state.slides[state.currentIndex + 1];

  const duration = (state.meta?.duration ?? 0) * 60;
  const warnBefore = (state.meta?.warn_before ?? 0) * 60;
  const warnAt = duration - warnBefore;

  let elapsedColor = '#22c55e';
  if (duration > 0) {
    if (elapsedSecs >= duration) elapsedColor = '#ef4444';
    else if (elapsedSecs >= warnAt) elapsedColor = '#f97316';
  }

  return (
    <div className="controller">
      <div className="controller__header">
        <div className="controller__status">
          <span style={{ color: connected ? '#22c55e' : '#ef4444' }}>{connected ? 'Connected' : 'Disconnected'}</span>
          {state.meta?.title && <span>{state.meta.title}</span>}
        </div>
        <div className="controller__elapsed" style={{ color: elapsedColor }} onClick={reset}>{elapsed}<span className="controller__reset-hint">click to reset</span></div>
        <div className="controller__clock">
          <span>{time}</span>
        </div>
      </div>

      <div className="controller__current">
        <div className="controller__slide-info">
          <span>
            {state.slides.length > 0
              ? `Slide ${state.currentIndex + 1} of ${state.slides.length}`
              : 'No slides'}
          </span>
          {currentSlide?.id && <span>#{currentSlide.id}</span>}
        </div>
        {currentSlide?.content?.heading && (
          <div className="controller__heading">{currentSlide.content.heading}</div>
        )}
        {currentSlide?.content?.notes && (
          <div className="controller__notes">{currentSlide.content.notes}</div>
        )}
        {nextSlide && (
          <div className="controller__next-up">
            Next: {nextSlide.content?.heading || nextSlide.id || `Slide ${state.currentIndex + 2}`}
          </div>
        )}
      </div>

      <div className="controller__nav">
        <button onClick={prev} disabled={state.currentIndex === 0}>◀ Prev</button>
        <button onClick={next} disabled={state.currentIndex >= state.slides.length - 1}>Next ▶</button>
      </div>

      <div className="controller__list">
        {state.slides.map((slide, i) => (
          <button
            key={slide.id || i}
            className={`controller__slide-btn ${i === state.currentIndex ? 'active' : ''}`}
            onClick={() => goTo(i)}
          >
            <span className="controller__slide-num">{i + 1}</span>
            <span className="controller__slide-label">
              {slide.content?.heading || slide.id || `Slide ${i + 1}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
