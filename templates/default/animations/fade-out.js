export default function fadeOut(el, { delay = 0 } = {}) {
  el.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: 400, delay, easing: 'ease', fill: 'forwards' }
  );
}
