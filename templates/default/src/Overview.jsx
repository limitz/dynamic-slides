import SlideRenderer from './SlideRenderer';

export default function Overview({ slides, currentIndex, onSelect, onClose }) {
  return (
    <div className="overview" onClick={onClose}>
      <div className="overview__grid" onClick={(e) => e.stopPropagation()}>
        {slides.map((slide, i) => (
          <button
            key={i}
            className={`overview__item ${i === currentIndex ? 'active' : ''}`}
            onClick={() => onSelect(i)}
          >
            <div className="overview__slide-wrap">
              <SlideRenderer slide={slide} mini step={Infinity} />
            </div>
            <span className="overview__label">
              {i + 1}{slide.title ? ` \u00B7 ${slide.title}` : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
