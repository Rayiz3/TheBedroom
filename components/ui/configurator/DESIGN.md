---
name: Spatially Configurator
description: A light, reference-led bedding configurator with a live room and one quiet selection rail.
colors:
  ink: "#2b292d"
  muted: "#706a73"
  purple: "#604b91"
  rule: "#e7e2e9"
  stage-ground: "#f5f2ed"
  header: "#fff"
  panel: "#fdfcfb"
  selected-fill: "#eee8f5"
  selected-ink: "#503778"
  input-border: "#ddd7e0"
typography:
  display:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "clamp(34px, 3vw, 44px)"
    fontWeight: 400
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  body:
    fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
  label:
    fontFamily: "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif"
    fontSize: "13px"
    fontWeight: 500
rounded:
  control: "6px"
  swatch: "50%"
spacing:
  swatch-gap: "6px"
  control-gap: "8px"
  panel-inline: "30px"
components:
  selection-rail:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    padding: "32px 30px 26px"
    width: "370px"
  size-option:
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 14px"
  size-option-selected:
    backgroundColor: "{colors.selected-fill}"
    textColor: "{colors.selected-ink}"
    rounded: "{rounded.control}"
    height: "44px"
  fabric-swatch:
    rounded: "{rounded.swatch}"
    size: "33px"
---

# Design System: Spatially Configurator

## Overview

Scope: `/configurator`, rendered by `RoomViewer` with `variant="configurator"`. This local system takes precedence over the root inspection-workspace system for this route only. The user requested an entirely different interface from `/room`, led by the Spatially shop and configurator references, and confirmed the mobile scene-above-panel arrangement.

White and warm ivory frame the real furnished Room scene. A serif title gives the page its editorial character; compact Korean controls and muted purple selection cues keep bedding combinations easy to compare. The established direction is recorded in [the route brief](../../../.impeccable/configurator-direction.md).

## Colors

Purple identifies selected options, current color names, the sunlight value, keyboard focus, and recovery actions. Ink and muted text establish hierarchy on the header and panel surfaces. Fine rules divide control groups without separate cards. The stage-ground token is the loading/error ground; the live 3D environment supplies the rendered scene's color.

Fabric colors are raster assets, not interface color tokens. Reuse the six existing files unchanged: `public/palette/ivory.png`, `sage.png`, `lilac.png`, `blue.png`, `rose.png`, and `taupe.png`. Their source is the incumbent repository palette, referenced through `PILLOW_PALETTE` in `components/room/config.ts`; no new raster was generated or downloaded for this design. Original authorship beyond that repository provenance is not established here. The same assets drive the visible swatches and bedding palette.

## Typography

Georgia with Times New Roman/serif fallbacks supplies the Spatially wordmark and “Change Your Space.” title. The wordmark is 31px with −0.04em tracking. Korean interface copy uses the shell's Noto Sans KR / Apple SD Gothic Neo / Malgun Gothic / sans-serif stack; the stylesheet does not itself load a font file.

Field legends use the label role. Size labels and explanatory copy use 12px; color names and supporting sunlight copy use 11px. Sunlight output uses tabular numerals. The desktop title may break after “Change”; compact-height and mobile layouts remove that line break.

## Layout

The fixed viewport shell is a two-column grid: flexible scene plus 370px right rail, beneath a full-width 72px header. Header padding is 32px. The scene clips within its grid cell; the panel scrolls independently with contained overscroll. Color groups have 21px gaps and six equal swatch columns. Size choices form two equal columns.

At widths above 760px and heights at or below 800px, the rail tightens: vertical panel padding becomes 20px/18px, title becomes 32px, intro spacing becomes 18px, and color groups use 8px gaps with 15px vertical padding.

At 760px and below, the shell becomes one scrolling document: 62px header, scene, then full-width panel. The scene is 48svh tall with a 300px minimum. Panel padding is 26px 24px 32px, title is 36px, and swatches grow to 36px. The header's center title and the scroll-to-zoom hint disappear. Keep this user-confirmed order; do not turn the panel into a drawer or overlay.

## Elevation & Depth

The configurator chrome is flat, with opaque surfaces and fine dividing lines. It introduces no box shadows or backdrop blur. Depth comes from the actual 3D room. The small stage interaction hint is an opaque panel-colored plate centered near the lower edge.

## Shapes

Size options and the stage hint use gently rounded control corners. Fabric swatches are circular, with a subtle one-pixel border and an offset selection outline. Rectangular header and rail surfaces remain flush with the viewport. Swatches sit inside 44px-high interactive labels even when their visible circles are smaller.

## Components

- **Header:** serif Spatially home link, centered Korean page label, and 44px-minimum-height back link. Both links return to `/`.
- **Size choices:** native radio inputs for single and queen. Selection adds purple border, pale fill, selected text, and a checkmark. Hover changes the border to purple.
- **Fabric groups:** independent duvet, pillow 1, pillow 2, and pad radio groups. Order is ivory, sage, lilac, blue, rose, taupe. Each group displays its current Korean color name. Selection combines a purple outline and checkmark; accessible labels include the bedding part and color.
- **Sunlight:** native range input from −180° to 180° in 1° steps, associated label, degree output, and Korean value text. It updates the shared directional-light azimuth. Other environment settings stay in shared scene defaults.
- **Focus and motion:** a 2px purple outline offset by 4px marks keyboard focus, including the visible sibling of each visually hidden radio. Size and swatch feedback lasts 160ms ease-out; swatch hover lifts 2px. Reduced-motion preference removes these transitions and stops the loading ring animation.
- **Loading and failure:** the scene stays hidden until its first prepared frame. A polite Korean loading status accompanies a 32px ring rotating every 1.1s. The shared Room error boundary supplies the retry flow, recolored with this route's warm ground, ink, muted text, and purple button. Ready scenes show a noninteractive drag hint; failure suppresses that hint.

Initial configuration is queen with lilac on all four bedding parts and the shared sunlight default. Controls update the live scene directly; no submit or checkout step is present.

## Do's and Don'ts

- Do keep the real scene visually dominant and all product choices in one rail.
- Do preserve independent bedding colors, native input semantics, explicit selected names, checkmarks, focus rings, and retry feedback.
- Do preserve existing palette raster assets and their connection to the rendered materials.
- Don't carry the root charcoal, silver, monospaced instrumentation or floating technical panels into this route.
- Don't apply this local visual exception to Room or Texture views.
- Don't add commerce claims, price, cart, or purchase actions without a product requirement.
