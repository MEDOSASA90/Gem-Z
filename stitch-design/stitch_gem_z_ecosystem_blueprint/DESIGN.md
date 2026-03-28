# Design System Strategy: The Kinetic Void

## 1. Overview & Creative North Star
**Creative North Star: "The Kinetic Void"**
This design system moves beyond the "app as a tool" mentality and enters the realm of "app as a high-performance environment." By utilizing a deep, true-black foundation (#000000) and high-octane neon accents, we create a space that feels like a premium, late-night boutique fitness studio.

To break the "template" look, we reject the rigid, centered grid. Instead, we use **Intentional Asymmetry**. Overlapping glass panels, typography that breaks container boundaries, and aggressive scale shifts between massive display headers and tiny, functional labels create a sense of forward motion. We aren't just displaying data; we are visualizing energy.

---

## 2. Colors: High-Voltage Contrast
The color palette is built on a "Total Dark" philosophy. The background is a void, and the UI elements are light sources.

### Core Palette
*   **Background (#000000 / `surface_container_lowest`):** The absolute base. Everything emerges from here.
*   **Primary Accent (`primary_fixed` / #ff7b00):** Our "Orange Pulse." Use this for high-priority calls to action and success states.
*   **Secondary Accent (`secondary` / #cf7502):** Our "Amber Flow." Use this for data visualization, progress tracking, and secondary interactions.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section off content. Boundaries must be defined through:
1.  **Tonal Transitions:** Placing a `surface_container` (lighter grey) card on a `surface` (black) background.
2.  **Negative Space:** Using the Spacing Scale (specifically `8` to `12` increments) to create logical groupings.
3.  **Glow Diffusion:** Using a soft outer glow from an accent color to define a container's edge.

### The "Glass & Gradient" Rule
Floating panels must use **Glassmorphism**. 
*   **Background:** `surface_variant` at 40-60% opacity.
*   **Effect:** `backdrop-filter: blur(20px)`.
*   **Signature Texture:** Use a linear gradient for CTAs transitioning from `primary` (#ff7b00) to `primary_container` (#e3aa07) at a 135-degree angle. This adds a "lithium-ion" metallic depth that flat colors lacks.

---

## 3. Typography: Editorial Performance
We pair **Be Vietnam Pro** (Display/Headlines) with **Inter** (Body/Labels) to create a high-end editorial feel.

*   **The Power Scale:** Use `display-lg` (3.5rem) for workout titles or daily goals. The massive scale against a black void creates an authoritative, premium look.
*   **Bilingual Fluidity:** 
    *   **LTR (English):** Left-aligned headlines with generous tracking (-0.02em) for a modern, compressed look.
    *   **RTL (Arabic):** Ensure line-height is increased by 15-20% for Arabic scripts to maintain legibility in dark mode. The weight of Be Vietnam Pro is mirrored by using the Medium/Bold weights of a compatible Arabic typeface (like Tajawal or IBM Plex Sans Arabic).

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are invisible on a #000000 background. We must use light, not shadow, to create depth.

*   **The Layering Principle:** 
    *   **Base:** `surface` (#0e0e0e)
    *   **Section:** `surface_container_low` (#131313)
    *   **Card:** `surface_container_high` (#1f1f1f)
    *   **Floating/Active:** `surface_container_highest` (#262626) with Glassmorphism.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility on inputs, use `outline_variant` (#484848) at **20% opacity**.
*   **Ambient Glow:** For "elevated" elements, use a `0px 8px 24px` shadow with the color of the accent (Orange or Amber) at **12% opacity**. This simulates the light of a neon sign hitting a dark floor.

---

## 5. Components

### Buttons: High-Energy Triggers
*   **Primary:** Solid `primary_fixed` (#ff7b00) with `on_primary_fixed` (#5f2000) text. On hover/active, add a 15px outer glow of the same color.
*   **Secondary (Glass):** Semi-transparent `secondary_container` with a `backdrop-filter: blur(10px)`.
*   **Interaction:** Every button press should trigger a subtle "pulse" animation where the accent color expands and fades.

### Input Fields: Minimalist
*   **Style:** No background fill. Only a bottom "Ghost Border" (2px) using `outline_variant`. 
*   **Active State:** The bottom border transforms into a gradient of `primary` to `secondary`.

### Cards & Lists: The Separation Strategy
*   **Forbid Dividers:** Never use a horizontal line to separate list items.
*   **The Shift:** Use a background color shift. Item 1: `surface_container_low`; Item 2: `surface_container`; Item 3: `surface_container_low`.
*   **Corner Radius:** All cards must use `md` (1.5rem) or `lg` (2rem) roundedness to contrast with the sharp, modern typography.

### Sticky Bottom Nav: The Command Center
*   **Style:** Full glassmorphism panel (`surface_container_highest` at 70% opacity + blur).
*   **Active Icon:** Use the `secondary` amber glow effect. The icon should appear to be "lit" from within.

### Fitness-Specific Components
*   **Progress Rings:** Use a 4px stroke width. The "void" (unfilled) part of the ring should be `surface_container_highest` at 10% opacity.
*   **Intensity Heatmaps:** Use a gradient ramp from `surface_variant` (low intensity) to `primary` (peak intensity).

---

## 6. Do's and Don'ts

### Do
*   **Do** embrace negative space. If a screen feels "empty," it's likely working.
*   **Do** use extreme contrast. A `display-lg` headline next to a `label-sm` creates an expensive, custom-designed feel.
*   **Do** ensure RTL layouts are not just flipped, but optically balanced. Adjust icons that have a sense of direction (e.g., arrows).

### Don't
*   **Don't** use pure white (#FFFFFF) for long body text. Use `on_surface_variant` (#ababab) to prevent eye strain on the true black background.
*   **Don't** use standard 1px borders or "drop shadows" (black-on-black shadows are useless).
*   **Don't** crowd the glass panels. Let the background "void" breathe through the blurred sections.