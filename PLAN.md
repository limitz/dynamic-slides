# The Presentation Tool

## User Experience

### Creating a Presentation
Claude guides the user through an authoring session: topics, audience, style, features. As the script takes shape, a live preview server is already running — changes to the script are reflected in the browser immediately, serving as a visual aid throughout authoring.

### Presenting
`present [SCRIPT]` starts the stack. The browser shows the rendered presentation. Navigation via arrow keys, or by Claude calling the API (e.g. jump to slide, trigger effect). Claude can also update the script on the fly — the frontend updates automatically.

---

## Architecture

```
TOML script file
      │
      ▼
Express API server (control plane)
      │  ├── REST: Claude calls this (jump, update, reload)
      │  └── WebSocket: pushes state changes to frontend
      │
      ▼
Vite + React frontend
      │
      └── Slide renderer + custom module loader
```

### Components

**Script (`presentation.toml`)**
- Defines slides, layout, style/theme, transitions, and module references
- Hand-editable; Claude edits this file during authoring and live updates

**Express server**
- Watches the script file for changes (chokidar)
- Exposes REST endpoints for Claude to call as tools
- Broadcasts state over WebSocket to all connected frontends

**Vite + React frontend**
- Connects to WebSocket on load
- Renders slides from script state pushed by server
- Loads custom modules (arbitrary React components) by reference
- Handles keyboard navigation locally, reports to server

**Custom modules**
- Arbitrary React components in `.jsx`/`.tsx` files
- Referenced by path in the TOML script
- Have access to WebSocket context for live data / interactivity
- Loaded dynamically at runtime via Vite's import mechanism

---

## Script Format (TOML)

```toml
[meta]
title = "My Presentation"
author = "wipkat"
theme = "dark"

[[slide]]
id = "intro"
layout = "title"
transition = "fade"

  [slide.content]
  heading = "Hello World"
  subheading = "A subtitle"
  notes = "Mention the backstory here."

[[slide]]
id = "data-demo"
layout = "custom"
module = "./modules/LiveChart.jsx"
transition = "slide"

  [slide.content]
  datasource = "ws://localhost:4001/feed"
```

---

## API Endpoints (Claude's tools)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/slide/:id` | Jump to slide by id |
| POST | `/slide/next` | Next slide |
| POST | `/slide/prev` | Previous slide |
| PATCH | `/script` | Update script content (triggers reload) |
| POST | `/reload` | Force full reload from disk |
| GET | `/state` | Get current presentation state |

---

## Implementation Phases

### Phase 1 — Core server + basic rendering
- Express server with WebSocket (ws or socket.io)
- Vite + React scaffold
- TOML parser (server-side, `@iarna/toml` or `smol-toml`)
- Render a hardcoded slide set to validate the pipeline
- WebSocket state push working end-to-end

### Phase 2 — Script-driven rendering
- Define TOML schema for slides, layouts, content
- Script file watcher (chokidar) → parse → broadcast to frontend
- Frontend renders slides from received state
- Built-in layouts: `title`, `content`, `split`, `blank`

### Phase 3 — Navigation
- Keyboard navigation in main view (arrow keys)
- REST endpoints: next, prev, jump-to-id
- Current slide state tracked server-side, broadcast to all connected clients
- Overview mode: grid of all slides, toggle with a key (e.g. `Tab`), click to jump
- `/controller` route — mobile presenter view with: slide list, next/prev buttons, speaker notes
- Speaker notes field in TOML per slide, rendered only in controller view
- Bidirectional sync: mobile commands update main view; keyboard in main view updates mobile

### Phase 4 — Custom modules
- Dynamic React component loading via Vite
- Module referenced by path in TOML
- Module receives slide content + WebSocket context as props
- Basic error boundary so broken modules don't crash the presentation

### Phase 5 — Claude tooling
- Define Claude tools wrapping the REST API
- Claude can: jump, update script, reload, get state
- Test authoring workflow: Claude edits TOML, preview updates live

### Phase 6 — Polish
- Transitions (CSS or Framer Motion)
- Theme system in TOML (colors, fonts, spacing)
- Fullscreen mode
- Speaker notes (hidden from audience view)
- Export to static HTML (optional)

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `vite` + `@vitejs/plugin-react` | Frontend build + HMR |
| `express` | API server |
| `ws` | WebSocket |
| `chokidar` | File watching |
| `smol-toml` | TOML parsing (fast, zero-dep) |
| `framer-motion` | Transitions (Phase 6) |
