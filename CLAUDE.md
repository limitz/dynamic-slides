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

## Authoring

Edit `presentation.toml` directly — the server watches it and the browser updates automatically.

## Controlling the presentation (Claude tools)

```bash
node present-ctl.js state          # get current slide + total
node present-ctl.js next           # advance one slide
node present-ctl.js prev           # go back one slide
node present-ctl.js goto <id>      # jump to slide by id
node present-ctl.js reload         # force reload script from disk
```

Set `PRESENT_URL=http://192.168.x.x:3001` to control a server on another machine.

## TOML script format

```toml
[meta]
title = "Title"
author = "Name"
theme = "dark"

[[slide]]
id = "unique-id"          # used by goto command
layout = "title"          # title | content | bullets | split | blank | custom
transition = "fade"       # optional

  [slide.content]
  heading = "Heading"
  subheading = "Subtitle"   # title layout
  body = "Paragraph text"   # content layout
  bullets = ["a", "b"]      # bullets / content / split layout
  left = "Left text"        # split layout
  right = "Right text"      # split layout
  left_bullets = ["a"]      # split layout
  right_bullets = ["b"]     # split layout
  notes = "Speaker notes"   # shown in /controller view only
  module = "modules/Foo.jsx" # custom layout only
```

## Custom modules

Place React components in `client/src/modules/`. They receive `{ slide }` as props and can call `usePresentationContext()` to access `{ state, send, next, prev, goTo }`.

```jsx
import { usePresentationContext } from '../PresentationContext';

export default function MyModule({ slide }) {
  const { state, next } = usePresentationContext();
  return <div>Slide {state.currentIndex + 1}</div>;
}
```

Reference in TOML:
```toml
layout = "custom"
module = "modules/MyModule.jsx"
```
