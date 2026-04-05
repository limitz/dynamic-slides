export default function fadeDown(el, { delay = 0 } = {}) {
  el.animate(
    [
      { transform: 'translateY(0)',    opacity: 1 },
      { transform: 'translateY(18px)', opacity: 0 },
    ],
    { duration: 450, delay, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
  );
}
