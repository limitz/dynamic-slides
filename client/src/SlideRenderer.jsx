import { useRef, useLayoutEffect } from 'react';
import { loadAnimation } from './AnimationLoader';
import Animated from './Animated';
import ModuleLoader from './ModuleLoader';

// Animates a <li> directly (can't wrap li in a div without breaking list semantics)
function AnimatedLi({ text, animate, delay = 0, visible, triggerAnim }) {
  const ref = useRef(null);
  const firedRef = useRef(false);

  useLayoutEffect(() => {
    if (!triggerAnim || firedRef.current || !animate || !ref.current) return;
    firedRef.current = true;
    loadAnimation(animate).then(fn => {
      if (!fn || !ref.current) return;
      fn(ref.current, { delay });
      ref.current.style.opacity = '';
    });
  }, [triggerAnim]);

  return (
    <li
      ref={ref}
      style={(!visible || animate) ? { opacity: 0, pointerEvents: visible ? undefined : 'none' } : undefined}
    >
      {text}
    </li>
  );
}

// Bullets: items can be strings or { text, animate, delay, fragment }
function Bullets({ items, step = Infinity }) {
  if (!items?.length) return null;
  let fragCount = 0;
  return (
    <ul className="slide__bullets">
      {items.map((item, i) => {
        const isObj = typeof item === 'object' && item !== null;
        const text       = isObj ? item.text      : item;
        const animate    = isObj ? item.animate    : null;
        const delay      = isObj ? (item.delay ?? 0) : 0;
        const isFragment = isObj && item.fragment;
        const fragIdx    = isFragment ? ++fragCount : 0;
        const visible    = !isFragment || step >= fragIdx;

        return (
          <AnimatedLi
            key={i}
            text={text}
            animate={animate}
            delay={delay}
            visible={visible}
            triggerAnim={visible}
          />
        );
      })}
    </ul>
  );
}

// Wrap a heading/body element with an optional entrance animation
function El({ tag: Tag, content, animate, delay, className }) {
  if (!content) return null;
  const el = <Tag className={className}>{content}</Tag>;
  if (!animate) return el;
  return <Animated name={animate} delay={delay}>{el}</Animated>;
}

export default function SlideRenderer({ slide, mini = false, step = Infinity }) {
  if (!slide) return <div className="slide slide--empty">No slides loaded</div>;

  const cls = `slide slide--${slide.layout || 'default'}${mini ? ' slide--mini' : ''}`;
  const c = slide.content || {};

  switch (slide.layout) {
    case 'title':
      return (
        <div className={cls}>
          <El tag="h1" content={c.heading}    animate={c.heading_animate}    delay={c.heading_delay    ?? 0} />
          <El tag="h2" content={c.subheading} animate={c.subheading_animate} delay={c.subheading_delay ?? 150} />
        </div>
      );

    case 'content':
      return (
        <div className={cls}>
          <El tag="h2" content={c.heading} animate={c.heading_animate} delay={c.heading_delay ?? 0} />
          <El tag="p"  content={c.body}    animate={c.body_animate}    delay={c.body_delay    ?? 100} />
          <Bullets items={c.bullets} step={step} />
        </div>
      );

    case 'bullets':
      return (
        <div className={cls}>
          <El tag="h2" content={c.heading} animate={c.heading_animate} delay={c.heading_delay ?? 0} />
          <Bullets items={c.bullets} step={step} />
        </div>
      );

    case 'split':
      return (
        <div className={cls}>
          <El tag="h2" content={c.heading} animate={c.heading_animate} delay={c.heading_delay ?? 0} />
          <div className="slide__columns">
            <div className="slide__left">
              <El tag="p"  content={c.left}    animate={c.left_animate}    delay={c.left_delay    ?? 100} />
              <Bullets items={c.left_bullets}  step={step} />
            </div>
            <div className="slide__right">
              <El tag="p" content={c.right} animate={c.right_animate} delay={c.right_delay ?? 100} />
              <Bullets items={c.right_bullets} step={step} />
            </div>
          </div>
        </div>
      );

    case 'custom':
      return (
        <div className={cls}>
          {!mini && <ModuleLoader path={slide.module} slide={slide} />}
          {mini  && <div className="slide__module-label">{slide.module || 'custom'}</div>}
        </div>
      );

    case 'blank':
      return <div className={cls} />;

    default:
      return (
        <div className={cls}>
          <El tag="h2" content={c.heading} animate={c.heading_animate} delay={c.heading_delay ?? 0} />
          <El tag="p"  content={c.body}    animate={c.body_animate}    delay={c.body_delay    ?? 100} />
          <Bullets items={c.bullets} step={step} />
        </div>
      );
  }
}
