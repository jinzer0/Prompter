# Prompter Design System

## 1. Atmosphere & Identity

Prompter feels like a quiet native command center for serious prompt work: compact, dark, precise, and calm under long sessions. The signature combines Linear's hairline hierarchy with Raycast-like native density: a three-panel instrument surface where hierarchy comes from tonal shifts, hairline borders, and one restrained violet accent rather than decorative color.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/base | `--color-shell` | `#f7f8f8` | `#08090a` | App canvas |
| Surface/panel | `--color-panel` | `#ffffff` | `#0f1011` | Primary panels |
| Surface/elevated | `--color-panel-elevated` | `#f3f4f5` | `#191a1b` | Cards, controls |
| Surface/subtle | `--color-panel-muted` | `#e9eaec` | `#141516` | Empty states, inset wells |
| Text/primary | `--color-foreground` | `#08090a` | `#f7f8f8` | Headings, primary labels |
| Text/secondary | `--color-muted-strong` | `#62666d` | `#d0d6e0` | Body and panel descriptions |
| Text/tertiary | `--color-muted` | `#8a8f98` | `#8a8f98` | Placeholders, metadata |
| Border/subtle | `--color-border-subtle` | `#d0d6e0` | `rgba(255,255,255,0.05)` | Panel separators |
| Border/default | `--color-border` | `#bfc4cd` | `rgba(255,255,255,0.08)` | Cards, inputs, focus base |
| Accent/primary | `--color-accent` | `#5e6ad2` | `#7170ff` | Primary actions, active tabs, focus |
| Accent/hover | `--color-accent-hover` | `#4f5bc5` | `#828fff` | Hover states |
| Atmosphere/glow | `--color-atmosphere-violet` | `rgba(94,106,210,0.08)` | `rgba(113,112,255,0.10)` | Single shell gradient glow |
| Status/success | `--color-success` | `#16833a` | `#27a644` | Ping/connected status |

### Rules

- Dark mode is the native surface; light tokens exist only for future contrast references.
- Violet appears only on active, focus, and primary action states.
- No visual color may be introduced outside this table without updating this file first.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | `24px` | `510` | `1.25` | `-0.012em` | Main panel title |
| H2 | `16px` | `590` | `1.35` | `-0.006em` | Section title |
| H3 | `14px` | `590` | `1.4` | `0` | Card title |
| Body | `14px` | `400` | `1.5` | `0` | Default UI copy |
| Caption | `12px` | `510` | `1.4` | `0.02em` | Metadata and labels |
| Micro | `11px` | `510` | `1.35` | `0.06em` | Overlines and status |

### Font Stack

- Primary: Inter, SF Pro Display, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif.
- Mono: Berkeley Mono, ui-monospace, SFMono-Regular, Menlo, monospace.
- OpenType: enable `cv01` and `ss03` for Linear-like geometric clarity.

### Rules

- Body text never drops below `14px` except metadata/status microcopy.
- Headings use tight tracking only at panel-title scale.
- Use the mono stack only for status, tokens, or compiler-like surfaces.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of `4px`.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Icon-to-label gap |
| `--space-2` | `8px` | Compact stacks |
| `--space-3` | `12px` | Control padding |
| `--space-4` | `16px` | Panel/card padding |
| `--space-5` | `20px` | Dense section spacing |
| `--space-6` | `24px` | Shell gutter |
| `--space-8` | `32px` | Major section gap |

### Grid

- Shell columns: `210px` sidebar, fluid prompt library with `320px` minimum, `460px` compiler.
- App minimum content width: `1040px`; narrower windows intentionally scroll horizontally so all required panels remain accessible.
- Breakpoints follow Tailwind defaults; desktop smoke targets `900x720` and `1280x800`.

### Rules

- Use CSS variables or Tailwind tokens derived from this scale.
- No panel can hide at desktop widths; preserve visible/accesssible three-panel structure.

## 5. Components

### Button

- **Structure**: native `button` with local `Button` wrapper.
- **Variants**: `default`, `secondary`, `ghost`.
- **Spacing**: height `32px` or `28px`, horizontal padding from `--space-3`/`--space-4`.
- **States**: default tonal fill, hover lighter tonal fill, active slight inset tone, focus violet ring, disabled muted text and no pointer.
- **Accessibility**: native keyboard semantics; visible focus ring.
- **Motion**: color and border transitions only, `150ms ease-out`.

### Input

- **Structure**: native `input` with local `Input` wrapper.
- **Variants**: single compact shell input.
- **Spacing**: height `32px`, padding from `--space-3`.
- **States**: placeholder muted, focus violet border/ring, disabled muted.
- **Accessibility**: label via `aria-label` or visible label.
- **Motion**: border/background transition, `150ms ease-out`.

### Textarea

- **Structure**: native `textarea` with local `Textarea` wrapper; used for prompt draft entry and compiler preview wells, never as a raw inline control.
- **Variants**: `editable` for prompt authoring and `preview` for compiled output. Preview is read-only by default, but compiler flows may keep it editable when the saved `compiled_prompt` must reflect user edits.
- **Spacing**: minimum height `160px`; padding from `--space-4`; mono text only for preview/compiler output.
- **States**: placeholder muted, focus violet border/ring, disabled or read-only muted panel well.
- **Accessibility**: label via `aria-label` or visible label; preview names must describe the generated or compiled prompt output and its editable state when relevant.
- **Motion**: border/background transition, `150ms ease-out`.

### Badge

- **Structure**: inline semantic `span` or status element with local `Badge` wrapper.
- **Variants**: `neutral`, `accent`, `success`.
- **Spacing**: compact pill height `22px`, horizontal padding from `--space-2`/`--space-3`.
- **States**: static by default; accent only for active compiler/library metadata; success only for connected status.
- **Accessibility**: visible text is required; do not use icon-only badges.
- **Motion**: none by default.

### Select / Simple Choice

- **Structure**: native `select` with local `Select` wrapper for single-choice compiler/library controls; segmented button or tab patterns stay in `Tabs` when they change panels.
- **Variants**: compact shell choice only.
- **Spacing**: height `32px`, padding from `--space-3`, menu trigger aligned to existing input height.
- **States**: placeholder/default option muted, focus violet border/ring, disabled muted.
- **Accessibility**: native `combobox` semantics with a visible label or `aria-label` that names the chosen dimension.
- **Motion**: border/background transition, `150ms ease-out`.

### Card

- **Structure**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` composition.
- **Variants**: tonal panel card only.
- **Spacing**: `--space-4` default, tighter header/content stacks with `--space-2`.
- **States**: default tonal surface, optional hover inherited by caller, empty state with muted copy.
- **Accessibility**: headings remain semantic in consuming screens.
- **Motion**: none by default.

### Tabs

- **Structure**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` with ARIA roles.
- **Variants**: compact pill list.
- **Spacing**: trigger height `28px`, padding from `--space-3`.
- **States**: active violet-tinted surface, inactive muted, hover tonal lift, focus violet ring.
- **Accessibility**: `tablist`, `tab`, and `tabpanel` roles are present.
- **Motion**: color transition only, `150ms ease-out`.

### Empty State

- **Structure**: small tonal well with label, title, and restrained description.
- **States**: empty only for this shell; loading and error list UI are not part of Phase 1.
- **Accessibility**: copy is visible text, not icon-only.

### SidebarItem

- **Structure**: native `button` or link-like row with local `SidebarItem` wrapper; used inside Projects, Tags, and Harnesses panels once lists replace empty states.
- **Variants**: `default`, `active`, `muted`.
- **Spacing**: height `28px` minimum, horizontal padding from `--space-3`, icon-to-label gap from `--space-1` when icons arrive.
- **States**: active violet-tinted surface, hover tonal lift, focus violet ring, disabled muted.
- **Accessibility**: each item exposes a readable name and list context; active state uses `aria-current` when navigational.
- **Motion**: color/background transition only, `150ms ease-out`.

### Panel

- **Structure**: bordered tonal region with header, content, and optional footer/status.
- **States**: default visible desktop panel; no collapsed state in initial shell.
- **Accessibility**: landmark or labelled region when appropriate.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | `150ms` | `ease-out` | Button, input, tab state |
| Standard | `200ms` | `ease-in-out` | Future panel transitions |

- Animate colors, opacity, and transform only.
- Respect native keyboard focus; do not remove outlines without replacement.
- No decorative idle motion in the initial shell.

## 7. Depth & Surface

### Strategy

Mixed tonal shift and hairline borders. Panels use tonal steps; cards and controls use subtle borders; shadows are limited to inset/ring-like depth on elevated controls.

| Level | Token | Usage |
|-------|-------|-------|
| Subtle border | `--color-border-subtle` | Panel separation |
| Default border | `--color-border` | Cards and inputs |
| Panel shadow | `--shadow-panel` | Dark shell containment |

Surfaces should read as native dark materials: precise, low-glare, and compact.
