import { usePresentation } from './usePresentation';

export default function Controller() {
  const { state, connected, next, prev, goTo } = usePresentation();
  const currentSlide = state.slides[state.currentIndex];

  return (
    <div className="controller">
      <div className="controller__status">
        {connected ? 'Connected' : 'Connecting...'}
        {state.meta?.title && <span className="controller__title">{state.meta.title}</span>}
      </div>

      <div className="controller__current">
        <div className="controller__slide-info">
          {state.slides.length > 0
            ? `Slide ${state.currentIndex + 1} of ${state.slides.length}`
            : 'No slides'}
          {currentSlide?.id && <span className="controller__slide-id">#{currentSlide.id}</span>}
        </div>
        {currentSlide?.content?.heading && (
          <div className="controller__heading">{currentSlide.content.heading}</div>
        )}
        {currentSlide?.content?.notes && (
          <div className="controller__notes">{currentSlide.content.notes}</div>
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
            <span className="controller__slide-label">{slide.content?.heading || slide.id || `Slide ${i + 1}`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
