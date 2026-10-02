---
name: The Bedroom
description: A compact charcoal-and-silver 3D inspection workspace for bedding meshes and textile materials.
colors:
  background: "#151515"
  foreground: "#f2f2ef"
  card: "#272625"
  card-foreground: "#f2f2ef"
  popover: "#242321"
  popover-foreground: "#f2f2ef"
  primary: "#b8bcb9"
  primary-foreground: "#202120"
  secondary: "#424240"
  secondary-foreground: "#f1f1ed"
  muted: "#62625f"
  muted-foreground: "#b7b7b2"
  border: "rgb(255 255 255 / 10%)"
  input: "rgb(255 255 255 / 16%)"
  ring: "#c5c8c5"
  stage-room: "#181817"
  surface-card: "#222221"
  surface-glass: "rgb(38 36 35 / 76%)"
typography:
  display:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(38px, 5.3vw, 72px)"
    fontWeight: 520
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "clamp(21px, 2.1vw, 28px)"
    fontWeight: 560
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  interface:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, monospace"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  sm: "5px"
  md: "7px"
  lg: "10px"
  xl: "12px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "10px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  2xl: "20px"
  3xl: "24px"
components:
  view-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "20px"
  viewer-navigation:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "38px"
  control-panel:
    backgroundColor: "{colors.surface-glass}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "12px 14px"
    width: "286px"
  retry-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "34px"
  reset-button:
    backgroundColor: "rgb(255 255 255 / 7%)"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    height: "30px"
    width: "100%"
  select-trigger:
    backgroundColor: "rgb(255 255 255 / 7%)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "28px"
    width: "100%"
  slider-track:
    backgroundColor: "rgb(255 255 255 / 55%)"
    rounded: "{rounded.pill}"
    height: "5px"
    width: "100%"
  slider-thumb:
    backgroundColor: "#bdc1be"
    rounded: "{rounded.pill}"
    size: "13px"
  switch:
    backgroundColor: "rgb(255 255 255 / 24%)"
    rounded: "{rounded.pill}"
    size: "32px 18.4px"
  model-info:
    backgroundColor: "rgb(38 36 35 / 72%)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "13px 14px"
  loading-ring:
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
    size: "42px"
---

# Design System: The Bedroom

## Overview

**Creative North Star: "The Inspection Bay"**

The Bedroom is an established utilitarian 3D workspace: warm charcoal fields recede behind the model, quiet silver controls stay legible without competing with the render, and compact technical labels make every route feel like part of one inspection instrument. The interface is dense where adjustment is useful and deliberately sparse around the 3D stage.

This is an Operate-mode system with low design variance. Tonal layers, fine borders, precise alignment, and restrained state motion provide orientation; ornament does not. The visual language should remain calm enough for repeated developer use while giving the mesh or textile under inspection clear visual priority.

**Key Characteristics:**

- Warm charcoal stages with restrained silver interaction accents.
- Full-viewport 3D canvases framed by compact, translucent instrumentation.
- Geist for readable hierarchy and Geist Mono for technical metadata.
- Gently curved 10–12px surfaces, fine borders, and low ambient shadows.
- Fast, low-amplitude feedback motion with reduced-motion fallbacks.

## Colors

The palette is nearly achromatic, with slightly warm charcoal surfaces and cool silver controls preserving material color judgment.

### Primary

- **Instrument Silver** (`primary`): Selected controls, progress, primary recovery actions, and the rare high-contrast interactive state.

### Neutral

- **Workspace Charcoal** (`background`): The application field and default full-screen shell.
- **Room Stage Charcoal** (`stage-room`): The Room View canvas and error-state ground.
- **Raised Charcoal** (`card`, `surface-card`, `popover`): Cards, floating navigation, panels, and menus separated by small tonal steps.
- **Inspection White** (`foreground`): Primary text and headings; use softened alpha variants for secondary copy.
- **Tool Gray** (`secondary`, `muted`, `muted-foreground`): Inactive controls, subdued labels, and low-priority metadata.
- **Hairline White** (`border`, `input`): Fine boundaries that organize without drawing boxes around everything.
- **Focus Silver** (`ring`): The shared keyboard-focus outline.

**The Render-First Rule.** Color belongs to the inspected material; interface chrome stays charcoal, white, and silver.

## Typography

**Display Font:** Geist (with Arial, Helvetica, sans-serif fallback)  
**Body Font:** Geist (with Arial, Helvetica, sans-serif fallback)  
**Label/Mono Font:** Geist Mono (with monospace fallback)

**Character:** Geist gives the launcher a confident but neutral editorial scale while staying compact in controls. Geist Mono turns route labels, model names, numeric outputs, and status copy into quiet instrumentation.

### Hierarchy

- **Display** (520, fluid 38–72px, 0.98): Launcher question only; compact, close-set, and never repeated inside a viewer.
- **Title** (560, fluid 21–28px, 1.18): View choice names and other primary card titles.
- **Body** (400, 13px, 1.65): Explanatory copy, capped near 44 characters where the card grid permits.
- **Interface** (500–600, 12–14px, 1.2): Control names, group headings, and actionable messages.
- **Label** (500–550, 9–10px, 0.08–0.12em tracking): Uppercase route, file, status, and numeric metadata.

**The Two-Voice Rule.** Use Geist to explain and Geist Mono to identify, measure, or locate.

## Layout

The launcher uses a three-row shell with 64px utility bands, a centered content region capped at 1180px, and a two-column card grid with a 14px gutter. At 680px and below, utility context and the footer disappear, cards stack, and outer padding tightens without changing hierarchy.

Viewer routes occupy the viewport edge to edge. Navigation anchors 12px from the top-left, while Texture controls anchor 12px from the top-right in a 286px panel. Room metadata sits at the bottom-right and interaction hints sit bottom-center. On narrow screens these offsets contract to 10px; the control panel keeps its working width within the viewport and the Room hint hides to avoid collisions.

**The Clear-Stage Rule.** Floating tools hug edges and corners; the center stays available for orbiting and judging the model.

## Elevation & Depth

Depth is mostly tonal and structural: adjacent charcoal values, 7–10% white borders, and glassy overlays separate working layers. Low ambient shadows support floating cards and tools without creating a glossy product-dashboard look. Backdrop blur is reserved for controls over the live render.

### Shadow Vocabulary

- **Card Ambient** (`0 18px 48px rgb(0 0 0 / 18%)`): Launcher choice cards.
- **Tool Ambient** (`0 6px 16px rgb(0 0 0 / 18%)`): Compact floating navigation.
- **Panel Ambient** (`0 8px 24px rgb(0 0 0 / 16%)`): Render control panel and metadata plate.
- **Menu Lift** (`0 10px 28px rgb(0 0 0 / 42%)`): Temporary popover content only.

**The Low-Lift Rule.** Shadows clarify floating utility layers; they never become a decorative glow or a substitute for hierarchy.

## Shapes

Primary surfaces use gently curved 10–12px corners. Compact controls use 5–8px radii, while icon wells, slider thumbs, switches, and loading rings are fully rounded. Borders are one-pixel hairlines. Avoid sharp rectangular panels and avoid inflating everything into pill shapes; circles are for small controls and status geometry only.

## Components

### View Choice Cards

Large 12px-radius route cards pair an abstract preview well with a compact title, Korean explanation, technical detail, and circular launch cue. Hover lifts by 3px, lightens the surface and border, and scales only the preview icon by 1.035. Active feedback compresses to 0.995.

### Viewer Navigation

The fixed route switcher is a 38px-high, 10px-radius segmented control. The left segment returns to the launcher; the right segment identifies the current view. Both use uppercase Geist Mono, and only the actionable segment gains a pale hover wash.

### Cards / Containers

Control panels and metadata plates use 10px corners, translucent warm charcoal, a one-pixel hairline, low ambient shadow, and 10px backdrop blur. Internal padding stays compact at 12–14px. The launcher card is the larger exception with 20px padding and a 12px radius.

### Inputs / Fields

Select triggers are full-width, 28px-high, subtly filled fields with 7px corners. Sliders use a 5px pale track, silver range, and 13px circular thumb. Switches use quiet gray at rest and silver when checked. Keyboard focus uses the common silver ring; disabled states reduce opacity without changing geometry.

### Buttons

Primary recovery buttons use silver fill, charcoal text, 8px corners, and a compact 34px height. Reset and ghost actions remain translucent charcoal with pale text, becoming brighter on hover. Active states move down by one pixel; feedback is restrained and immediate.

### Loading and Error States

Loading uses a 42px single-stroke silver ring with a small uppercase mono status below. Room errors replace the stage with a centered Korean message and a single retry action, preserving a clear recovery path rather than exposing renderer detail.

## Do's and Don'ts

### Do:

- **Do** keep full-screen viewers visually subordinate to the mesh or textile being inspected.
- **Do** use 10–12px radii for primary surfaces and smaller radii only for compact controls.
- **Do** keep technical metadata short, uppercase where appropriate, and set in Geist Mono.
- **Do** use low-amplitude motion: 150–240ms transitions, 1–3px movement, and modest icon scaling.
- **Do** provide visible loading, keyboard focus, reduced-motion handling, and retryable failures.

### Don't:

- **Don't** introduce saturated interface color that can bias textile or material judgment.
- **Don't** place persistent controls across the center of the 3D stage.
- **Don't** turn technical controls into oversized marketing cards or generous consumer-app spacing.
- **Don't** add ornamental gradients, heavy glows, or deep shadows beyond the established tonal layering.
- **Don't** invent additional viewer routes or merge Room and Texture responsibilities without an explicit product change.
