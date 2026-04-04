# Dynamic Slides

A slide presentation tool controlled by Claude.

## Installation

1. Copy this directory into your Claude skills folder:

```bash
cp -r dynamic-slides ~/.claude/skills/dynamic-slides
```

2. Install dependencies:

```bash
bash ~/.claude/skills/dynamic-slides/setup.sh
```

3. Restart Claude Code (or start a new conversation) to pick up the skill.

## Usage

Ask Claude to start the presentation, navigate slides, add content, or change themes. Examples:

- "start the presentation"
- "next slide"
- "go to slide 3"
- "add a slide about our Q2 results"
- "change the theme to dark"
- "set the title to Project Update"

Edit `presentation.toml` directly or ask Claude to do it — changes appear live in the browser.

## URLs

- **Presentation**: http://localhost:5173
- **Controller** (mobile): http://localhost:5173/controller

## Requirements

- Node.js
- npm
