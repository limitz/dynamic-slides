---
name: dynamic-slides
description: Skill for authoring and controlling slide presentations. Use this skill whenever the user asks to create, edit, or control a slide presentation, navigate slides, add or remove slides, modify slide content, start or stop the presentation server, or anything related to presenting. Also triggers for "go to slide", "next slide", "add a slide about X", "start the presentation", etc.
---

# Dynamic Slides

You are controlling a presentation tool. The tool code lives at `${CLAUDE_SKILL_DIR}`. The user's presentation lives in their **current working directory** as a Markdown file (`script.md`).

## First-Time Setup

If `${CLAUDE_SKILL_DIR}/slide-engine/node_modules` does not exist, run setup first:

```bash
bash ${CLAUDE_SKILL_DIR}/setup.sh
```

## Project Directory Structure

When starting a new presentation, copy the default template to the user's project dir and install dependencies:

```bash
cp -r ${CLAUDE_SKILL_DIR}/templates/default/* "$(pwd)"/
npm install
```

This gives the user a self-contained project:

```
my-project/
├── index.html          # Vite entry (do not edit)
├── vite.config.js      # Vite config (do not edit)
├── src/                # viewer source (do not edit)
├── style.css           # template stylesheet (user edits this)
├── script.md           # presentation content (required)
├── layouts/            # JSX layout components (optional)
│   └── my-layout.jsx
├── animations/         # animation plugins (optional)
│   └── my-anim.js
├── modules/            # custom React components (optional)
│   └── MyChart.jsx
└── assets/             # images, videos, etc. (optional)
    └── logo.png
```

## Script Format (Markdown)

The presentation is written in Markdown with `{key=value .class #id}` attributes (Pandoc-style). Parsed with markdown-it + markdown-it-attrs.

### Structure

- `# Title {author=Name date=2024-01-01}` — Presentation title + meta (all attributes become key/value pairs)
- `## Slide Title {layout=name enter=fade@500 exit=zoom .classname}` — Slide boundary
- `<!-- Speaker notes here -->` — Notes (HTML comment right after `##`)
- `### Section Header {#element-id reveal=0 enter=fade-up@200}` — Section within slide
- `### {#id}` — Headerless section (entire heading is just attributes)
- `* Bullet text {enter=fade reveal=1 exit=fade-out dismiss=3}` — Bullets (attributes at END)
- `--- {reveal=3}` — Paragraph separator with reveal

### Attributes

| Attribute | Where | Description |
|-----------|-------|-------------|
| `layout=name` | `##`, `###` | Layout component to use (default, title, twocols, image, blank) |
| `#id` | `###` | Element ID for layout slot targeting (dot-notation for nesting: `#body.col1`) |
| `.classname` | `##`, `###`, `*` | CSS class |
| `enter=name@delay` | `##`, `###`, `*` | Enter animation (e.g. `fade-up@200`) |
| `exit=name@delay` | `##`, `###`, `*` | Exit animation |
| `reveal=N` | `###`, `*`, `---` | Show at reveal step N (`reveal=0` = show when slide enters) |
| `dismiss=M` | `###`, `*` | Start exit animation at step M (defaults to `reveal+1`) |
| `module=Name` | `##`, `###` | Load a custom React module |

### Transition Rules

- Enter transition: element starts at `opacity: 0`, animation brings it in
- Exit transition: animates element out (typically to invisible)
- All transitions retain final state (`fill: 'forwards'`) — no snap-back
- Elements without transitions are simply visible/hidden based on reveal step

### Example Script

```markdown
# My Presentation {author=wipkat date=2024-01-01}

## Welcome {layout=title enter=fade}

<!-- Welcome everyone to the talk -->

### {#heading reveal=0 enter=fade-up}

A presentation tool built with Claude

## What We'll Cover {enter=fade}

### {#body reveal=0}

* First topic {enter=fade-up}
* Second topic {enter=fade-up reveal=1}
* Third topic {enter=fade-up reveal=2}

## Two Columns {layout=twocols enter=zoom}

### {#left reveal=0 enter=fade}

Left side content here.

### {#right reveal=1 enter=fade}

Right side content here.

## Thank You {layout=title enter=fade}

### {#heading reveal=0 enter=fade-up}

Questions?
```

## Quick Start

Check if the engine is already running:

```bash
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js state
```

If it errors, start the stack from the user's project directory:

```bash
SCRIPT="$(pwd)/script.md" nohup node ${CLAUDE_SKILL_DIR}/slide-engine/index.js > /dev/null 2>&1 &
nohup npx vite > /dev/null 2>&1 &
```

- Presentation: http://localhost:5173
- Controller: http://localhost:5173/controller

## Controlling the Presentation

```bash
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js state          # get current slide info
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js next           # advance one step (reveal or slide)
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js prev           # go back one step
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js goto <index>   # jump to slide by index (0-based)
node ${CLAUDE_SKILL_DIR}/tools/ds-ctl.js reload         # force reload from disk
```

When the user says "next", "go to slide X", "previous", etc., run the corresponding command. After navigation, run `state` to confirm and tell the user where they are.

## Editing the Presentation

Edit `script.md` in the user's working directory. The engine watches it and the browser updates automatically — no restart needed.

The `style.css` file is also watched — CSS changes hot-reload without restarting.

## Layouts

Built-in layouts (JSX components in `layouts/` dir):

| Layout | Slots | Description |
|--------|-------|-------------|
| `default` | any | Renders all sections in order |
| `title` | `heading`, `subheading` | Centered title slide |
| `twocols` | `left`/`col1`, `right`/`col2` | Two-column layout |
| `image` | any | Full-bleed image layout |
| `blank` | none | Empty slide |

Custom layouts go in the project's `layouts/` dir as JSX files:

```jsx
export default function MyLayout({ slots }) {
  return (
    <div className="layout-my">
      {slots.header}
      <div className="content">{slots.body}</div>
    </div>
  );
}
```

Nested layouts use dot-notation: `### {#body.col1}` targets the `col1` slot inside the `body` layout.

## Animations

Enter animations: `fade-in`, `fade-up`, `slide-up`
Exit animations: `fade-out`, `fade-down`, `slide-down`

Use the `@delay` suffix for staggering: `enter=fade-up@200`

Custom animations go in `animations/` as JS files exporting a function:

```js
export default function myAnim(el, { delay = 0 } = {}) {
  el.animate(
    [{ opacity: 0 }, { opacity: 1 }],
    { duration: 400, delay, easing: 'ease', fill: 'forwards' }
  );
}
```

All animations must use `fill: 'forwards'` and expect `opacity: 0` as initial state.

## Modules

Custom interactive components go in `modules/` as JSX files:

```jsx
export default function MyModule({ slide, section }) {
  return <div>Interactive content here</div>;
}
```

Invoke at slide level: `## Title {layout=custom module=MyModule}`
Invoke at section level: `### {#id module=MyModule}`

## Workflow Tips

- When the user asks to "add a slide about X", append a `## Slide` block to `script.md`.
- When the user asks to change content, read `script.md` first, find the relevant slide, and edit it.
- When the user says "go to slide 3", use `goto 2` (0-based index).
- Always confirm navigation by running `state` after.
- The footer on each slide automatically shows title, author, date, and slide number.
