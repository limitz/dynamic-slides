export default function SlideRenderer({ slide }) {
  if (!slide) return <div className="slide slide--empty">No slides loaded</div>;

  switch (slide.layout) {
    case 'title':
      return (
        <div className="slide slide--title">
          <h1>{slide.content?.heading}</h1>
          {slide.content?.subheading && <h2>{slide.content.subheading}</h2>}
        </div>
      );
    case 'content':
      return (
        <div className="slide slide--content">
          {slide.content?.heading && <h2>{slide.content.heading}</h2>}
          <p>{slide.content?.body}</p>
        </div>
      );
    case 'split':
      return (
        <div className="slide slide--split">
          <div className="slide__left">
            {slide.content?.heading && <h2>{slide.content.heading}</h2>}
            <p>{slide.content?.left}</p>
          </div>
          <div className="slide__right">
            <p>{slide.content?.right}</p>
          </div>
        </div>
      );
    case 'blank':
      return <div className="slide slide--blank" />;
    default:
      return (
        <div className="slide slide--default">
          {slide.content?.heading && <h2>{slide.content.heading}</h2>}
          {slide.content?.body && <p>{slide.content.body}</p>}
        </div>
      );
  }
}
