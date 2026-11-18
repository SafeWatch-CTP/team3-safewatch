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
- `apps/web/components/bottom-nav.tsx` — the nav dock: the gradient, the top
  edge highlight, and the active-tab backing.

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
| `--color-sos-hot` | `#ff4d4d` | the lit top of the SOS face |
| `--color-sos-shade` | `#991b1b` | the shaded bottom of the SOS face |
| `--color-nav-deep` | `#0a1742` | the bottom of the nav dock's gradient |
| `--color-rel-tint` | `#93c5fd` | every contact row's badge and avatar fill |
| `--color-rel-deep` | `#172554` | every contact row's badge text, ring, initials |
| `--color-alert-emergency` | `#ff8fa3` | alert-feed severity — pale rose |
| `--color-alert-critical` | `#ff9f6b` | alert-feed severity — pale orange |
| `--color-alert-warning` | `#ffd98e` | alert-feed severity — pale gold |
| `--color-alert-info` | `#8ecbff` | alert-feed severity — pale sky |

## The contract

- **No raw color in a component.** Hex values appear in `globals.css` and in
  `rgba()` shadow stops; nowhere else. A component needing a color that no
  token names needs a new token, not a literal.
- **One hue carries the app.** Blue at four depths, with neutrals. A second
  hue is a palette decision, not a component decision. The four
  `--color-alert-*` severities in the alerts feed are the one standing
  exception, and five hues is the ceiling — a sixth needs an ADR that first
  says which of these it replaces. A screen that needs to separate categories
  reaches for depth within the brand blue before it reaches for a hue; the
  contacts list does exactly that, and ADR-0015 records the hue-per-
  relationship version that was tried and dropped.
- **A token pair is used together.** Each `-deep` is the text, ring and
  initials color for its own `-tint` and for no other ground; the pairs were
  chosen so a 10px uppercase badge clears 4.5:1, and a `deep` on a different
  fill is unmeasured.
- **Relationship is not carried by color.** Every contact row shares
  `--color-rel-tint` and `--color-rel-deep`, whatever the relationship and
  whether or not one is saved; the badge's wording is what separates a sibling
  from a friend. A relationship added to the enum needs no palette work at
  all. Two versions that did encode it — a hue per value, then two depths —
  were tried and dropped; ADR-0015 has both.
- **No row is greyed.** Every contact on this list is someone who gets called,
  so none of them is a disabled or secondary state. A contact saved without a
  relationship takes the same blue as the rest and simply has no pill — a
  neutral avatar beside blue ones read as a row that had failed to load.
- **A tint is measured against the row it sits on, not only against its own
  text.** `surface` is `#fff`, so a fill above about 88% lightness clears
  4.5:1 with its `deep` and is still invisible as a badge — under 1.3:1
  against the row. Every relationship step is checked both ways: against its
  `deep` for the wording, and against `#fff` for the badge's own edge. That
  ceiling and the `accent` floor at 55% lightness, which means interactive,
  are what leave room for three steps rather than five.
- **A list of records is one surface with dividers, not a stack of cards.**
  The panel is the card. A card per row means a card inside a card, which
  needs gaps to stop the two radii colliding and spends vertical space on
  separation the dividers give for free. Rows are flush, separated by
  `divide-y divide-border`, and the list carries the single radius and border.
  A row cannot use a `ring` for state, because the list clips its children —
  state is a background tint.
- **Color is never the only carrier.** The badge spells the relationship out,
  and the avatar repeats the badge's group rather than hashing the name, so a
  reader who cannot separate two depths of blue loses nothing and a reader who
  can gets a shortcut. The same holds in the feed: the severity colors sit
  beside a pill that names the alert's type and an `sr-only` severity.
- **Red belongs to SOS.** The emergency button, the dial's title, and its
  Cancel. Nothing else is red — a failing metric or a destructive secondary
  action uses `muted` plus a glyph, so red never stops meaning emergency. The
  feed's `--color-alert-emergency` is a pale rose rather than the SOS red, and
  it marks the severity of an alert the SOS path produced; it never appears on
  a control. The SOS button's face is a radial gradient through `sos-hot` →
  `danger` → `sos-shade`, lit from above, and it carries a crimson ambient
  glow — the one shadow in the app that emits its own hue rather than taking
  the surface's.
- **Blue means interactive.** A saturated blue element does something. An
  identity mark or a label is tinted, outlined, or neutral, so a row never has
  two equally loud elements of which only one is tappable.
- **The nav dock is opaque, and a gradient rather than a flat fill.**
  `accent-deep` down to `nav-deep`, with a 1px white inset shadow for the top
  edge highlight. The highlight is an inset shadow rather than a `border-t` so
  it follows the full rounded edge. The dock stays opaque: it is the one
  surface that must be legible over any page, including the map.
- **The active tab is a backing, not a glow.** The current tab gets
  `bg-white/15` behind icon and label. Every tab carries the same padding, so
  moving between tabs changes color and nothing else. A `drop-shadow` glow was
  the previous treatment and blurred on high-DPI screens.
- **Nesting radii step inward.** Panel `rounded-3xl`, rows `rounded-2xl`,
  fields `rounded-lg`, pills `rounded-full`. An inner radius is never larger
  than its container's.
- **Shadows carry the hue of the surface they fall on** — blue-cast on the
  blue-tinted panel, navy on the nav. A neutral gray shadow reads as dirt on a
  tinted ground.
- **Glass needs something behind it.** `backdrop-blur` on a flat background
  renders as a washed-out rectangle. A translucent surface either sits over
  scrolling content or over a painted wash; otherwise it is opaque.
- **Translucency does not stack.** One glass layer per view. A translucent row
  inside a translucent panel costs a second compositor pass for an effect
  nobody can see, and every layer desaturates what sits on it — the contacts
  list's relationship hues read as washed out until its rows went opaque. The
  panel is the glass; what sits in the panel is `surface`.

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

- [ADR-0015](../adr/0015-relationship-color-on-contacts.md) — relationship is
  not carried by color on the contacts list, the two versions that encoded it
  and why each was dropped, and why a tint is measured against its ground as
  well as against its text.

The single-hue palette itself and the red-means-SOS rule are still undecided
in writing and would benefit from an ADR each.
