---
name: Pathway Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d1d9fb'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3ff'
  surface-container: '#ebedff'
  surface-container-high: '#e3e7ff'
  surface-container-highest: '#dbe1ff'
  on-surface: '#121a34'
  on-surface-variant: '#444654'
  inverse-surface: '#272f4a'
  inverse-on-surface: '#eff0ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#304fd8'
  primary: '#0333c0'
  on-primary: '#ffffff'
  primary-container: '#2f4fd8'
  on-primary-container: '#d0d6ff'
  inverse-primary: '#b9c3ff'
  secondary: '#006a64'
  on-secondary: '#ffffff'
  secondary-container: '#81f6eb'
  on-secondary-container: '#00716a'
  tertiary: '#633f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#835400'
  on-tertiary-container: '#ffd095'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001258'
  on-primary-fixed-variant: '#0433c1'
  secondary-fixed: '#81f6eb'
  secondary-fixed-dim: '#63d9cf'
  on-secondary-fixed: '#00201e'
  on-secondary-fixed-variant: '#00504b'
  tertiary-fixed: '#ffddb5'
  tertiary-fixed-dim: '#ffb957'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#643f00'
  background: '#faf8ff'
  on-background: '#121a34'
  surface-variant: '#dbe1ff'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a structured, serene, and academically rigorous digital environment for interactive learning and simulation management. The UI balances two distinct user mindsets: the analytical precision required by institutional educators and the approachable clarity needed by students undergoing complex training.

The aesthetic philosophy is **Corporate Modern with Focused Serenity**:
- **Clarity over ornamentation:** Interfaces reduce cognitive fatigue during dense educational tasks.
- **Dual-mode contextual ergonomics:** Administrative and curriculum management surfaces adopt an airy, clean light canvas, while live simulation and instrumentation zones shift into a high-legibility dark mode engineered for continuous visual telemetry.
- **Restrained dynamism:** Interactions feel deliberate, responsive, and grounded, avoiding distracting flourishes in favor of crisp feedback and accessible data visualization.

## Colors

The palette is engineered for high readability, explicit intent, and WCAG AA compliance across both administrative light mode and immersive simulation dark mode.

### Core Swatches & Tonal Roles
- **Primary (`#2F4FD8`):** The primary interaction anchor for primary actions, navigation indicators, and key focus boundaries. Hover state shifts to `#233DB0`. Background container tint sits at `#EEF1FD`.
- **Accent (`#0E9F96`):** Secondary interactions, progress tracking, and interactive milestones. For text elements requiring contrast against light surfaces, use `#0B7A73`.
- **Highlight (`#F5A524`):** Strictly reserved for visual badges, achievement fills, and momentary progress highlights. Do not apply as text or small icons.
- **Feedback Palette:**
  - **Success:** `#16A34A`
  - **Warning:** `#D97706`
  - **Error:** `#DC2626`

### Canvas & Neutral Framework
- **Light Theme (Standard UI):**
  - App Background: `#F7F8FB`
  - Card & Surface: `#FFFFFF`
  - Structural Border: `#E3E6EE`
  - Primary Text: `#18203A`
  - Secondary Text: `#5A6378`
- **Dark Theme (Simulation & Telemetry Surfaces):**
  - Workspace Canvas: `#0F1A2E`
  - Instrument Panels: `#16233D`
  - High-Contrast Text: `#E6ECF7`
  - Telemetry Accents: Cyan (`#38BDF8`), Emerald (`#34D399`), Amber (`#F59E0B`)

## Typography

The type hierarchy prioritizes crisp scannability and structural neutrality using **Inter** across all system controls, dashboards, and instructional copy.

### Monospace Telemetry
**JetBrains Mono** is utilized exclusively inside simulation workspaces, computational terminals, runtime telemetry logs, and state indicators. It must not be used for generic tabular numbers or form inputs outside of simulation environments.

### Type Pairing & Formatting Guidelines
- **Titles (28px Semibold):** Reserve for page view headers and primary modal titles. On small viewports, downscale via `headline-xl-mobile`.
- **Section Headings (18px Semibold):** Used for panel division, card grouping, and sub-module anchors.
- **Body Copy (15px Regular):** Standard baseline for assignments, instructions, and communication feeds. Ensures optimal optical density across dense desktop views.
- **Labels (13px Medium):** Standard for table headers, metadata badges, input labels, and auxiliary tabs.

## Layout & Spacing

The layout is anchored strictly to an **8px base grid** (`0.5rem` = 8px), maintaining dimensional harmony between administrative tables, simulation viewports, and sidebar controls.

### Grid & Breakpoints
- **Desktop (≥ 1280px):** 12-column layout with `margin: 2rem` (32px) and `gutter: 1.5rem` (24px). Accommodates collapsible tree navigations (260px fixed) alongside fluid stage panels.
- **Tablet (768px – 1279px):** 8-column layout with `margin: 1.5rem` (24px) and `gutter: 1rem` (16px). Secondary telemetry panels collapse into sliding overlay sheets.
- **Mobile (< 768px):** 4-column layout with `margin-mobile: 1rem` (16px) and `gutter-mobile: 1rem` (16px). Interactive simulations default to landscape prompt guards or full-bleed stacked views.

### Rhythm Principles
- Component inner paddings use `space-sm` (8px) for compact tags/chips and `space-md` (16px) for standard field/card containers.
- Stacks between related form fields leverage `space-md` (16px); major module separations leverage `space-xl` (32px).

## Elevation & Depth

This design system avoids heavy drop shadows, favoring **tonal layering and low-contrast borders** to preserve a calm, professional demeanor.

### Elevation Hierarchy
- **Level 0 (Base Canvas):** `#F7F8FB` (Light) / `#0F1A2E` (Dark).
- **Level 1 (Card & Section Containers):** `#FFFFFF` (Light) / `#16233D` (Dark) enclosed with a 1px border of `#E3E6EE` (Light) or `rgba(230, 236, 247, 0.08)` (Dark).
- **Level 2 (Hovered Cards & Dropdowns):** Subtle ambient diffusion: `0 4px 12px rgba(24, 32, 58, 0.06)`, maintaining the boundary border.
- **Level 3 (Modals & Overlays):** Elevation shadow: `0 12px 32px rgba(24, 32, 58, 0.12)`, supported by a tinted backdrop scrim (`rgba(15, 26, 46, 0.5)` with `backdrop-filter: blur(4px)`).

## Shapes

The interface utilizes a tiered geometric radius scheme designed to visually distinguish primary containers from interactive controls:

- **Structural Cards & Workspaces:** Fixed at `12px` border-radius (`0.75rem`) to create smooth framing around dense content.
- **Form Controls & Action Triggers:** Standardized at `8px` border-radius (`0.5rem`) for buttons, text inputs, select dropdowns, and search bars.
- **Badges, Chips & Status Indicators:** Set to fully rounded pill radii (`9999px`) to immediately indicate state and non-interactive taxonomy.
- **Simulation Gauges & Micro-controls:** Crisp `4px` radius (`0.25rem`) used inside JetBrains Mono telemetry clusters for technical feel.

## Components

### Buttons
- **Primary:** Background `#2F4FD8`, text `#FFFFFF`, 8px radius, height 40px, horizontal padding 16px. Hover: `#233DB0`. Active: `#1B308C`.
- **Secondary:** Background `#EEF1FD`, text `#2F4FD8`, border: none, 8px radius. Hover: Background `#E0E6FC`.
- **Outline:** Transparent background, 1px border `#E3E6EE`, text `#18203A`. Hover: Background `#F7F8FB`, border `#CBD2E0`.
- **Destructive:** Background `#DC2626`, text `#FFFFFF`. Hover: `#B91C1C`.

### Form Inputs & Selects
- Height 40px, 8px radius, 1px border `#E3E6EE`, background `#FFFFFF`, font size 15px, text `#18203A`.
- Placeholder text in `#5A6378`.
- Focus state: Border color `#2F4FD8`, box-shadow `0 0 0 3px rgba(47, 79, 216, 0.15)`.

### Cards & Panels
- 12px radius, 1px border `#E3E6EE`, background `#FFFFFF`, padding 24px (`space-lg`).
- Header divided by an internal hairline border or clear 16px vertical gap.

### Chips & Badges
- Pill-shaped (`9999px` radius), height 24px, padding 4px 10px, typography `label-sm` (`12px Medium`).
- Status mappings:
  - Active / Primary: Background `#EEF1FD`, text `#2F4FD8`.
  - In-Progress: Background `#E6F6F5`, text `#0B7A73`.
  - Attention / Highlight: Background `#FEF6E9`, text `#D97706`.
  - Error: Background `#FEECEC`, text `#DC2626`.

### Checkboxes & Radios
- 18px box dimension, border 1.5px `#CBD2E0`, 4px radius (checkboxes) or circular (radios).
- Checked state: `#2F4FD8` fill with crisp white indicator check or dot.

### Tables
- Clean horizontal gridlines (`#E3E6EE`), header background `#F7F8FB`, typography `label-md` in `#5A6378`.
- Cell height 48px, horizontal cell padding 16px, row hover state `#F7F8FB`.

### Simulation Panels & Charts
- Switch to Dark Theme palette: Background `#16233D`, border `rgba(230, 236, 247, 0.1)`.
- Numeric readouts displayed in `code-md` (`JetBrains Mono`).
- Chart lines: Primary simulation path in `#38BDF8`, target baseline in `#34D399`, warning thresholds in `#F59E0B`. Gridlines drawn with `rgba(230, 236, 247, 0.08)`.