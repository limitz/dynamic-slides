export default function TwoColsLayout({ slots }) {
  return (
    <div className="layout-twocols">
      {slots.left || slots.col1}
      {slots.right || slots.col2}
      {/* Fall back to rendering all slots in order */}
      {!slots.left && !slots.col1 && !slots.right && !slots.col2 && Object.values(slots)}
    </div>
  );
}
