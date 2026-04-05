import { useRef, useLayoutEffect } from 'react';
import { loadAnimation } from './AnimationLoader';
import LayoutLoader from './LayoutLoader';
import ModuleLoader from './ModuleLoader';

/**
 * Play an enter animation once when trigger becomes true.
 * Animation plugins export { keyframes, options }.
 * Legacy function plugins are also supported.
 */
function useAnimation(ref, animation, trigger) {
  const firedRef = useRef(false);

  useLayoutEffect(() => {
    if (!trigger || firedRef.current || !animation || !ref.current) return;
    firedRef.current = true;

    loadAnimation(animation.name).then(plugin => {
      if (!plugin || !ref.current) return;
      const el = ref.current;

      if (typeof plugin === 'function') {
        plugin(el, { delay: animation.delay || 0 });
      } else {
        el.animate(plugin.keyframes, {
          ...plugin.options, delay: animation.delay || 0, fill: 'both',
        });
      }
    });
  }, [trigger]);
}

/**
 * Renders a single bullet item with reveal and enter animation.
 * Hidden bullets use display:none so they never affect layout.
 */
function BulletItem({ bullet, step }) {
  const ref = useRef(null);
  const visible = bullet.reveal == null || step >= bullet.reveal;

  useAnimation(ref, bullet.enter, visible);

  return (
    <li
      ref={ref}
      className={bullet.class || undefined}
      style={{
        display: visible ? undefined : 'none',
        opacity: visible && bullet.enter ? 0 : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: bullet.html }}
    />
  );
}

/**
 * Renders a segment (content + bullets), respecting reveal.
 */
function Segment({ segment, step, parentReveal }) {
  const effectiveReveal = segment.reveal ?? parentReveal;
  const visible = effectiveReveal == null || step >= effectiveReveal;

  if (!visible) return null;

  return (
    <>
      {segment.content && (
        <div dangerouslySetInnerHTML={{ __html: segment.content }} />
      )}
      {segment.bullets.length > 0 && (
        <ul className="slide__bullets">
          {segment.bullets.map((bullet, i) => (
            <BulletItem key={i} bullet={bullet} step={step} />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Renders a section with enter animation and reveal support.
 * Hidden sections use display:none so they never affect layout.
 */
function Section({ section, step }) {
  const ref = useRef(null);
  const visible = section.reveal == null || step >= section.reveal;

  useAnimation(ref, section.enter, visible);

  if (section.module) {
    return (
      <div
        ref={ref}
        className={section.class || undefined}
        style={{
          display: visible ? undefined : 'none',
          opacity: visible && section.enter ? 0 : undefined,
        }}
      >
        {section.title && <h2>{section.title}</h2>}
        {visible && <ModuleLoader path={section.module} section={section} />}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={section.class || undefined}
      style={{
        display: visible ? undefined : 'none',
        opacity: visible && section.enter ? 0 : undefined,
      }}
    >
      {section.title && <h2>{section.title}</h2>}
      {section.segments.map((seg, i) => (
        <Segment key={i} segment={seg} step={step} parentReveal={section.reveal} />
      ))}
    </div>
  );
}

/**
 * Builds a slot map from sections for layout components.
 * Sections with IDs become named slots; sections without IDs
 * are collected under a numeric key.
 */
function buildSlots(sections, step) {
  const slots = {};
  let unnamed = 0;

  for (const section of sections) {
    // Handle dot-notation: "body.col1" -> top-level key is the first segment
    const id = section.id || String(unnamed++);
    slots[id] = <Section key={id} section={section} step={step} />;
  }

  return slots;
}

function SlideFooter({ meta, slideNum, total }) {
  if (!meta) return null;
  return (
    <div className="slide__footer">
      <span>{[meta.title, meta.author].filter(Boolean).join(' \u2014 ')}</span>
      <span>{meta.date || ''}</span>
      <span>{slideNum} / {total}</span>
    </div>
  );
}

export default function SlideRenderer({ slide, mini = false, step = Infinity, meta, slideNum, total }) {
  if (!slide) return <div className="slide slide--empty">No slides loaded</div>;

  const cls = `slide${slide.class ? ` ${slide.class}` : ''}${mini ? ' slide--mini' : ''}`;

  // Slide-level module
  if (slide.module) {
    return (
      <div className={cls}>
        {!mini && <ModuleLoader path={slide.module} slide={slide} />}
        {mini && <div style={{ opacity: 0.3 }}>{slide.module}</div>}
        {!mini && <SlideFooter meta={meta} slideNum={slideNum} total={total} />}
      </div>
    );
  }

  const slots = buildSlots(slide.sections, step);

  return (
    <div className={cls}>
      {slide.title && <h1>{slide.title}</h1>}
      <LayoutLoader layout={slide.layout} slots={slots} />
      {!mini && <SlideFooter meta={meta} slideNum={slideNum} total={total} />}
    </div>
  );
}
