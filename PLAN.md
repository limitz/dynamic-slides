# Data requirements

## Template

A template is a self contained folder, containing:
* boilerplate
* a css stylesheet
* "assets"
* "layouts"
* "plugins"
* "script"

## Template -> Boilerplate

When the user starts a presentation, a theme is selected and its boilerplate is copied to the user's project dir. The boilerplate should be minimal — just an `index.html` and a short entry script that imports the engine. This way the Vite server runs from the project dir (no dual-directory routing), but there's almost nothing to go stale when the engine updates.

## Template -> Stylesheet

A CSS stylesheet that contains the CSS style for all layouts in the template

## Template -> Layout

A layout is an HTML file that contains named elements. The named elements are populated from the "script". A named element can contain another layout if the script specifies that. This makes it possible to have one layout for a generic slide with a header / content / footer structure, and fill the content with another layout (eg. 2 column layout)

## Template -> Asset

Any (static) asset used in the template. For instance icons, background images, fonts, videos or images.

## Template -> Plugin

Any javascript file that extends the default features of the slide viewer. For now there are 2 types of plugins:
* Animation: a start or exit animation that can be added on any element
* Module: any custom, interactive, self contained javascript module: eg. a Mapview, live data in a graph, anything.


## Template -> Script

A template has an initial script to start with.
The script is parsed using **markdown-it** with **markdown-it-attrs** for `{key=value .class #id}` attribute syntax. The `@` delay suffix (e.g. `enter=fade@500`) is handled by post-processing parsed attributes — split on `@` to extract animation name and delay.

### Transition rules

- When an enter transition is defined, the element starts at `opacity: 0` and the transition animates it in. All enter transitions must expect `opacity: 0` as the initial state.
- When an exit transition is defined, the transition animates the element out (typically to invisible).
- All transitions retain their final state after completion (`fill: 'forwards'` in Web Animation API terms) — elements do not snap back.
- Elements without any transitions are simply visible or hidden based on their reveal step.

What follows is a self describing example of what a script could look like:

```

# Presentation title

## Slide title {layout=id .classname enter=id exit=id}

### Section Header {#element-id layout=id .classname enter=id exit=id reveal=0}

All content in the section.
* This bullet reveals when slide is shown, after .5 seconds {.classname enter=id@500}
* This bullet reveals when next is pressed, starts exit transition at reveal 2 (dismiss defaults to reveal+1) {enter=id exit=id reveal=1}
* Reveals at step 2, starts exit transition at step 4 instead of default step 3 {reveal=2 dismiss=4}

--- {reveal=3}
All content in this section is revealed last
- Including any lists

or paragraphs

### {#element-id}
If the entire heading text is a single attribute block with no other text, it is treated as a headerless section.
This element does not have a text header it just shows this text and an image
[this text should go below the image](link/to/image.jpg)

## Interactive Demo {layout=custom module=Counter}

### {#controls reveal=0 module=Counter}
Modules can also be used at section level. Content within the scope is passed as props to the module.

## Next slide {layout=different enter=id}

### {#body layout=twocols}
### Column 1 Header {#body.col1 reveal=0 enter=fade}

Data in column 1 of the body (nested layout)

### Column 2 Header {#body.col2 reveal=1 enter=fade}

Data in column 2 of the body (nested layout)

### {#header reveal=0}

This content is visible immediately, because of reveal=0

--- {reveal=1}
This content, in the same element, becomes visible when colum 2 becomes visible
```
