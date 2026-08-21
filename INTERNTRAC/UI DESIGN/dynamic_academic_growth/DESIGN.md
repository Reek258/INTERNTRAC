---
name: Dynamic Academic Growth
colors:
  surface: '#f7f9fc'
  surface-dim: '#d8dadd'
  surface-bright: '#f7f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f7'
  surface-container: '#eceef1'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e6'
  on-surface: '#191c1e'
  on-surface-variant: '#574236'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f4'
  outline: '#8b7264'
  outline-variant: '#dfc0b0'
  surface-tint: '#984700'
  primary: '#984700'
  on-primary: '#ffffff'
  primary-container: '#fd7e14'
  on-primary-container: '#5e2900'
  inverse-primary: '#ffb68a'
  secondary: '#6b33dc'
  on-secondary: '#ffffff'
  secondary-container: '#8552f6'
  on-secondary-container: '#fffbff'
  tertiary: '#5e5e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#a2a1a1'
  on-tertiary-container: '#383838'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbc8'
  primary-fixed-dim: '#ffb68a'
  on-primary-fixed: '#321300'
  on-primary-fixed-variant: '#743500'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5509c6'
  tertiary-fixed: '#e4e2e2'
  tertiary-fixed-dim: '#c8c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#474747'
  background: '#f7f9fc'
  on-background: '#191c1e'
  surface-variant: '#e0e3e6'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  title-lg:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1200px
  section-gap: 96px
  gutter: 24px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

The design system is engineered for a modern internship portal, bridging the gap between academic energy and professional reliability. The brand personality is **ambitious, structured, and vibrant**. It targets students and early-career professionals who seek clarity and action.

The visual style is **Corporate Modern with High-Contrast accents**. It utilizes a clean, white-space-heavy foundation to ensure high legibility of information-dense content, punctuated by bold blocks of saturated color to guide the user's attention. The emotional response is one of "informed optimism"—the interface feels organized enough to trust with one's career, but energetic enough to feel relevant to a younger demographic.

## Colors

The palette is built on a high-energy contrast between "Action Orange" and "Intellectual Purple." 

- **Primary (#FD7E14):** Used for primary calls-to-action, key highlights in headlines, and energetic background blocks. It represents momentum and opportunity.
- **Secondary (#7843E9):** Used for secondary feature cards, accent icons, and trust-building sections. It provides a professional, stable counter-balance to the orange.
- **Neutral Tier:** The design uses a deep charcoal (#4D4D4D) for primary body text to reduce eye strain compared to pure black, and a very light cool grey (#F5F7FA) for section backgrounds to create subtle visual separation.

## Typography

This design system uses a dual-typeface system to balance character with utility. 

**Hanken Grotesk** is the primary display face. It is used for all headlines and titles to provide a sharp, contemporary, and authoritative feel. Its tight apertures and geometric construction lend a "tech-forward" look to the internship portal.

**Inter** is the workhorse for body copy and UI labels. It is chosen for its exceptional legibility at small sizes, particularly critical for job descriptions and application forms.

**Scale & Contrast:** Headlines should utilize "Primary Color Highlights"—where a single impactful word in a heading is colored in the primary orange to draw the eye. Paragraphs should maintain a line height of at least 1.5 to ensure readability across long internship listings.

## Layout & Spacing

The layout follows a **12-column fluid grid** with a maximum container width of 1200px for desktop. 

- **Vertical Rhythm:** A generous 96px gap is maintained between major sections to allow the brand's bold colors to breathe. Within components, spacing follows a base-8 scale (8px, 16px, 24px).
- **Responsive Behavior:** On mobile, the 12-column grid collapses to 1 column with 16px side margins. Tablets utilize a 2-column or 6-column approach depending on the density of the content.
- **Alignment:** Content is generally center-aligned for marketing sections but switches to left-aligned for functional areas like dashboard views or list filters to facilitate faster scanning.

## Elevation & Depth

Visual hierarchy is primarily established through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Surface Levels:** The base background is white (#FFFFFF). Cards or secondary sections use the neutral-light tint (#F5F7FA) to create a subtle recessed look.
- **Shadows:** When used (e.g., on hover for cards), shadows must be extremely diffused: `0px 4px 20px rgba(0, 0, 0, 0.05)`. Avoid heavy, dark shadows.
- **Interaction:** Floating elements like "Apply Now" bars use a minimal Y-axis offset to suggest they are "above" the content without breaking the clean, flat aesthetic of the system.

## Shapes

The shape language is **Soft (Level 1)**. This ensures the UI feels approachable and modern without becoming overly "bubbly" or juvenile.

- **Standard Elements:** Buttons, input fields, and small chips use a 0.25rem (4px) corner radius.
- **Large Elements:** Feature cards and image containers use a 0.5rem (8px) radius to soften the visual impact of large blocks of color.
- **Icons:** Should be linear and use a consistent 2px stroke weight, matching the geometric nature of the Hanken Grotesk typeface.

## Components

### Buttons
- **Primary:** Solid Primary Orange (#FD7E14) with White text. Rectangular with 4px radius. 
- **Secondary:** Solid Secondary Purple (#7843E9) or Ghost style (Orange border/text).
- **Hover State:** Slight darkening of the background color and a 2px lift shadow.

### Cards
- Feature cards utilize a solid background of either Primary or Secondary colors with white text for high-impact sections. 
- Content cards (like blog posts or job listings) use a white background with a subtle 1px border (#E5E7EB) and a soft hover elevation.

### Input Fields
- Understated styling: 1px light grey border that transitions to the Primary Orange on focus. 
- Labels sit above the field in `label-md` Inter font.

### Chips & Badges
- Used for internship categories (e.g., "Remote," "Full-time"). 
- Low-saturation backgrounds with high-saturation text of the same hue (e.g., light orange background with deep orange text).

### Navigation
- Top-mounted, clean white bar with `label-md` links. The "Sign Up" button is always the primary action in the top right.