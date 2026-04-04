export default function fadeIn(el, { delay = 0 } = {}) {
  el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: 400, delay, easing: 'ease', fill: 'backwards' }
  );
}
