import { useState } from 'react';
import { usePresentationContext } from '../PresentationContext';

/**
 * Demo module: an interactive counter.
 * Shows how to use slide content props and access presentation context.
 *
 * TOML usage:
 *   [[slide]]
 *   id = "demo"
 *   layout = "custom"
 *   module = "modules/Counter.jsx"
 *
 *     [slide.content]
 *     heading = "Counter Demo"
 *     start = 0
 */
export default function Counter({ slide }) {
  const { state } = usePresentationContext();
  const [count, setCount] = useState(Number(slide.content?.start ?? 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
      {slide.content?.heading && <h2>{slide.content.heading}</h2>}
      <div style={{ fontSize: '6rem', fontWeight: 700, lineHeight: 1 }}>{count}</div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={() => setCount(c => c - 1)} style={btnStyle}>−</button>
        <button onClick={() => setCount(Number(slide.content?.start ?? 0))} style={btnStyle}>Reset</button>
        <button onClick={() => setCount(c => c + 1)} style={btnStyle}>+</button>
      </div>
      <div style={{ fontSize: '0.8rem', opacity: 0.3 }}>
        slide {state.currentIndex + 1} of {state.slides.length}
      </div>
    </div>
  );
}

const btnStyle = {
  padding: '0.6rem 1.5rem',
  fontSize: '1.5rem',
  background: '#2a2a2a',
  border: '1px solid #444',
  borderRadius: '6px',
  color: '#eee',
  cursor: 'pointer',
};
