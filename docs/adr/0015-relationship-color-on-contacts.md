# ADR-0015: Relationship is not carried by color on the contacts list

## Status

Proposed

## Context

The contacts list shows a relationship badge per contact, drawn from the
`Relationship` enum: `PARENT`, `SPOUSE`, `SIBLING`, `FRIEND`, `OTHER`, plus
`null` for a contact saved without one. Every badge was the same brand
periwinkle, so the list gave a reader five identically colored pills and the
relationship could only be learned by reading each one. The avatar beside it
was a plain white circle, which carried no information at all.

The list is a screen someone opens under stress, to find one person fast.
Color is the fastest channel available for that; reading six badges is the
slowest.

The palette contract in `docs/specs/design-system.md` says one hue carries the
app, with the four `--color-alert-*` severities as its one standing exception.

## Decision

**Relationship is not carried by color.** Every contact row — badge, avatar
fill and initials — uses one pair of tokens, `--color-rel-tint` (`#93c5fd`)
and `--color-rel-deep` (`#172554`). The badge's wording carries the
relationship, as it always did. Color separates the list from the page behind
it, not the rows from each other.

**Two versions that did encode relationship were built and rejected.** They
are recorded because the reasoning is what a future screen will want, not the
code.

*A hue per relationship.* A cool ramp walking away from the brand blue —
blue, indigo, violet, purple, plus a slate for `OTHER` — with the purple step
a shade deeper, because 20° of hue cannot separate purple from violet at
10px. It needed a second standing exception to the single-hue palette rule,
and it did not earn one: adjacent steps 20° apart read as a family of related
colors rather than as four distinct signals, so the separation it was paying
for was weak. An earlier draft of it spread the hues around the wheel, amber
and emerald included, which separates far better and looked like a different
product.

*Two depths of the brand blue.* `family` for `PARENT`, `SPOUSE` and
`SIBLING`, a lighter step for everyone else. This cost no palette exception
and survived longer, but the thing it encoded was not a thing anyone wanted
read: two contacts sat visibly lighter than the rest with no way to tell from
the screen that "lighter" meant "not family", and it looked like a styling
bug rather than a signal. A distinction the viewer has to be taught is not a
glance-shortcut.

**What both attempts got wrong is worth keeping separately:** a tint was
measured only against its own text. `friend` at `#dbeafe` and `other` at
`#e2e8f0` cleared 7.2:1 and 8.4:1 against their `deep` and shipped at 1.22:1
and 1.23:1 against the `#fff` row they were drawn on, where they rendered as
white. **A tint is measured against its ground as well as against its text.**
The surviving pair is 8.2:1 together and 1.8:1 against the row.

**Nothing on this list is grey.** An interim version gave `OTHER` and the
unset case a desaturated slate, on the reasoning that an absent relationship
is an absent value. On screen it read as a broken row. Every row here is
someone who gets called when the SOS fires, so no row is a disabled state.
The missing pill is the only signal an unset relationship needs.

**The avatar takes the row's tint**, as a `tint → deep/15` gradient with the
`deep` as the initials. It gradients into a wash of its own `deep` rather
than out of white, because a 40px circle running from white to a pale tint is
mostly white and shows nothing. Hashing the contact's name to a color was
rejected: a hash makes the color decorative and gives two siblings unrelated
colors, and the list is calmer when every row looks alike.

## Consequences

- The single-hue rule keeps exactly one exception, the alert severities. A
  screen that wants to separate categories now has a precedent for doing it
  with depth, which is the cheaper move and the one to try first.
- Adding a relationship to the enum is now free: no token, no group, no
  contrast measurement. It shows up as a new word in a pill.
- The palette keeps exactly one standing exception, the alert severities.
  Nothing on the contacts list spends one.
- Two contacts are told apart by reading, not by glancing. That is a real
  loss against the original goal of this decision, and it is accepted: three
  attempts did not produce a color signal anyone could use without being
  taught it first.
- A contact with `OTHER` saved and a contact with nothing saved are identical
  except for the pill. The distinction is the wording's to carry.
- Every tint in the app owes two measurements, not one: against its text and
  against the surface it is drawn on. Nothing enforces the second one, so it
  is a review question.
- A reader with a color vision deficiency gains from this where they gained
  nothing from the hues: two depths of one hue differ in lightness, which
  survives any color vision deficiency.
- Nothing warm appears on the contacts list, and nothing non-blue. A future
  screen wanting a warm accent has no precedent here to copy.

## See also

- `docs/specs/design-system.md` — the palette contract and the token table.
- `docs/specs/contact-management.md` — the behavior of the list itself.
