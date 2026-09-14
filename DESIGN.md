# Noir Studio — Design System

Premium women's beauty salon brand identity. Dark luxury aesthetic with warm gold accents, editorial typography, and cinematic motion design.

---

## Color Palette

### Neutrals
- **Charcoal** `#232323` — primary background, text on light surfaces
- **Charcoal Soft** `#34302C` — subtle depth, card backgrounds
- **Ivory** `#FDFAF5` — canvas white, warm body text
- **Ivory Warm** `#F7F1E6` — soft reading surfaces
- **Blush** `#F6EDE7` — muted accent for soft surfaces

### Gold System (Duotone)
- **Gold** `#A07C3B` — workhorse: borders, fine details, secondary text
- **Gold Bright** `#C9A96A` — signal: CTAs, badges, primary accents
- **Gold Light** `#D9BD84` — hover lift, interactive feedback
- **Gold Deep** `#6E5426` — edges on dark surfaces, strong borders
- **Gold Soft** `rgba(160, 124, 59, 0.14)` — hairline borders, subtle dividers
- **Gold Soft 2** `rgba(160, 124, 59, 0.08)` — ghost text, texture overlays

### Accents
- **Rose Gold** `#C4857A` — tertiary accent for warmth
- **Text Muted** `#8A7F76` — secondary prose
- **Text Soft** `#5C5650` — tertiary prose
- **White** `#FFFFFF` — emphasis, highest contrast

---

## Typography

### Fonts
- **Display**: Cormorant Garamond, Georgia, serif — Editorial elegance for headings
- **Body**: Jost, Inter, system-ui, sans-serif — Modern clean prose and UI
- **Accent**: Cormorant Garamond (legacy alias) — Serif flourish for special moments

### Type Scale (Fluid, clamp-based)
| Role | Min | Fluid | Max |
|------|-----|-------|-----|
| **Eyebrow** | 0.6875rem (11px) | — | — |
| **Small** | 0.8125rem (13px) | — | — |
| **Body** | 1rem (16px) | — | — |
| **Lead** | 1.0625rem | 0.4vw + 0.97rem | 1.25rem |
| **H3** | 1.125rem | 0.5vw + 1rem | 1.375rem |
| **H4** | 1.25rem | 0.8vw + 1.05rem | 1.625rem |
| **H2** | 2.25rem | 3.2vw + 1.3rem | 3.5rem |
| **H1** | 3rem | 5.5vw + 1.4rem | 5.25rem |
| **Display** | 3.5rem | 8vw + 0.5rem | 7.5rem |

**Mobile Overrides**
- Eyebrow: 0.875rem (14px)
- Small: 0.9375rem (15px)
- Body: 1.0625rem (17px)

### Usage
- **Headings (H1–H3)**: Cormorant Garamond, weight 300–500, letter-spacing 0.05–0.15em
- **Body**: Jost 400, line-height 1.6, letter-spacing normal
- **Eyebrows**: Jost 500, uppercase, letter-spacing 0.1em
- **Monospace accents**: Monospace for technical/code elements (price tags, service codes)

---

## Spacing & Layout

### Spacing Scale
```
--space-1: 4px    --space-2: 8px    --space-3: 12px   --space-4: 16px
--space-6: 24px   --space-8: 32px   --space-12: 48px
--space-16: 64px  --space-24: 96px
```

### Section Spacing
- **Section Y** (default): `clamp(120px, 16vh, 200px)` — breathing room between sections
- **Section Y Large**: `clamp(160px, 22vh, 260px)` — hero and hero-like sections
- **Header Height**: `84px` — fixed nav

### Container
- **Max Width**: 1200px centered
- **Mobile Padding**: 1.5rem–2rem horizontal
- **Desktop Padding**: 3rem–4rem horizontal

---

## Components

### Buttons & CTAs
- **Book CTA** (primary): Gold Bright background, charcoal text, rounded 4px, 0.75rem padding vertical
- **Ghost CTA** (secondary): Transparent bg, gold border, gold text, hover opacity 0.8
- **Book This** (service card): Gold bright, full width, uppercase 0.85rem, letter-spacing 0.1em

### Cards
- **Service Card**: Border-top only (gold soft), no box shadow, semi-transparent veil on image hover
- **Service Media**: Image + price tag overlay, arrow icon on hover
- **Service Body**: Title serif 1.8rem, description 0.95rem, price eyebrow

### Hero
- **Canvas Scrub**: Full-screen canvas, 144-frame sequence, 1620px pin distance
- **Progress Bar**: Hairline gold, animated fill on scroll
- **Hero Text**: Display serif, centered, label + title + subtitle + CTA
- **Mobile Fallback**: MP4 video looping

### Navigation
- **Fixed Header**: Mix-blend-mode: difference, stays readable on any background
- **Logo**: Serif, uppercase, letter-spacing 0.25em, 1.8rem
- **Nav Links**: Uppercase 0.85rem, letter-spacing 0.1em, hover opacity 0.7
- **Mobile Menu**: Full-screen overlay, staggered reveal, soft transitions

### Footer
- **Grid Layout**: Auto-fit columns min 200px
- **Links**: Small 0.9rem, opacity 0.7, gold headings
- **Border Top**: Hairline gold

---

## Motion & Animation

### Easing Functions
- **Standard**: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` — everyday interactions
- **Lux**: `cubic-bezier(0.19, 1, 0.22, 1)` — smooth overshoot for elegance
- **Soft**: `cubic-bezier(0.4, 0, 0.2, 1)` — decelerate ease

### Timing
- **Fast**: 0.25s — micro-interactions (hover states)
- **Base**: 0.4s — standard reveal/fade
- **Slow**: 0.8s — preloader, grand entrances

### Animations
- **Heading Reveals**: Split-line fade-in on scroll, staggered by word
- **Fade-Up Stagger**: 0.08s delay between cards
- **Canvas Scrub**: Frame-by-frame on scroll, 144 frames total
- **Smooth Scroll**: Lenis duration 1.2s, easing `Math.min(1, 1.001 - Math.pow(2, -10 * t))`
- **Magnetic Buttons**: Cursor attraction, elastic ease-out on release

---

## Visual Treatments

### Surfaces
- **Radius Soft**: 4px — subtle rounding
- **Radius Card**: 8px — card corners
- **Shadow Rest**: `0 1px 2px rgba(35, 35, 35, 0.03), 0 12px 32px rgba(35, 35, 35, 0.04)`
- **Shadow Lift**: `0 2px 4px rgba(35, 35, 35, 0.04), 0 24px 48px rgba(35, 35, 35, 0.07)`

### Textures & Overlays
- **Grain**: Procedural SVG turbulence, 5% opacity
- **Grid Gold**: Repeating linear gradient, 1px lines every 72px, gold-soft-2

### Vignette
- **Hero Warm Vignette**: Radial gradient fade on hero canvas, warmth accent

---

## Accessibility & Performance

### Principles
- **Contrast**: Gold bright on charcoal meets WCAG AA
- **Focus**: Clear keyboard navigation, visible focus rings
- **Motion**: Reduced motion respected via prefers-reduced-motion media query
- **Images**: Lazy-load with native `loading="lazy"`, explicit alt text

### Performance
- **Fonts**: Self-hosted via @fontsource (no Google Fonts render-blocking)
- **Images**: WebP + AVIF via Cloudinary, responsive srcset
- **Canvas**: Desktop only; mobile fallback to MP4 video
- **Code Splitting**: GSAP + ScrollTrigger lazy-loaded

---

## Tone & Vibe

**Noir Studio** embodies:
- **Luxe, not ostentatious** — refined gold accents, editorial serif
- **Intimate & warm** — warm ivory, rose-gold accents, soft spacing
- **Motion-forward** — cinematic hero, smooth scroll, magnetic interactions
- **Female-centric** — empowering copy, focus on personal beauty rituals
- **Calm & meditative** — dark canvas, slow easing, breathing room

Every interaction whispers rather than shouts. Gold is reserved for signals (CTAs, badges). Details matter: letter-spacing, line-height, subtle shadows.

---

## Mode: Persuade + Operate Hybrid

This is a **landing page with operational booking flow**. The hero and hero-adjacent sections (Services, Testimonials) are **Persuade** — convince the visitor and inspire action. The booking modal, FAQ, pricing table are **Operate** — clarity and precision matter.
