import { useRef, useLayoutEffect } from 'react';
import { loadAnimation } from './AnimationLoader';
import LayoutLoader from './LayoutLoader';
import ModuleLoader from './ModuleLoader';

/**
 * Animate an element using the Web Animation API.
 * Expects opacity:0 as initial state for enter animations.
 * All animations use fill:'forwards' — no snap-back.
 */
function useAnimation(ref, animation, trigger) {
  const firedRef = useRef(false);
  const animsRef = useRef([]);

  useLayoutEffect(() => {
    if (!animation || !ref.current) return;

    if (trigger && !firedRef.current) {
      // Fire the animation
      firedRef.current = true;
      const el = ref.current;
      const before = el.getAnimations();
      loadAnimation(animation.name).then(fn => {
        if (!fn || !ref.current) return;
        fn(ref.current, { delay: animation.delay || 0 });
        // Track new animations so we can cancel them on revert
        animsRef.current = el.getAnimations().filter(a => !before.includes(a));
      });
    } else if (!trigger && firedRef.current) {
      // Trigger reverted (e.g. backward navigation) — cancel the animation
      // so its fill effect doesn't persist
      for (const a of animsRef.current) {
        a.cancel();
      }
      animsRef.current = [];
      firedRef.current = false;
    }
  }, [trigger]);
}

/**
 * Renders a single bullet item with reveal/dismiss/animation support.
 */
function BulletItem({ bullet, step }) {
  const ref = useRef(null);
  const visible = bullet.reveal == null || step >= bullet.reveal;
  const dismissed = bullet.dismiss != null && step >= bullet.dismiss;
  const showEnter = visible && !dismissed;

  useAnimation(ref, bullet.enter, showEnter);
  useAnimation(ref, bullet.exit, dismissed);

  const hidden = !visible || (dismissed && !bullet.exit);

  return (
    <li
      ref={ref}
      className={bullet.class || undefined}
      style={{
        opacity: hidden || bullet.enter ? 0 : undefined,
        display: hidden && !bullet.enter ? 'none' : undefined,
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
 * Renders a section with enter/exit animation and reveal/dismiss support.
 */
function Section({ section, step }) {
  const ref = useRef(null);
  const visible = section.reveal == null || step >= section.reveal;
  const dismissed = section.dismiss != null && step >= section.dismiss;
  const showEnter = visible && !dismissed;

  useAnimation(ref, section.enter, showEnter);
  useAnimation(ref, section.exit, dismissed);

  const hidden = !visible || (dismissed && !section.exit);

  // Module sections render the module instead of content
  if (section.module) {
    return (
      <div
        ref={ref}
        className={section.class || undefined}
        style={{
          opacity: hidden || section.enter ? 0 : undefined,
          display: hidden && !section.enter ? 'none' : undefined,
        }}
      >
        {section.title && <h2>{section.title}</h2>}
        {showEnter && <ModuleLoader path={section.module} section={section} />}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={section.class || undefined}
      style={{
        opacity: hidden || section.enter ? 0 : undefined,
        display: hidden && !section.enter ? 'none' : undefined,
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
