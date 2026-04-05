export default function ImageLayout({ slots }) {
  return (
    <div className="layout-image">
      {Object.values(slots)}
    </div>
  );
}
