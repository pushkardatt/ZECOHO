# StayScape - Hotel Booking Platform

## Overview

StayScape is a two-sided marketplace application for accommodation bookings, inspired by Airbnb's design language. The platform connects guests seeking unique stays with property owners/hoteliers who list and manage their accommodations. The application serves three user roles: Guests (who discover and book properties), Property Owners (who list and manage their properties), and Admins (who oversee platform operations).

The platform supports various property types including hotels, villas, hostels, lodges, resorts, apartments, cabins, and cottages. Key features include property discovery with advanced filtering, wishlist management, owner property management dashboard, booking system with availability tracking, and user preference customization.

## Recent Updates (November 22, 2025)

### Completed Features

**Property Amenities System** ✅
- Created amenities table with many-to-many relationship to properties
- Implemented complete CRUD operations in storage layer
- Seeded database with 20+ amenities (Wifi, Kitchen, Pool, AC, Parking, etc.)
- Integrated amenity selection into property creation/edit forms
- Updated PropertyCard and PropertyDetails to display amenities

**Booking System** ✅
- Created bookings table schema with comprehensive fields (propertyId, guestId, checkIn/Out, totalPrice, guests, status)
- Implemented server-side booking validation (guest-only, no self-booking, overlap detection)
- Built date overlap prevention using Drizzle SQL queries
- Added server-side pricing calculation
- Created frontend booking form with date pickers and guest selector
- Bookings can be created successfully with proper validation

**Messaging System** ✅
- Created conversations and messages tables with proper indexing
- Implemented WebSocket server for real-time message delivery
- Built REST API endpoints (GET /api/conversations, POST /api/messages/:conversationId/messages)
- Added conversation list with sidebar navigation
- Created chat interface with message bubbles and real-time updates
- Implemented unread message tracking with header badge
- Added "Contact Owner" button on property details page
- Fixed critical unread count bug: invalidate conversations query when viewing chat
- Optimized queries with single-query unread count calculation

**Review System** ✅
- Created reviews table schema (rating, comment, helpful count, owner response)
- Implemented POST /api/reviews with booking validation (completed bookings only)
- Added GET /api/properties/:id/reviews with guest data joins
- Built PATCH /api/reviews/:id/response for owner responses
- Created review submission form with RadioGroup rating widget (1-5 stars)
- Fixed rating type coercion: z.coerce.number() for RadioGroup compatibility
- Implemented multi-booking support: auto-selects most recent unreviewed booking
- Added reviews display on property details page
- Built owner response interface with dialog
- Implemented helpful voting with localStorage persistence (user-scoped)
- Added PATCH /api/reviews/:id/helpful endpoint with atomic increment
- E2E tested: review submission, rating persistence, helpful voting

**Seed Data with Images** ✅
- Populated database with 12 properties across global destinations (Paris, Tokyo, NYC, Bali, Barcelona, Malibu, Brooklyn, Cape Town, Iceland, Dubai, Kyoto, Switzerland)
- Fixed critical schema bug: Updated from single `imageUrl` to `images` array
- All properties include Unsplash images, assigned amenities, and pricing ($85-$450/night)
- Created 5 test users (3 owners, 2 guests)
- Added 5 wishlist entries
- Created 3 sample bookings with various statuses
- All properties display correctly with images in the UI

**Routing Improvements**
- Added `/properties` route for intuitive URL structure (in addition to `/search`)
- Enabled unauthenticated browsing of property listings and details
- Authentication required only for bookings and wishlists

**Currency Conversion to INR** ✅
- Converted all pricing from USD to INR for Indian market launch
- Updated seed data: multiplied all property prices by 89 (USD to INR conversion rate)
- Modified all UI components to display ₹ symbol instead of $ throughout the application
- Applied Indian number formatting (toLocaleString('en-IN')) for proper comma placement
- Updated property price ranges from $0-$1000 to ₹0-₹89,000 in search filters
- Modified form labels: "Price per night (USD)" → "Price per night (INR)"
- Updated user preferences budget fields to show INR instead of USD
- Sample converted prices: $185/night → ₹16,465/night, $450/night → ₹40,050/night
- Booking calculations correctly use INR values without additional conversion
- Files modified: seed-data.ts, PropertyCard.tsx, property-details.tsx, add-property.tsx, owner-properties.tsx, search.tsx, profile.tsx

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, utilizing Vite as the build tool and development server.

**Routing**: Client-side routing implemented with Wouter, a lightweight alternative to React Router. The application uses a role-based routing strategy where unauthenticated users see a landing page, while authenticated users access role-specific views.

**State Management**: TanStack Query (React Query) handles server state management, providing caching, background refetching, and optimistic updates. The query client is configured with infinite stale time and disabled automatic refetching to give developers explicit control over data freshness.

**UI Component Library**: Shadcn/ui components built on Radix UI primitives, providing accessible, customizable components. The design system follows the "New York" style variant with a neutral base color scheme and CSS variables for theming.

**Styling**: Tailwind CSS with custom design tokens extending the base configuration. The design follows an Airbnb-inspired visual language emphasizing image-first layouts, spatial generosity, and clear call-to-actions. Typography uses Inter font family with a systematic hierarchy from hero headlines (text-5xl/6xl) down to captions (text-sm).

**Form Handling**: React Hook Form with Zod schema validation via @hookform/resolvers, ensuring type-safe form validation that matches backend schemas.

**Design Principles**: 
- Image-first approach with 4:3 aspect ratio property cards
- Responsive grid layouts (1 column mobile → 4 columns on xl screens)
- Elevation system using hover and active states for interactive elements
- Consistent spacing using Tailwind's spacing primitives (2, 4, 6, 8, 12, 16, 20, 24)

### Backend Architecture

**Server Framework**: Express.js running on Node.js, structured with separate entry points for development (`index-dev.ts`) and production (`index-prod.ts`).

**Development Setup**: Development mode integrates Vite middleware for hot module replacement, serving the client application with live reloading. The server intercepts all non-API routes and serves the dynamically transformed HTML template.

**Production Setup**: Static file serving from a pre-built dist/public directory, with fallback to index.html for client-side routing support.

**API Design**: RESTful API structure with route prefixing (/api/*). The routing layer separates authentication routes from resource routes (properties, wishlists, user preferences, rooms).

**Authentication Middleware**: Custom middleware (`isAuthenticated`) protects routes requiring user authentication, integrated with the session management system.

**Request Logging**: Custom middleware logs all API requests with timestamps, paths, methods, status codes, and response times for debugging and monitoring.

**Error Handling**: Centralized error handling with specific checks for unauthorized errors, automatically triggering re-authentication flows on the client.

### Data Storage Solutions

**Database**: PostgreSQL accessed via Neon's serverless driver, enabling connection pooling and WebSocket-based communication for serverless environments.

**ORM**: Drizzle ORM provides type-safe database queries with automatic TypeScript inference from schema definitions. The schema uses PostgreSQL-specific features like enums, JSONB columns, and composite indexes.

**Schema Design**:
- Users table with role-based access (guest/owner) and Replit Auth integration fields
- Properties table with comprehensive fields (type, location, pricing, amenities, status)
- Rooms table for multi-room properties with per-room pricing and capacity
- Amenities lookup table with many-to-many relationship to properties
- Wishlists for guest-saved properties
- User preferences for personalization
- Sessions table for server-side session storage

**Schema Validation**: Drizzle-Zod generates Zod schemas from database schemas, ensuring consistent validation between client and server while maintaining a single source of truth.

**Migration Strategy**: Drizzle Kit manages schema migrations with a dedicated migrations directory, using push-based deployments for development.

### Authentication and Authorization

**Authentication Provider**: Replit Auth via OpenID Connect (OIDC), providing seamless authentication for Replit-deployed applications.

**Session Management**: Express-session with PostgreSQL session store (connect-pg-simple), persisting sessions server-side with a 7-day TTL. Sessions include secure, httpOnly cookies for production security.

**OAuth Flow**: Passport.js Strategy pattern implements the OIDC authentication flow, handling token exchange, refresh, and claim validation.

**User Data Synchronization**: On successful authentication, user claims from OIDC are upserted to the local users table, maintaining a local copy of user data for application queries.

**Token Refresh**: Automatic token refresh mechanism updates access tokens before expiration, maintaining seamless user sessions.

**Authorization**: Role-based access control using the userRole enum (guest/owner), with route-level checks enforcing permission boundaries.

### External Dependencies

**Third-Party Services**:
- Replit Auth (OpenID Connect provider) - User authentication and identity management
- Neon Database - Serverless PostgreSQL hosting with WebSocket support
- Google Fonts CDN - Inter font family delivery

**NPM Packages**:
- @radix-ui/* - Accessible UI primitives (accordion, dialog, dropdown, select, etc.)
- @tanstack/react-query - Server state management and caching
- wouter - Lightweight client-side routing
- drizzle-orm - Type-safe ORM for PostgreSQL
- drizzle-zod - Schema validation bridge
- react-hook-form - Performant form state management
- zod - Runtime type validation
- passport - Authentication middleware
- openid-client - OIDC client implementation
- tailwindcss - Utility-first CSS framework
- vite - Build tool and dev server
- express - Web application framework

**Replit Integration**:
- @replit/vite-plugin-runtime-error-modal - Development error overlay
- @replit/vite-plugin-cartographer - Development tooling
- @replit/vite-plugin-dev-banner - Development environment indicators

**Development Tools**:
- TypeScript - Type safety across the entire stack
- ESBuild - Production bundling for server code
- PostCSS with Autoprefixer - CSS processing
- TSX - TypeScript execution for development server