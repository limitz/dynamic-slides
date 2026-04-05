# Concerns & suggestions for the markdown rewrite

## 1. Image syntax is inverted

The PLAN uses `[link/to/image.jpg](caption text)` — standard markdown is `[alt text](url)`. Flipping it will trip up anyone who knows markdown. Suggestion: keep standard syntax and use the alt text as the caption, or use a different convention entirely.

## 2. ~~`---` overloading~~ (resolved)

Kept `---` as paragraph separator. Inside `###` sections it's unambiguous — never frontmatter, and thematic breaks aren't useful in slides. Attributes make intent explicit.

## 3. Headerless section ambiguity

`### {element=id}` — how does the parser distinguish this from a header whose text is literally `{element=id}`? Need an explicit rule, e.g. "if the entire heading text is a single attribute block with no other text, treat it as headerless."

## 4. The `{key=value}` attribute syntax needs a parser

Similar to Pandoc/kramdown attributes but not identical. The current `md.js` (30-line inline renderer) won't handle this. Options:
- Use an existing library with attribute support (markdown-it + markdown-it-attrs)
- Write a dedicated two-pass parser: extract attributes first, then parse remaining markdown

The `@500` delay suffix on animations (`enter=id@500`) is a nice shorthand but adds another parsing rule.

## 5. ~~Nested layout scoping rules~~ (resolved)

Nesting depth is unlimited. Target path must exist or an error is thrown. Sibling vs. nested is encoded explicitly in the dot-notation ID path (e.g. `#body.col1.a` and `#body.col1.b` are siblings).

## 6. ~~Fragment/reveal semantics~~ (resolved)

Rules defined:
- `reveal=0`: show when slide enters (immediately, or after specified delay), starts enter transition if any
- `dismiss=M`: element starts its exit transition at reveal step M. Defaults to `reveal + 1` if not specified.
- Elements without an exit transition remain visible regardless of dismiss
- Nested elements without explicit reveal inherit parent's reveal step
- Nested elements with reveal > parent's reveal are shown at their own later step

## 7. ~~Template boilerplate = version drift~~ (resolved)

Boilerplate kept minimal — just `index.html` + a short entry script that imports the engine. Almost nothing to go stale.

## 8. ~~Custom module invocation~~ (resolved)

Modules can be invoked at slide level (`## Title {layout=custom module=Counter}`) or at section level (`### {#element module=Counter}`). Content within the scope is passed as props to the module.

## 9. ~~Migration path~~ (dismissed)

Not needed.

## 10. ~~Type loss from TOML to attributes~~ (dismissed)

Not needed — TOML is being dropped entirely.
