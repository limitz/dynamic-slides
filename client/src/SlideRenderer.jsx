import ModuleLoader from './ModuleLoader';

function Bullets({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="slide__bullets">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

export default function SlideRenderer({ slide, mini = false }) {
  if (!slide) return <div className="slide slide--empty">No slides loaded</div>;

  const cls = `slide slide--${slide.layout || 'default'}${mini ? ' slide--mini' : ''}`;

  switch (slide.layout) {
    case 'title':
      return (
        <div className={cls}>
          <h1>{slide.content?.heading}</h1>
          {slide.content?.subheading && <h2>{slide.content.subheading}</h2>}
        </div>
      );
    case 'content':
      return (
        <div className={cls}>
          {slide.content?.heading && <h2>{slide.content.heading}</h2>}
          {slide.content?.body && <p>{slide.content.body}</p>}
          <Bullets items={slide.content?.bullets} />
        </div>
      );
    case 'bullets':
      return (
        <div className={cls}>
          {slide.content?.heading && <h2>{slide.content.heading}</h2>}
          <Bullets items={slide.content?.bullets} />
        </div>
      );
    case 'split':
      return (
        <div className={cls}>
          <div className="slide__left">
            {slide.content?.heading && <h2>{slide.content.heading}</h2>}
            {slide.content?.left && <p>{slide.content.left}</p>}
            <Bullets items={slide.content?.left_bullets} />
          </div>
          <div className="slide__right">
            {slide.content?.right && <p>{slide.content.right}</p>}
            <Bullets items={slide.content?.right_bullets} />
          </div>
        </div>
      );
    case 'custom':
      return (
        <div className={cls}>
          {!mini && <ModuleLoader path={slide.module} slide={slide} />}
          {mini && (
            <div className="slide__module-label">{slide.module || 'custom'}</div>
          )}
        </div>
      );
    case 'blank':
      return <div className={cls} />;
    default:
      return (
        <div className={cls}>
          {slide.content?.heading && <h2>{slide.content.heading}</h2>}
          {slide.content?.body && <p>{slide.content.body}</p>}
          <Bullets items={slide.content?.bullets} />
        </div>
      );
  }
}
