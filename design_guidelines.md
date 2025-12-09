# Hotel Booking Platform - Design Guidelines

## Design Approach
**Reference-Based: Swiggy-Inspired Modern Design**

Drawing from Swiggy's clean, modern design language with bold orange branding, emphasizing trust, visual clarity, and seamless discovery. The design uses a single strong brand color with warm, friendly typography.

## Core Design Principles
1. **Clean & Minimal**: Uncluttered interfaces with generous whitespace
2. **Bold Branding**: Single strong primary color (orange) used consistently
3. **Warm Typography**: Poppins font family for friendly, approachable feel
4. **Image-First**: Properties sell through visuals - large, high-quality imagery dominates
5. **Clear CTAs**: Obvious next steps with contrasting primary buttons

## Color System

**Primary Brand Color**: Swiggy Orange (#FC8019)
- HSL: 27° 97% 54%
- Used for: Primary buttons, CTAs, brand accents, logo elements

**Supporting Colors**:
- Background: Clean white (#FFFFFF)
- Foreground: Warm dark gray (40° 5% 15%)
- Secondary: Warm neutral gray (30° 10% 92%)
- Muted: Light warm gray (30° 10% 95%)
- Destructive: Red for errors (0° 84% 60%)

**Dark Mode**:
- Background: Dark warm gray (30° 5% 8%)
- Card: Elevated dark (30° 5% 11%)
- Primary remains orange for consistency

## Typography

**Font Stack**: 
- Primary: 'Poppins' (Google Fonts)
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold), 800 (Extra Bold)
- Fallback: -apple-system, system-ui, sans-serif

**Hierarchy**:
- Hero Headlines: text-5xl to text-6xl, font-bold
- Section Titles: text-3xl to text-4xl, font-semibold
- Card Titles: text-lg, font-semibold
- Body Text: text-base, font-normal
- Captions/Meta: text-sm, text-muted-foreground

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-24
- Card gaps: gap-4 to gap-6
- Container max-width: max-w-7xl

**Grid Structure**:
- Property Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
- Filter Sidebar: Sticky left column (w-80) + flexible content area
- Owner Dashboard: grid-cols-1 lg:grid-cols-3 for KPI cards

## Component Library

### Navigation (Header)
- Fixed top navigation with subtle shadow on scroll
- Logo: Solid bg-primary icon with bold "ZECOHO" text
- Logo ".com" suffix in text-primary color
- Clean, minimal navigation buttons
- Primary CTA: "List Your Property FREE" using bg-primary with token-derived shadow
- User menu: Clean avatar dropdown

### Property Cards
- Aspect ratio 4:3 image with rounded-xl corners
- Wishlist heart icon (top-right, absolute positioned)
- Property title + location in single line
- Price emphasized (font-semibold, larger size)
- Rating stars + review count in small text
- Hover: subtle scale transform with shadow increase

### Search & Filters
- Prominent search bar with rounded-full styling
- Destination | Check-in | Check-out | Guests as distinct segments
- Filter pills (rounded-full badges) showing active filters
- Expandable filter panel with categorized sections
- Range sliders for price with clear min/max labels

### Buttons
- Primary CTA: bg-primary (orange), text-white, rounded-lg, font-semibold
- Secondary: Border only, same sizing
- Ghost: Transparent with hover state
- When over images: backdrop-blur-md with semi-transparent background

### Forms
- Generous padding (p-4) in input fields
- Rounded-lg borders
- Label above input, helper text below
- Focus states with orange ring
- Multi-step wizards with progress indicators

## Brand Elements

### Logo
- Icon: Rounded square with solid bg-primary background
- "Z" letter in white, bold
- Shadow: Token-derived using hsl(var(--primary) / 0.2) for subtle glow
- Text: "ZECOHO" in bold foreground, ".com" in text-primary

### Call-to-Action Styling
- Primary buttons use solid bg-primary (Swiggy orange)
- Shadow: Token-derived using hsl(var(--primary) / 0.25) for depth
- Font: font-semibold for emphasis

## Images

**Hero Sections**:
- Home page: Large aspirational hero showing beautiful property/destination
- Dark wash gradient over images for text readability
- Property details: Image gallery grid showcasing room/property photos

**Throughout Application**:
- Property thumbnails: Consistent 4:3 aspect ratio
- Host profile photos: Circular, with subtle border
- Amenity icons: Use Lucide React icons (outline style)

## Responsive Behavior
- Mobile-first approach
- Stack multi-column layouts on mobile
- Collapsible filters into modal on mobile
- Touch-friendly tap targets (min 44px)

## Accessibility
- Consistent focus indicators (ring-2 ring-offset-2 ring-primary)
- ARIA labels on all interactive elements
- Keyboard navigation support
- Color contrast ratio minimum 4.5:1

This design creates a trustworthy, visually appealing marketplace with Swiggy's warm, friendly aesthetic - emphasizing the zero-commission value proposition through clean, modern design.
