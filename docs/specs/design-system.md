---
type: infrastructure
---
# Design system — tokens, surfaces, and interaction standards

Every screen draws from one palette, one set of surfaces, and one focus
standard. This is cross-cutting rather than a feature: a component that
invents its own blue, its own card, or its own focus ring is wrong even if it
looks fine in isolation, because the next screen will invent a different one.

## Where it lives

- `apps/web/app/globals.css` — the token block. Tailwind v4 generates every
  `bg-*`, `text-*`, `border-*`, `ring-*` and `outline-*` utility from the
  `--color-*` entries inside `@theme inline`. There is no `tailwind.config`.
- `apps/web/app/layout.tsx` — the page shell: width, gutters, nav clearance,
  and the page background gradient.
- `apps/web/components/icon.tsx` — renders a monochrome PNG as a CSS mask so
  the glyph takes `currentColor`.

## The tokens

| Token | Value | Used for |
|---|---|---|
| `--color-bg` | `#eef0ff` | page |
| `--color-surface` | `#ffffff` | rows, fields, chips |
| `--color-panel` | `#e9edff` | the frosted panel a screen's content sits in |
| `--color-dial` | `#c7d3ed` | the SOS dial, a step deeper than `panel` |
| `--color-border` | `#dfe4ff` | hairlines |
| `--color-fg` | `#0f172a` | body text |
| `--color-muted` | `#4e5b76` | supporting text |
| `--color-accent` | `#3658e7` | actions |
| `--color-accent-strong` | `#263b98` | hover/pressed |
| `--color-accent-deep` | `#1d317f` | emphasis text on tints, gradient end, the nav |
| `--color-tint` | `#e2e8ff` | accent fills |
| `--color-scrim` | `#0f172a` | ordinary modal backdrops |
| `--color-scrim-alert` | `#101a3a` | the SOS backdrop |
| `--color-success` | `#16a34a` | — |
| `--color-danger` | `#dc2626` | SOS only |
| `--color-alert-emergency` | `#ff8fa3` | alert-feed severity — pale rose |
| `--color-alert-critical` | `#ff9f6b` | alert-feed severity — pale orange |
| `--color-alert-warning` | `#ffd98e` | alert-feed severity — pale gold |
| `--color-alert-info` | `#8ecbff` | alert-feed severity — pale sky |

## The contract

- **No raw color in a component.** Hex values appear in `globals.css` and in
  `rgba()` shadow stops; nowhere else. A component needing a color that no
  token names needs a new token, not a literal.
- **One hue carries the app.** Blue at four depths, with neutrals. A second
  hue is a palette decision, not a component decision. The four `--color-alert-*`
  severities are the standing exception, made deliberately and recorded here:
  an alert feed has to separate four severities at a glance. They belong to
  the feed and appear nowhere else; a fifth hue is still a palette decision.
- **Red belongs to SOS.** The emergency button, the dial's title, and its
  Cancel. Nothing else is red — a failing metric or a destructive secondary
  action uses `muted` plus a glyph, so red never stops meaning emergency. The
  feed's `--color-alert-emergency` is a pale rose rather than the SOS red, and
  it marks the severity of an alert the SOS path produced; it never appears on
  a control.
- **Blue means interactive.** A saturated blue element does something. An
  identity mark or a label is tinted, outlined, or neutral, so a row never has
  two equally loud elements of which only one is tappable.
- **Nesting radii step inward.** Panel `rounded-3xl`, rows `rounded-2xl`,
  fields `rounded-lg`, pills `rounded-full`. An inner radius is never larger
  than its container's.
- **Shadows carry the hue of the surface they fall on** — blue-cast on the
  blue-tinted panel, navy on the nav. A neutral gray shadow reads as dirt on a
  tinted ground.
- **Glass needs something behind it.** `backdrop-blur` on a flat background
  renders as a washed-out rectangle. A translucent surface either sits over
  scrolling content or over a painted wash; otherwise it is opaque.

## Interaction standards

- **Every interactive element has a visible `focus-visible` style**, as an
  `outline` with `outline-offset-2` — never `ring`, which collides with the
  `box-shadow` stack used for glass and glow. `outline-white` on dark
  surfaces, `outline-accent` on light.
- **`focus-visible`, not `focus`** — a mouse click must not light up a ring.
- **Motion respects `prefers-reduced-motion: reduce`**, which collapses every
  animation and transition to `0.01ms` in `globals.css`. The spring entrances
  are the reason this exists.
- **Decorative imagery is `aria-hidden`**, including every `Icon`. A control
  whose only content is an icon carries an `aria-label` saying what it does,
  not what it looks like.
- **A control's accessible name states its effect.** A button opening a
  chooser is labelled for the chooser, with `aria-haspopup="dialog"` — not for
  the action the chooser might lead to.
- **Modals are native `<dialog>` opened with `showModal()`.** Focus trapping,
  Escape to close, inertness of the page behind, and the `::backdrop` all come
  from the element. A hand-rolled overlay has to reimplement four behaviours
  correctly and typically reimplements one, so replacing a `<dialog>` with a
  positioned `div` is a regression even when it looks identical.

## Boundaries

- **No dark mode.** Tokens are defined once under `@theme inline`. Adding dark
  mode means raw values on `:root` plus a `prefers-color-scheme` override,
  with the theme block pointing at them through `var()` — `inline` exists for
  exactly that indirection, and the structure is already in place.
- **Icons are PNG masks, not SVG.** `/public/icons/*.png` are 24px white
  glyphs; `Icon` masks them so they take `currentColor`. They are raster, so
  they soften on high-density screens. Replacing them with vectors is a
  pending improvement, not a contract.
- **Touch targets are not yet guaranteed 44px.** Call buttons are 40px and tab
  pills ~36px. Known, deliberate, and not yet fixed.
- **Tab-like controls use `aria-pressed`, not the tablist pattern.** The
  Add/Contacts switch is a pair of toggle buttons; it does not expose
  `role="tablist"`/`"tab"`/`"tabpanel"`, so the panel is not programmatically
  associated with its control and arrow keys do not move between them. This is
  a known deviation, acceptable for a two-item switch and not a pattern to
  copy into a wider set.

## Verify

- `pnpm build` passes, and `grep -rE '\[#[0-9a-fA-F]{3,8}\]' apps/web/app
  apps/web/components` returns nothing — no component carries a raw hex.
- **Keyboard pass.** Tab through `/contacts` from the top: title, tabs, Edit,
  every row, every call button, the nav, SOS. Every stop shows a visible
  outline. A stop that shows nothing is the defect this drill exists to catch.
- **Reduced-motion pass.** Turn on Reduce Motion in the OS, open the SOS dial
  and the edit sheet. Neither animates.
- **Contrast.** Body and supporting text clear 4.5:1 against the surface
  behind them; text over 24px clears 3:1.

## Key ADRs

None yet. The single-hue palette and the red-means-SOS rule are decisions that
would benefit from one.
