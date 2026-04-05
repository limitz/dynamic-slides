import { parseScript } from './parse-script.js';

const source = `# My Presentation {author=John date=2024-01-01}

## Welcome {layout=title enter=fade@500 exit=zoom}

<!-- Welcome everyone to the talk -->

### Main Heading {#heading reveal=0 enter=fade-up@200}

Some introductory content with **bold** and *italic* text.

* First bullet shows immediately {.highlight enter=fade@100}
* Second bullet reveals next {enter=slide-up exit=fade reveal=1}
* Third bullet reveals last {reveal=2 dismiss=4}

--- {reveal=3}

This content is revealed at step 3.
Including a new paragraph.

- And a list item

### {#sidebar}

This is a headerless section with just content.
![An image](assets/photo.jpg)

## Two Columns {layout=twocols .dark}

### {#body layout=twocols}
### Column 1 {#body.col1 reveal=0 enter=fade}

Left side **content** here.

### Column 2 {#body.col2 reveal=1 enter=fade}

Right side content here.

## Interactive {layout=custom module=Counter}

### {#controls reveal=0 module=Counter}

Module content passed as props.

## Simple Slide

Just some text directly under the slide heading, no sections.

* A bullet
* Another bullet
`;

const result = parseScript(source);
console.log(JSON.stringify(result, null, 2));
