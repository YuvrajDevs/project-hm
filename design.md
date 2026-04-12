# Honest Mailbox Design System

## Core Identity
A private, intentional space for emotional repair and connection. The design should feel like a "love letter in a digital age"—premium, soft, yet high-contrast.

## Typography
- **Headings**: `Bebas Neue`
  - All caps, tracking `0.1em` to `0.2em`.
  - Used for titles, buttons, and "shouted" declarations of love/need.
- **Body**: `Outfit`
  - Lightweight (300/400) for content.
  - Tracking `0.02em`.
  - Used for notes, descriptions, and metadata.

## Color Palette
- **Background**: `#0f0f0f` (Deep Charcoal/Black)
- **Primary Accent (HER)**: `#e06c9f` (Soft Pink)
- **Secondary Accent (YOU)**: `#7aa2f7` (Soft Blue)
- **Alerts/Needs**: `#e0af68` (Soft Yellow)
- **Surface**: Glassmorphism (White/Black with low opacity + backdrop-blur)

## UI Components
- **Glass Cards**: 
  - `bg-white/5` or `bg-black/20`
  - `backdrop-blur-xl`
  - `border-white/10`
  - `rounded-3xl`
- **Buttons**:
  - Main Actions: Large, `rounded-2xl`, Bebas Neue font.
  - Minimal Actions: Ghost buttons with tracking.
- **Inputs**: 
  - Understated, mono-variants for keys/codes.

## Motion & Aural
- **Animations**: Soft `framer-motion` transitions (spring: `{ damping: 20, stiffness: 100 }`).
- **Layouts**: Mobile-first, centered, high-focus (one primary task per screen).
