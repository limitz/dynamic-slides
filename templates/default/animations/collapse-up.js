export default function collapseUp(el, { delay = 0 } = {}) {
  el.animate(
    [
      { transform: 'translateY(0)',     opacity: 1 },
      { transform: 'translateY(-32px)', opacity: 0 },
    ],
    { duration: 500, delay, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' }
  );
}
