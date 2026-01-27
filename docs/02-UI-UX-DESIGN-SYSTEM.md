# ContentForge - UI/UX Design System

> **Version:** 1.0.0
> **Last Updated:** January 2026
> **Status:** Active Development

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Glassmorphism System](#glassmorphism-system)
5. [Animation Guidelines](#animation-guidelines)
6. [Responsive Design](#responsive-design)
7. [Spacing & Layout Grid](#spacing--layout-grid)
8. [Component Patterns](#component-patterns)
9. [Iconography](#iconography)
10. [Accessibility](#accessibility)

---

## Design Philosophy

ContentForge employs a **"Deep Space Forge"** aesthetic, a dark-mode-first design language that evokes the vastness and precision of a cosmic forge where raw ideas are transformed into polished content. The visual system communicates:

- **Intelligence:** Neural network patterns and glowing connections suggest AI-powered thinking.
- **Transformation:** Particle systems and processing animations visualize the journey from input to output.
- **Precision:** Clean typography, structured layouts, and consistent spacing convey professionalism.
- **Approachability:** Glassmorphism, soft glows, and smooth animations keep the interface inviting.

### Design Principles

1. **Clarity Over Decoration:** Every visual element must serve a functional purpose.
2. **Progressive Disclosure:** Reveal complexity only when the user needs it.
3. **Delightful Feedback:** Every interaction should produce visible, meaningful feedback.
4. **Consistent Rhythm:** Spacing, sizing, and timing should follow predictable patterns.

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Deep Space** | `#0a0e1a` | `10, 14, 26` | Primary background, the "canvas" of the application |
| **Surface** | `#111827` | `17, 24, 39` | Card backgrounds, elevated surfaces |
| **Surface Light** | `#1f2937` | `31, 41, 55` | Hover states, secondary surfaces, dividers |

### Accent / Glow Colors

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Cyan Glow** | `#00f0ff` | `0, 240, 255` | Primary accent, CTAs, active states, links |
| **Purple Glow** | `#a855f7` | `168, 85, 247` | Secondary accent, AI indicators, processing |
| **Pink Glow** | `#f472b6` | `244, 114, 182` | Tertiary accent, highlights, notifications |
| **Mint Green** | `#34d399` | `52, 211, 153` | Success states, positive metrics, confirmations |

### Text Colors

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Text Primary** | `#f9fafb` | `249, 250, 251` | Headings, body text, primary content |
| **Text Secondary** | `#9ca3af` | `156, 163, 175` | Descriptions, labels, secondary information |
| **Text Muted** | `#6b7280` | `107, 114, 128` | Placeholders, disabled text, timestamps |
| **Text Inverse** | `#111827` | `17, 24, 39` | Text on light/accent backgrounds |

### Semantic Colors

| Name | Hex | Usage |
|---|---|---|
| **Error** | `#ef4444` | Validation errors, destructive actions |
| **Warning** | `#f59e0b` | Caution states, approaching limits |
| **Success** | `#34d399` | Confirmations, completed actions |
| **Info** | `#00f0ff` | Informational messages, tips |

### Gradient Definitions

```css
/* Primary CTA Gradient */
.gradient-primary {
  background: linear-gradient(135deg, #00f0ff, #a855f7);
}

/* Hero Background Gradient */
.gradient-hero {
  background: radial-gradient(ellipse at center, #1a1040 0%, #0a0e1a 70%);
}

/* Card Hover Glow */
.gradient-glow {
  background: linear-gradient(135deg, rgba(0,240,255,0.1), rgba(168,85,247,0.1));
}

/* Processing Visualization Gradient */
.gradient-neural {
  background: linear-gradient(180deg, #a855f7, #00f0ff, #f472b6);
}

/* Text Gradient (for headings) */
.gradient-text {
  background: linear-gradient(to right, #00f0ff, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## Typography

### Font Stack

| Role | Font Family | Fallback Stack | Weight Range |
|---|---|---|---|
| **Headings** | Space Grotesk | `system-ui, -apple-system, sans-serif` | 500 - 700 |
| **Body** | Inter | `system-ui, -apple-system, sans-serif` | 300 - 600 |
| **Code / Status** | JetBrains Mono | `'Fira Code', 'Courier New', monospace` | 400 - 500 |

### Font Loading Strategy

```html
<!-- Google Fonts preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Typography Scale

| Class | Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `text-xs` | 0.75rem (12px) | 1rem | 400 | Badges, timestamps, fine print |
| `text-sm` | 0.875rem (14px) | 1.25rem | 400 | Labels, helper text, captions |
| `text-base` | 1rem (16px) | 1.5rem | 400 | Body text, descriptions, form inputs |
| `text-lg` | 1.125rem (18px) | 1.75rem | 500 | Emphasized body, card titles |
| `text-xl` | 1.25rem (20px) | 1.75rem | 500 | Section subtitles, feature labels |
| `text-2xl` | 1.5rem (24px) | 2rem | 600 | Card headings, section titles |
| `text-3xl` | 1.875rem (30px) | 2.25rem | 600 | Page subtitles |
| `text-4xl` | 2.25rem (36px) | 2.5rem | 700 | Page titles |
| `text-5xl` | 3rem (48px) | 1.15 | 700 | Hero subheadings |
| `text-6xl` | 3.75rem (60px) | 1.1 | 700 | Hero headings (desktop) |
| `text-7xl` | 4.5rem (72px) | 1.05 | 700 | Hero headings (large desktop) |

### Typography Usage Guidelines

- **Headings (Space Grotesk):** Use for all `h1`-`h6` elements, navigation items, button labels, and any text that needs to command attention.
- **Body (Inter):** Use for paragraph text, form labels, descriptions, list items, and all general reading content.
- **Code (JetBrains Mono):** Use for processing status text, metric values, code snippets, terminal-style outputs, and technical labels.

### Text Styling Patterns

```css
/* Gradient heading */
.heading-gradient {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  background: linear-gradient(to right, #00f0ff, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Glowing text effect */
.text-glow {
  text-shadow: 0 0 20px rgba(0, 240, 255, 0.5),
               0 0 40px rgba(0, 240, 255, 0.2);
}

/* Status text (monospace) */
.status-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #00f0ff;
}
```

---

## Glassmorphism System

Glassmorphism is the defining visual language of ContentForge. All elevated surfaces, cards, and modals use this treatment.

### Base Glassmorphism

```css
.glass {
  background: rgba(255, 255, 255, 0.05);    /* bg-white/5 */
  backdrop-filter: blur(24px);                /* backdrop-blur-xl */
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1); /* border-white/10 */
  border-radius: 1rem;                        /* rounded-2xl */
}
```

### Glassmorphism Variants

| Variant | Background | Blur | Border | Use Case |
|---|---|---|---|---|
| **Subtle** | `bg-white/3` | `backdrop-blur-md` (12px) | `border-white/5` | Background panels, footers |
| **Standard** | `bg-white/5` | `backdrop-blur-xl` (24px) | `border-white/10` | Cards, form containers, modals |
| **Elevated** | `bg-white/8` | `backdrop-blur-2xl` (40px) | `border-white/15` | Active cards, dropdowns, tooltips |
| **Accent** | `bg-cyan-500/5` | `backdrop-blur-xl` (24px) | `border-cyan-500/20` | CTA cards, highlighted sections |

### Card Component Patterns

```tsx
{/* Standard Glass Card */}
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
  {children}
</div>

{/* Interactive Glass Card (with hover) */}
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6
                hover:bg-white/8 hover:border-white/20
                transition-all duration-300 cursor-pointer">
  {children}
</div>

{/* Glowing Glass Card */}
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6
                shadow-lg shadow-cyan-500/10
                hover:shadow-cyan-500/20 hover:border-cyan-500/30
                transition-all duration-300">
  {children}
</div>
```

### Glass Surface Hierarchy

```
┌─ Deep Space Background (#0a0e1a) ──────────────────────┐
│                                                          │
│  ┌─ Subtle Glass (bg-white/3) ────────────────────────┐ │
│  │                                                      │ │
│  │  ┌─ Standard Glass (bg-white/5) ─────────────────┐  │ │
│  │  │                                                 │  │ │
│  │  │  ┌─ Elevated Glass (bg-white/8) ────────────┐  │  │ │
│  │  │  │                                           │  │  │ │
│  │  │  │  Content lives here                       │  │  │ │
│  │  │  │                                           │  │  │ │
│  │  │  └───────────────────────────────────────────┘  │  │ │
│  │  │                                                 │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Animation Guidelines

### Core Animations

#### Float Animation
Used for: Hero elements, decorative particles, background elements.

```css
@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-10px) rotate(1deg);
  }
  66% {
    transform: translateY(5px) rotate(-1deg);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
```

#### Pulse Glow Animation
Used for: Active indicators, processing state, CTA buttons.

```css
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 240, 255, 0.4),
                0 0 60px rgba(0, 240, 255, 0.1);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

#### Slide Up Animation
Used for: Page content entry, card reveals, section transitions.

```css
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.6s ease-out forwards;
}
```

#### Fade In Animation
Used for: Content appearance, overlay backgrounds, toast messages.

```css
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out forwards;
}
```

#### Particle Drift Animation
Used for: Processing visualization background, ambient decoration.

```css
@keyframes particle-drift {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--drift-x, 100px), var(--drift-y, -200px)) scale(0.5);
    opacity: 0;
  }
}

.animate-particle-drift {
  animation: particle-drift var(--duration, 8s) linear infinite;
}
```

### Animation Timing Reference

| Animation | Duration | Easing | Iteration |
|---|---|---|---|
| Float | 6s | ease-in-out | infinite |
| Pulse Glow | 2s | ease-in-out | infinite |
| Slide Up | 0.6s | ease-out | once |
| Fade In | 0.4s | ease-out | once |
| Particle Drift | 6-12s (varied) | linear | infinite |
| Button Hover | 0.3s | ease | on hover |
| Card Hover | 0.3s | ease | on hover |
| Page Transition | 0.3s | ease-in-out | once |
| Toast Enter | 0.3s | ease-out | once |
| Toast Exit | 0.2s | ease-in | once |

### Processing Visualization Animations

The processing phase uses a coordinated animation sequence:

```
Time (seconds)
0s ─────────── 3s ─────────── 6s ─────────── 9s ─────────── 12s
│              │              │              │               │
├─ Particles   ├─ Agent Nodes ├─ Neural Net  ├─ Refinement  ├─ Complete
│  fade in     │  connect     │  activates   │  particles   │  fade out
│  drift       │  pulse       │  propagates  │  converge    │  to output
│              │              │              │               │
└── Step 1 ────┴── Step 2 ────┴── Step 3 ────┴── Step 4 ────┘
   Analyzing     Researching    Generating     Polishing
```

### Reduced Motion Support

All animations must respect the user's system preference:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Responsive Design

### Breakpoint System

| Name | Min Width | Tailwind Prefix | Target Devices |
|---|---|---|---|
| **Mobile** | 0px | (default) | Phones in portrait (320-639px) |
| **Tablet** | 640px | `sm:` | Phones in landscape, small tablets |
| **Tablet Large** | 768px | `md:` | Tablets in portrait, large phones landscape |
| **Desktop** | 1024px | `lg:` | Tablets in landscape, laptops, small desktops |
| **Desktop Large** | 1280px | `xl:` | Standard desktops |
| **Desktop XL** | 1536px | `2xl:` | Large monitors, ultrawide displays |

### Layout Strategy by Breakpoint

#### Mobile (< 640px)
- **Navigation:** Hamburger menu with full-screen overlay
- **Content Grid:** Single column, full width
- **Cards:** Stacked vertically, full width with 16px padding
- **Typography:** Hero text scales down (text-3xl to text-4xl)
- **Forge Input:** All selectors stacked vertically
- **Visualization:** Simplified particle count, smaller canvas
- **Touch Targets:** Minimum 44px x 44px

#### Tablet (640px - 1024px)
- **Navigation:** Horizontal nav with condensed items
- **Content Grid:** Two-column grid where appropriate
- **Cards:** 2-column grid for feature cards and selectors
- **Typography:** Mid-range scale (text-4xl to text-5xl)
- **Forge Input:** 2-column grid for selectors, full-width topic input
- **Visualization:** Full particle system, medium canvas

#### Desktop (> 1024px)
- **Navigation:** Full horizontal navigation with all items visible
- **Content Grid:** Multi-column layouts, max-width container
- **Cards:** 3-column grid for features, 2-column for selectors
- **Typography:** Full scale (text-5xl to text-7xl)
- **Forge Input:** Side-by-side layout options
- **Visualization:** Full effects, maximum particle count

### Responsive Patterns

```tsx
{/* Responsive Grid Example */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

{/* Responsive Typography */}
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl
               font-bold tracking-tight">
  Content<span className="text-gradient">Forge</span>
</h1>

{/* Responsive Padding */}
<section className="px-4 sm:px-6 md:px-8 lg:px-12 py-12 md:py-20 lg:py-28">
  {children}
</section>

{/* Responsive Visibility */}
<nav className="hidden md:flex items-center gap-6">
  {/* Desktop navigation */}
</nav>
<button className="md:hidden" aria-label="Open menu">
  {/* Mobile menu button */}
</button>
```

---

## Spacing & Layout Grid

### Spacing Scale

ContentForge uses Tailwind's default spacing scale, with these as the most frequently used values:

| Token | Value | Usage |
|---|---|---|
| `space-1` | 0.25rem (4px) | Inline element gaps, icon-to-text spacing |
| `space-2` | 0.5rem (8px) | Tight element groups, badge padding |
| `space-3` | 0.75rem (12px) | Small button padding, compact card padding |
| `space-4` | 1rem (16px) | Standard element gap, mobile page padding |
| `space-6` | 1.5rem (24px) | Card internal padding, form field gaps |
| `space-8` | 2rem (32px) | Section gaps, card grid gaps |
| `space-12` | 3rem (48px) | Section padding (vertical, mobile) |
| `space-16` | 4rem (64px) | Major section padding (vertical, tablet) |
| `space-20` | 5rem (80px) | Major section padding (vertical, desktop) |
| `space-24` | 6rem (96px) | Hero section padding |

### Container System

```css
/* Max widths for content containment */
.container-sm   { max-width: 640px; }   /* Auth forms, modals */
.container-md   { max-width: 768px; }   /* Content display */
.container-lg   { max-width: 1024px; }  /* Forge workspace */
.container-xl   { max-width: 1280px; }  /* Standard page content */
.container-2xl  { max-width: 1536px; }  /* Full-width sections */
```

### Layout Grid

```
┌──────────────────────────────────────────────────────┐
│                    Navbar (fixed)                      │
│  h-16 | px-4 sm:px-6 lg:px-8 | max-w-7xl mx-auto    │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌─ Main Content ──────────────────────────────────┐  │
│  │  max-w-7xl mx-auto                              │  │
│  │  px-4 sm:px-6 lg:px-8                           │  │
│  │  py-12 md:py-20 lg:py-28                        │  │
│  │                                                  │  │
│  │  ┌─ Content Grid ─────────────────────────────┐  │  │
│  │  │  grid gap-4 md:gap-6 lg:gap-8              │  │  │
│  │  │                                             │  │  │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐    │  │  │
│  │  │  │  Card   │  │  Card   │  │  Card   │    │  │  │
│  │  │  │  p-6    │  │  p-6    │  │  p-6    │    │  │  │
│  │  │  └─────────┘  └─────────┘  └─────────┘    │  │  │
│  │  │                                             │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                       │
├──────────────────────────────────────────────────────┤
│                      Footer                           │
│  py-8 | border-t border-white/10                      │
└──────────────────────────────────────────────────────┘
```

---

## Component Patterns

### Button Variants

```tsx
{/* Primary Button */}
<button className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-purple-500
                   text-white font-semibold rounded-xl
                   hover:shadow-lg hover:shadow-cyan-500/25
                   transition-all duration-300
                   active:scale-95">
  Generate Content
</button>

{/* Secondary Button */}
<button className="px-6 py-3 bg-white/5 backdrop-blur-xl
                   border border-white/10 text-white font-medium rounded-xl
                   hover:bg-white/10 hover:border-white/20
                   transition-all duration-300">
  View History
</button>

{/* Ghost Button */}
<button className="px-4 py-2 text-gray-400
                   hover:text-white hover:bg-white/5
                   rounded-lg transition-all duration-200">
  Cancel
</button>

{/* Icon Button */}
<button className="p-2 text-gray-400 hover:text-cyan-400
                   hover:bg-white/5 rounded-lg
                   transition-all duration-200"
        aria-label="Copy to clipboard">
  <Copy className="w-5 h-5" />
</button>
```

### Input Fields

```tsx
{/* Text Input */}
<input
  type="text"
  className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl
             border border-white/10 rounded-xl
             text-white placeholder-gray-500
             focus:outline-none focus:ring-2 focus:ring-cyan-500/50
             focus:border-cyan-500/50
             transition-all duration-200"
  placeholder="Enter your topic..."
/>

{/* Textarea */}
<textarea
  className="w-full px-4 py-3 bg-white/5 backdrop-blur-xl
             border border-white/10 rounded-xl
             text-white placeholder-gray-500
             focus:outline-none focus:ring-2 focus:ring-cyan-500/50
             resize-none h-32
             transition-all duration-200"
  placeholder="Describe your content topic in detail..."
/>
```

### Selection Cards

```tsx
{/* Selectable Option Card */}
<button
  className={`p-4 rounded-xl border transition-all duration-300 text-left
    ${isSelected
      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
      : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
    }`}
  onClick={onSelect}
>
  <div className="flex items-center gap-3">
    <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
    <span className={`font-medium ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
      {label}
    </span>
  </div>
  <p className="mt-1 text-sm text-gray-400">{description}</p>
</button>
```

---

## Iconography

### Icon Library

ContentForge uses **Lucide React** for all icons. Lucide provides:

- Tree-shakeable imports (only used icons are bundled)
- Consistent 24x24 grid with 2px stroke width
- Full TypeScript support

### Icon Sizing Convention

| Size Class | Pixel Size | Usage |
|---|---|---|
| `w-4 h-4` | 16px | Inline icons, badges, small buttons |
| `w-5 h-5` | 20px | Standard button icons, list icons |
| `w-6 h-6` | 24px | Navigation icons, card icons |
| `w-8 h-8` | 32px | Feature icons, empty states |
| `w-12 h-12` | 48px | Hero feature icons, large decorative |

### Icon Color Convention

- **Default state:** `text-gray-400`
- **Hover state:** `text-white` or `text-cyan-400`
- **Active/Selected:** `text-cyan-400`
- **Success:** `text-emerald-400`
- **Error:** `text-red-400`

---

## Accessibility

### Color Contrast Compliance

| Combination | Contrast Ratio | WCAG Level |
|---|---|---|
| Text Primary (#f9fafb) on Deep Space (#0a0e1a) | 18.3:1 | AAA |
| Text Secondary (#9ca3af) on Deep Space (#0a0e1a) | 7.5:1 | AAA |
| Text Muted (#6b7280) on Deep Space (#0a0e1a) | 4.6:1 | AA |
| Cyan Glow (#00f0ff) on Deep Space (#0a0e1a) | 12.1:1 | AAA |
| Cyan Glow (#00f0ff) on Surface (#111827) | 10.8:1 | AAA |
| Text Primary (#f9fafb) on Surface (#111827) | 15.4:1 | AAA |

### Focus Management

```css
/* Custom focus ring for dark theme */
.focus-ring {
  outline: none;
}

.focus-ring:focus-visible {
  outline: 2px solid #00f0ff;
  outline-offset: 2px;
  border-radius: 0.5rem;
}
```

### ARIA Patterns

- **Live Regions:** Processing status updates use `aria-live="polite"`
- **Role Assignments:** Content type selectors use `role="radiogroup"` and `role="radio"`
- **Labels:** All interactive elements have accessible names via `aria-label` or visible label association
- **Skip Navigation:** A skip link is provided for keyboard users

---

*This design system document ensures visual and interaction consistency across all ContentForge components. Refer to this document when implementing new UI elements or modifying existing ones.*
