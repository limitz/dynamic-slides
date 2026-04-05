export default function TitleLayout({ slots }) {
  return (
    <div className="layout-title">
      {slots.heading}
      {slots.subheading}
      {/* Fall back to rendering all slots if no named ones match */}
      {!slots.heading && !slots.subheading && Object.values(slots)}
    </div>
  );
}
