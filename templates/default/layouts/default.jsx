export default function DefaultLayout({ slots }) {
  return (
    <div className="layout-default">
      {Object.values(slots)}
    </div>
  );
}
