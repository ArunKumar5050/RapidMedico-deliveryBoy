---
name: Lumina Medical Logistics
colors:
  surface: '#0e1320'
  surface-dim: '#0e1320'
  surface-bright: '#343948'
  surface-container-lowest: '#090e1b'
  surface-container-low: '#161b29'
  surface-container: '#1a1f2d'
  surface-container-high: '#252a38'
  surface-container-highest: '#303443'
  on-surface: '#dee2f5'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dee2f5'
  inverse-on-surface: '#2b303e'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#4fdbc8'
  on-secondary: '#003731'
  secondary-container: '#04b4a2'
  on-secondary-container: '#003f38'
  tertiary: '#4ae176'
  on-tertiary: '#003915'
  tertiary-container: '#00a74b'
  on-tertiary-container: '#003111'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#0e1320'
  on-background: '#dee2f5'
  surface-variant: '#303443'
typography:
  display-stat:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin: 1rem
  stack-gap: 1.25rem
  inline-gap: 0.75rem
  section-padding: 1.5rem
---

## Brand & Style
The design system for this product is centered on a **Premium Dark Tech** aesthetic, specifically tailored for the high-stakes, fast-paced environment of medical gig-economy logistics in India. The personality is efficient, high-fidelity, and authoritative, instilling confidence in delivery partners.

The visual style is a hybrid of **Glassmorphism** and **High-Contrast Modern**, utilizing deep navy-black foundations layered with neon-adjacent accents. This approach ensures maximum legibility during nighttime operations and reduces eye strain for long-shift users. The interface feels "alive" through the use of subtle glowing borders and pulsing state indicators, reflecting the real-time nature of medical delivery.

## Colors
The palette is built on a deep **#0A0F1C** navy foundation to create infinite depth. 
- **Primary & Secondary**: A high-energy Blue-to-Teal gradient is reserved for critical actions (Start Delivery, Accept Order) and progress tracking.
- **Surface Strategy**: Use `#111827` for secondary surfaces. To create hierarchy, apply a 1px inner border at 10% opacity using the primary or secondary color to simulate "edge lighting."
- **Semantic Colors**: Green, Amber, and Red are used strictly for status (Earnings, Urgent Timers, Errors) and must maintain high saturation to pop against the dark background.

## Typography
The typography utilizes **Inter** exclusively for its neutral, highly legible character. 
- **Numerical Data**: For earnings, distances, and timers, use the `display-stat` role with `tabular-nums` enabled to prevent layout jitter during real-time updates.
- **Hierarchy**: Use `label-bold` for metadata like "PICKUP" or "DROP-OFF" to provide quick scanning. Secondary body text should always use reduced opacity (50-70%) rather than grey hex codes to maintain the deep blue tint of the background.

## Layout & Spacing
The layout follows a **Fluid Grid** model optimized for one-handed mobile use. 
- **Safe Zones**: Maintain a 16px (1rem) side margin for all primary content containers.
- **Touch Targets**: All interactive elements must maintain a minimum height of 48px.
- **Vertical Rhythm**: Use 20px (1.25rem) spacing between major cards to allow the background "glow" effects space to breathe without overlapping.
- **Adaptation**: For tablet devices, the layout shifts to a two-column master-detail view to keep the delivery map persistent on the left while tasks appear on the right.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Luminescent Borders** rather than traditional black shadows.
- **Level 1 (Base)**: `#0A0F1C` - The main app canvas.
- **Level 2 (Cards)**: `#111827` - Use a 1px solid border at 10% white opacity.
- **Level 3 (Active/Floating)**: `#111827` - Add a 1px border using the Primary Gradient at 30% opacity and an external "glow" shadow: `0px 8px 24px rgba(59, 130, 246, 0.15)`.
- **Modals**: Full backdrop blur (20px) with a 20% opacity overlay to isolate the delivery partner's focus on current tasks.

## Shapes
The shape language is **Softly Geometric**, balancing friendliness with professional precision. 
- **Cards**: Large 20px corners create a premium, modern feel.
- **Interactive Elements**: Buttons use a slightly sharper 16px radius to distinguish them from static cards. 
- **Chips/Badges**: Use full pill-shaping (24px+) for status indicators like "Express" or "Cold Chain" to differentiate them from functional UI blocks.

## Components
- **Buttons**: Primary buttons are full-width and use the Blue-Teal gradient. On press, they scale to 0.97x and trigger a brightness flash (1.2x).
- **Navigation**: The bottom bar features a dark translucent background. The active state is indicated by a sliding pill-shaped highlight that moves behind the icon with a spring-bounce animation.
- **Input Fields**: Backgrounds use the base navy (`#0A0F1C`). On focus, the 1px border transitions from 10% white to 100% Primary Blue with a soft outer glow.
- **Indicators**: The "Online" status is a green pulsing dot (`22C55E`) with two concentric expanding rings of diminishing opacity.
- **Icons**: Use Lucide icons. Place them inside 40x40px circles with a 15% opacity background fill matching the icon's semantic color.
- **Cards**: Orders and earnings cards should use a subtle vertical gradient (Top: #111827 to Bottom: #0A0F1C) to ground them into the UI.
- **Skeleton Loaders**: Use a linear shimmer moving from left to right, transitioning from `#111827` to `#1F2937` and back.