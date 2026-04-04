---
name: dynamic-slides
description: Skill for authoring and controlling slide presentations. Use this skill whenever the user asks to create, edit, or control a slide presentation, navigate slides, change themes, add or remove slides, modify slide content, start or stop the presentation server, or anything related to presenting. Also triggers for "go to slide", "next slide", "add a slide about X", "change the theme", "start the presentation", etc.
---

# Dynamic Slides

You are controlling a presentation tool. The tool code lives at `${CLAUDE_SKILL_DIR}`. The user's presentation data (`presentation.toml` and custom modules) lives in the user's **current working directory**.

## First-Time Setup

If `${CLAUDE_SKILL_DIR}/slide-engine/node_modules` does not exist, run setup first:

```bash
bash ${CLAUDE_SKILL_DIR}/setup.sh
```

## Project Directory Structure

The user's working directory can contain:

```
my-project/
├── presentation.toml       # slide content (required)
├── slides.css              # custom transition CSS (optional)
├── animations/             # custom animation plugins (optional)
│   └── my-anim.js
├── modules/                # custom React components (optional)
│   └── MyChart.jsx
└── assets/                 # images, videos, etc. (optional)
    └── logo.png            # referenced as /assets/logo.png in content
```

The tool loads from the user's project first, falling back to built-ins.

## Creating a Presentation

If there is no `presentation.toml` in the user's working directory, create one with a starter template:

```toml
[meta]
title = "Title"
author = "Name"
theme = "dark"          # dark | light | terminal | paper
transition = "fade"     # fade | slide | zoom | none
duration = 10           # max duration in minutes (shown in controller)
warn_before = 2         # warn this many minutes before end

[[slide]]
id = "intro"
layout = "title"
  [slide.content]
  heading = "Title"
  subheading = "Subtitle"
```

## Quick Start

Check if the engine is already running:

```bash
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js state
```

If it errors, start the stack. Run these two commands (the viewer must be started from its own directory):

```bash
SCRIPT="$(pwd)/presentation.toml" nohup node ${CLAUDE_SKILL_DIR}/slide-engine/index.js > /dev/null 2>&1 &
SLIDES_PROJECT_DIR="$(pwd)" nohup npx --prefix ${CLAUDE_SKILL_DIR}/slide-viewer vite --config ${CLAUDE_SKILL_DIR}/slide-viewer/vite.config.js > /dev/null 2>&1 &
```

> **Note:** The viewer command must be run with the working directory set to `${CLAUDE_SKILL_DIR}/slide-viewer`, otherwise Vite cannot find `index.html` and returns 404. Use `cd ${CLAUDE_SKILL_DIR}/slide-viewer &&` before the viewer command if needed, or verify with `curl -s http://localhost:5173 | head -1` — a successful start returns `<!doctype html>`, not an empty response.

- Presentation: http://localhost:5173
- Controller: http://localhost:5173/controller

## Controlling the Presentation

```bash
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js state          # get current slide + total
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js next           # advance one step (fragment or slide)
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js prev           # go back one step
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js goto <id>      # jump to slide by id
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js reload         # force reload from disk
```

When the user says "next", "go to slide X", "previous", etc., run the corresponding command. After navigation, run `state` to confirm and tell the user where they are.

## Editing the Presentation

Edit `presentation.toml` in the user's working directory. The engine watches it and the browser updates automatically — no restart needed.

### Meta + Theme

```toml
[meta]
title = "Title"
author = "Name"
theme = "dark"          # dark | light | terminal | paper
transition = "fade"     # fade | slide | zoom | none
duration = 10           # max duration in minutes (shown in controller)
warn_before = 2         # warn this many minutes before end
```

### Slide Layouts

Every slide needs an `id` (used by goto) and a `layout`.

**title** — Big heading + subtitle. Use for opening/closing slides.
```toml
[[slide]]
id = "intro"
layout = "title"
  [slide.content]
  heading = "Main heading"
  subheading = "Subtitle"
  heading_animate = "fade-up"
  subheading_animate = "fade-up"
  notes = "Speaker notes for controller view"
```

**content** — Heading + body text + optional bullets.
```toml
[[slide]]
id = "topic-1"
layout = "content"
  [slide.content]
  heading = "Heading"
  body = "Paragraph text"
  body_animate = "fade-up"
  bullets = ["Point A", "Point B"]
```

**bullets** — Heading + bullet list. Supports fragment reveals.
```toml
[[slide]]
id = "agenda"
layout = "bullets"
  [slide.content]
  heading = "Agenda"

  [[slide.content.bullets]]
  text = "Visible immediately"
  animate = "fade-up"

  [[slide.content.bullets]]
  text = "Revealed on next press"
  animate = "fade-up"
  fragment = true

  [[slide.content.bullets]]
  text = "Revealed on second next press"
  animate = "fade-up"
  fragment = true
```

**split** — Two columns. Heading spans both columns.
```toml
[[slide]]
id = "compare"
layout = "split"
  [slide.content]
  heading = "Comparison"
  left = "Left column text"
  right = "Right column text"
  left_bullets = ["a", "b"]
  right_bullets = ["c", "d"]
```

**image** — Full-slide image with optional heading and caption. Place files in `assets/`.
```toml
[[slide]]
id = "photo"
layout = "image"
  [slide.content]
  src = "/assets/photo.jpg"
  alt = "Description"
  heading = "Optional heading"
  caption = "Optional caption"
  fit = "contain"    # contain | cover (default: contain)
```

**video** — Full-slide video with optional heading and caption.
```toml
[[slide]]
id = "demo"
layout = "video"
  [slide.content]
  src = "/assets/demo.mp4"
  heading = "Optional heading"
  caption = "Optional caption"
  autoplay = true    # default: false
  loop = false       # default: false
  muted = true       # default: true
  controls = true    # default: false
```

Images can also appear inside **split** columns using `left_image` / `right_image`:
```toml
[[slide]]
id = "compare"
layout = "split"
  [slide.content]
  heading = "Before & After"
  left_image = "/assets/before.jpg"
  right_image = "/assets/after.jpg"
```

**blank** — Empty slide.

**custom layouts** — Any unrecognised `layout` value is loaded as a React component from `layouts/` in the project directory (falling back to `${CLAUDE_SKILL_DIR}/slide-viewer/src/layouts/`).

```
my-project/
└── layouts/
    └── my-layout.jsx   # used with layout = "my-layout"
```

A layout component receives these props:
```jsx
export default function MyLayout({ slide, step, meta, slideNum, total, mini }) {
  const c = slide.content || {};
  return (
    <div className={`slide slide--my-layout${mini ? ' slide--mini' : ''}`}>
      <h2>{c.heading}</h2>
      {/* ...custom content... */}
    </div>
  );
}
```

**custom** — React component from `${CLAUDE_SKILL_DIR}/slide-viewer/src/modules/`.
```toml
[[slide]]
id = "demo"
layout = "custom"
module = "modules/MyComponent.jsx"
  [slide.content]
  some_data = "passed as props"
```

### Animations

Element entrance animations: `fade-up`, `fade-in`, `slide-up`. Apply with `heading_animate`, `body_animate`, `animate` on bullets. Use `delay` (ms) to stagger.

Slide transitions: `fade`, `slide`, `zoom`, `none`. Set globally in `[meta]` or per-slide with `transition = "zoom"`.

### Fragments

Bullets with `fragment = true` are revealed one at a time on "next" press before advancing to the next slide. Non-fragment bullets appear immediately when the slide loads.

## Workflow Tips

- When the user asks to "add a slide about X", append a `[[slide]]` block to `presentation.toml` in the user's working directory.
- When the user asks to change content, read `presentation.toml` first, find the relevant slide by id, and edit it.
- When the user says "go to slide 3", use `goto` with the slide's id (read the toml to find it).
- Always confirm navigation by running `state` after.
- The footer on each slide automatically shows title, author, date, and slide number.
