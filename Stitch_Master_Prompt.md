# Project Blueprint: Gem Z Ecosystem
*This document contains the complete UI/UX and architectural blueprint for the Gem Z platform. Please use this as the absolute source of truth to redesign the entire application.*

## 🎨 1. Vibe & Aesthetic Requirements
* **Theme:** Premium, modern fitness & health ecosystem.
* **Color Palette:** Deep true black backgrounds (Dark Mode), electric/neon accent colors (e.g., lime green, energetic cyan) to signify energy and movement.
* **Shapes & Style:** Sleek glassmorphism for panels (semi-transparent blurred backgrounds). Rounded corners for a friendly yet athletic feel.
* **Typography:** Bold, modern sans-serif fonts (e.g., Inter, Roboto, or Outfit) for headings. Highly readable body text.
* **Micro-interactions:** Hover glowing effects on buttons. Smooth skeleton loaders. Dynamic page transitions.

## 🧱 2. Global Layout & Navigation
* **Top Navigation Bar (Navbar):**
  * Left: "Gem Z" Logo.
  * Center: Main Links (Features, Shop, Leaderboards).
  * Right: Notifications Bell, User Profile avatar with dropdown menu, Wallet Balance (Coins indicator), and Settings icon.
* **Sidebar (For Dashboards):**
  * Responsive collapsible sidebar with active-state highlights.
  * Adjusts items based on the user's role (Admin, Trainee, Trainer, Gym, Store).
* **Mobile Viewport:**
  * Must feature a sticky Bottom Navigation Bar for the 4 core tabs (Home, Workouts, Social, Profile) instead of a top navbar for better reachability.

## 📄 3. Page-by-Page Feature Breakdown
*Do not omit any of the buttons, inputs, or sections listed below.*

### 🔐 Authentication & Onboarding
* `app/page.tsx` **(Landing Page):**
  * Hero Section: Big catchy title, "Join the Revolution" CTA button, dynamic video or 3D character background.
  * Sections: Features Grid, Testimonials Carousel.
  * Footer: Links to Terms, Privacy, and Social media.
* `app/login/page.tsx`:
  * Inputs: Email, Password.
  * Buttons: "Sign In", "Continue with Google".
  * Links: "Forgot Password?", "Create new account".
* `app/register/page.tsx` & sub-pages (`/gym`, `/store`, `/trainee`, `/trainer`):
  * A role-selection screen (Cards for choosing user type).
  * Multi-step wizard form capturing specific details (e.g., Gym requires location and CR number).

### 👥 User Dashboards (Role-Based)
* `app/trainee/page.tsx` **(Trainee Home):**
  * Circular progress rings for Calories, Water, and Steps.
  * "Start Daily Workout" large action button.
  * "My Gym Passes" link/button (routes to `/trainee/passes`).
* `app/trainer/page.tsx` **(Trainer Home):**
  * Stats cards: Active Clients, Monthly Revenue.
  * Upcoming Live Sessions list.
  * "Generate AI Workout" button (routes to `/trainer/ai-generator`).
* `app/gym/page.tsx` **(Gym Owner Home):**
  * Revenue and Subscription charts.
  * "Launch QR Scanner" button (routes to `/gym/scanner`).
* `app/store/dashboard/page.tsx` **(Store Owner Dashboard):**
  * Inventory table with images, stock level, and price.
  * "Add New Product" button. Sales analytics graph.
* `app/admin/page.tsx` **(Super Admin Panel):**
  * High-level system metrics (Total Users, Earnings, Active Gyms).
  * Data tables for managing users and resolving tickets.

### 🤖 Core Fitness & AI Modules
* `app/ai-coach/page.tsx`:
  * Chat UI: Message history, a text input field at the bottom, and a "Send" icon.
* `app/ai-form/page.tsx`:
  * UI for video upload (Drag & Drop zone) or Camera Access.
  * "Analyze Form" button.
  * Result screen showing skeleton tracking over the video.
* `app/ai-nutritionist/page.tsx`:
  * Form inputs: Current weight, target weight, allergies.
  * "Generate Meal Plan" CTA.
  * Output display: Daily macros (Protein, Carbs, Fats) and a list of meals.
* `app/exercises/page.tsx`:
  * Search bar and Filter drops (Muscle group, Equipment type).
  * Grid of Exercise Cards.
* `app/progress/page.tsx`:
  * Line chart for weight/PR tracking.
  * "Upload Progress Photo" button.

### 🛒 E-Commerce & Gamification
* `app/shop/page.tsx` & `app/store/page.tsx`:
  * Product grid. Each product card has Image, Name, Price, and "Add to Cart" button.
  * Cart Sidebar slider with "Checkout" button.
* `app/flash-deals/page.tsx`:
  * Countdown timers on items. "Buy Now Before It Ends" styling.
* `app/bidding/page.tsx` **(Auctions):**
  * Current Highest Bid text, "Place Bid" input field, Time left ticker.
* `app/wallet/page.tsx` & `app/coins/page.tsx`:
  * Large display of available Gem Z Coins.
  * "Top Up Balance" and "Withdraw" buttons.
  * Recent transaction history list.
* `app/challenges/page.tsx`:
  * "Join Challenge" button. Leaderboard list showing user ranks.

### 🌐 Social & Community
* `app/social/page.tsx`:
  * News feed layout similar to Twitter/Instagram. "Create Post" box.
  * Like, Comment, Share buttons on each post.
* `app/chat/page.tsx`:
  * Left sidebar: list of recent chats.
  * Right panel: active conversation, message input, attachment icon.
* `app/squads/page.tsx`:
  * List of user's groups. "Create New Squad" button. Group member avatars.

### 📍 Integrations
* `app/gym-map/page.tsx`:
  * Interactive map filling the screen.
  * Floating search/filter box. Map markers. Clicking a marker opens a Gym Details bottom sheet with a "Buy Pass" button.
* `app/live/page.tsx`:
  * Main video player taking up most space.
  * Right sidebar: Live chat stream.
  * Overlay button: "Send Gift / Donate Coins".

## 🔔 4. Core Modals & Overlays
* **Confirm Purchase Modal:** Shows total coins/price, "Confirm" and "Cancel" buttons.
* **Success/Error Toasts:** Small popups at the top/bottom corner indicating action results.
* **Edit Profile Sheet:** Slide-out from right to update avatar and bio.

**FINAL INSTRUCTION TO STITCH AI:** 
Please redesign all the mockups for this platform exactly as structured above. Every page, sub-page, button, and input mentioned is critical and must be present in the new design. Use your AI capabilities to make the Layouts, UI, and UX modern, premium, and unified under the described Dark Mode fitness aesthetic.
