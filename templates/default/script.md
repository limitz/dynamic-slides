# Dynamic Slides {author=wipkat date=2024-04-05}

## Welcome {layout=title enter=fade}

<!-- Greet the audience. This is a speaker note — visible only in the controller view. -->

### {#heading reveal=0 enter=fade-up}

A Markdown-Powered Presentation Engine

## Features Overview {enter=fade}

<!-- Walk through each feature one by one using reveal steps. -->

### {#body reveal=0}

* Write slides in **Markdown** with `{attributes}` {enter=fade-up}
* Progressive reveals with `reveal=N` {enter=fade-up reveal=1}
* Enter and exit animations on any element {enter=fade-up reveal=2}
* Nested layouts with dot-notation slots {enter=fade-up reveal=3}
* Speaker notes via HTML comments {enter=fade-up reveal=4}

## Progressive Reveal {enter=zoom}

<!-- Demonstrates step-by-step content reveals. -->

### Step-by-step content {#body reveal=0 enter=fade-up}

This paragraph is visible immediately (reveal=0).

* I appear at step 1 {enter=slide-up reveal=1}
* I appear at step 2 {enter=slide-up reveal=2}

--- {reveal=3}

This paragraph appears at step 3.

It can contain **bold**, *italic*, `code`, and [links](https://example.com).

## Two Columns {layout=twocols enter=slide}

<!-- The twocols layout accepts left/right or col1/col2 slot names. -->

### Left Column {#left reveal=0 enter=fade}

Content in the **left** column.

* Bullet A
* Bullet B
* Bullet C

### Right Column {#right reveal=1 enter=fade}

Content in the **right** column.

Revealed one step after the left.

## Images {enter=fade}

<!-- Standard markdown image syntax. Alt text serves as the caption. -->

### {#body reveal=0 enter=fade-up}

Images use standard markdown syntax:

`![caption](path/to/image.jpg)`

Any inline markdown works: **bold**, *italic*, ~~strikethrough~~, and `code`.

## Animations {enter=zoom}

<!-- Shows different animation types with staggered delays. -->

### Enter Animations {#body reveal=0}

* fade-in {enter=fade-in}
* fade-up (default favorite) {enter=fade-up reveal=1}
* slide-up (more dramatic) {enter=slide-up reveal=2}

--- {reveal=3}

The `@delay` suffix staggers timing: `enter=fade-up@300`

## Headerless Sections {enter=fade}

### {#top reveal=0 enter=fade-up}

This section has no visible header — just content. Useful when the slide title is enough.

### {#bottom reveal=1 enter=fade-up}

A second headerless section, revealed at step 1. Each `###` creates a new section that can be independently animated and revealed.

## Slide Transitions {enter=slide}

### {#body reveal=0 enter=fade-up}

Each slide can have its own transition:

* `enter=fade` — crossfade
* `enter=zoom` — scale in
* `enter=slide` — directional slide

Set on the `##` heading: `## Title {enter=fade}`

## Custom Classes {.dark enter=fade}

### {#body reveal=0 enter=fade-up}

Slides and sections accept `.classname` for CSS styling.

This slide has `.dark` applied via `## Title {.dark}`.

Style them in `style.css` with full control over the template.

## Thank You {layout=title enter=zoom}

<!-- Final slide. Take questions. -->

### {#heading reveal=0 enter=fade-up}

Questions?

### {#subheading reveal=1 enter=fade-up}

Edit `script.md` to get started
