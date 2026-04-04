# Presentation Tool

## Starting the stack

```bash
# Terminal 1 — server (port 3001)
node server/index.js

# Terminal 2 — frontend (port 5173)
cd client && npx vite
```

- Presentation view: http://localhost:5173
- Controller (mobile): http://localhost:5173/controller

## Keyboard shortcuts (presentation view)

| Key | Action |
|-----|--------|
| `→` / `↓` | Next slide / next fragment |
| `←` / `↑` | Previous slide / previous fragment |
| `Tab` | Toggle overview grid |
| `Escape` | Close overview |
| `F` | Toggle fullscreen |

## Authoring

Edit `presentation.toml` directly — the server watches it and the browser updates automatically.

## Controlling the presentation (Claude tools)

```bash
node present-ctl.js state          # get current slide + total
node present-ctl.js next           # advance one step/slide
node present-ctl.js prev           # go back one step/slide
node present-ctl.js goto <id>      # jump to slide by id (resets step to 0)
node present-ctl.js reload         # force reload script from disk
```

Set `PRESENT_URL=http://192.168.x.x:3001` to control a server on another machine.

---

## TOML script reference

### Meta + theme

```toml
[meta]
title = "Title"
author = "Name"
theme = "dark"        # dark | light | terminal | paper
transition = "fade"   # global default transition for all slides

[theme]               # optional per-value overrides
accent = "#e11d48"
font_heading = "Georgia, serif"
bg = "#0a0a0a"
```

### Slide structure

```toml
[[slide]]
id = "unique-id"       # required for goto command
layout = "title"       # see layouts below
transition = "zoom"    # overrides meta.transition for this slide
                       # values: fade | slide | zoom | none | <custom plugin name>
  [slide.content]
  notes = "Speaker notes — shown only in /controller view"
  # ... layout-specific fields below
```

### Layouts

**title**
```toml
layout = "title"
  [slide.content]
  heading = "Main heading"
  subheading = "Subtitle"
  heading_animate = "fade-up"      # optional entrance animation
  subheading_animate = "fade-up"   # optional
  subheading_delay = 150           # ms, default 150
```

**content**
```toml
layout = "content"
  [slide.content]
  heading = "Heading"
  body = "Paragraph text"
  heading_animate = "fade-up"
  body_animate = "fade-up"
  body_delay = 100
  bullets = ["simple string bullet", "another"]   # simple form
```

**bullets**
```toml
layout = "bullets"
  [slide.content]
  heading = "Heading"
  heading_animate = "fade-up"

  # Simple bullets (strings):
  bullets = ["First", "Second", "Third"]

  # Rich bullets (objects) — can mix with fragments:
  [[slide.content.bullets]]
  text = "Always visible, animates on slide enter"
  animate = "fade-up"
  delay = 100

  [[slide.content.bullets]]
  text = "Revealed on first next press"
  animate = "fade-up"
  delay = 0
  fragment = true

  [[slide.content.bullets]]
  text = "Revealed on second next press"
  animate = "fade-up"
  fragment = true
```

**split**
```toml
layout = "split"
  [slide.content]
  heading = "Heading"
  left = "Left column text"
  right = "Right column text"
  left_animate = "fade-up"
  right_animate = "fade-up"
  right_delay = 150
  left_bullets = ["a", "b"]    # simple or rich (same format as bullets)
  right_bullets = ["c", "d"]
```

**blank**
```toml
layout = "blank"
```

**custom**
```toml
layout = "custom"
module = "modules/MyComponent.jsx"
  [slide.content]
  # arbitrary fields passed as slide.content to the component
```

---

## Fragment reveals

Fragments are bullet items with `fragment = true`. Pressing next steps through them before advancing to the next slide. Going backward lands on the last step (all fragments visible).

- `state.currentStep` tracks which step we're on (0 = no fragments revealed)
- Step resets to 0 when jumping to a slide via `goto`

---

## Entrance animations

Applied to individual elements when the slide appears (or when a fragment is revealed).

### Built-in animations
| Name | Effect |
|------|--------|
| `fade-up` | Fade in while rising 18px |
| `fade-in` | Fade in only |
| `slide-up` | Slide up 32px with bounce easing |

### Custom animation plugin

Create `client/src/animations/my-anim.js`:

```js
export default function myAnim(el, { delay = 0 } = {}) {
  el.animate(
    [
      { transform: 'scale(0.8)', opacity: 0 },
      { transform: 'scale(1)',   opacity: 1 },
    ],
    { duration: 400, delay, easing: 'ease', fill: 'backwards' }
  );
}
```

Use as `animate = "my-anim"` or `heading_animate = "my-anim"` in TOML. No registration needed — picked up automatically.

---

## Transition plugins

### Built-in transitions
| Name | Effect |
|------|--------|
| `fade` | Crossfade |
| `slide` | Slide in/out (direction-aware) |
| `zoom` | Scale in/out |
| `none` | Instant |

### Custom transition plugin

Transitions are pure CSS. Add `.slide-enter--name` and `.slide-exit--name` classes to
`client/src/index.css` (or any imported CSS file). Use `animation-fill-mode: both` so the
`from` state is applied before the first paint (prevents flash).

```css
@keyframes flip-in  { from { transform: rotateY(90deg);  opacity: 0 } to { transform: rotateY(0);  opacity: 1 } }
@keyframes flip-out { from { transform: rotateY(0);  opacity: 1 } to { transform: rotateY(-90deg); opacity: 0 } }

.slide-enter--flip { animation: flip-in  500ms ease both; }
.slide-exit--flip  { animation: flip-out 500ms ease both; }
```

For direction-aware transitions, also define `.dir-forward` and `.dir-backward` variants:
```css
.slide-enter--slide.dir-forward  { animation: ... }
.slide-enter--slide.dir-backward { animation: ... }
```

Use as `transition = "flip"` in TOML. No registration needed.

---

## Custom modules

Place React components in `client/src/modules/`. They receive `{ slide }` as props and can call `usePresentationContext()` to access `{ state, send, next, prev, goTo }`.

`state.currentStep` is available in context — useful for modules that want to react to fragment reveals.

```jsx
import { usePresentationContext } from '../PresentationContext';

export default function MyModule({ slide }) {
  const { state, next } = usePresentationContext();
  return <div>Slide {state.currentIndex + 1}, step {state.currentStep}</div>;
}
```

Reference in TOML:
```toml
layout = "custom"
module = "modules/MyModule.jsx"
  [slide.content]
  some_data = "passed as slide.content.some_data"
```
