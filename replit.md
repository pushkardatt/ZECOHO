# ZECOHO - Hotel Booking Platform

## Overview

ZECOHO ("Your Journey, Our Passion") is a ZERO COMMISSION hotel booking platform that enables guests to connect directly with hoteliers — eliminating the middleman entirely. Unlike traditional platforms that charge 15-25% commission, ZECOHO charges ZERO fees, passing 100% of the savings to customers. The platform features three user roles (Guests, Property Owners, Admins), property discovery with advanced filtering, wishlist management, booking system, and user preference customization. Recent updates include a complete landing page overhaul emphasizing direct hotelier connections and zero-commission value proposition, comprehensive Indian destinations database (65 destinations), and 56+ properties across India.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend uses **React with TypeScript** and **Vite**. **Wouter** handles client-side routing, supporting role-based access. **TanStack Query** manages server state, providing caching and optimistic updates. **Shadcn/ui components** built on Radix UI provide an accessible and customizable UI, following a "New York" style with a neutral color scheme and **Tailwind CSS** for styling. The design is Airbnb-inspired, focusing on image-first layouts, responsiveness, and clear calls-to-action. **React Hook Form** with **Zod** ensures type-safe form validation.

### Backend Architecture

The backend is built with **Express.js on Node.js**. It features separate entry points for development (with Vite middleware for HMR) and production (static file serving). It implements a **RESTful API** structure, with custom middleware for authentication, request logging, and centralized error handling.

### Data Storage Solutions

The application uses **PostgreSQL** via Neon's serverless driver. **Drizzle ORM** provides type-safe database queries. The schema includes tables for Users (with role-based access), Properties, Rooms, Amenities (many-to-many), Wishlists, User Preferences, Bookings, Conversations, Messages, Reviews, and Destinations. **Drizzle-Zod** ensures consistent schema validation between client and server. **Drizzle Kit** manages database migrations.

### Authentication and Authorization

**Replit Auth (OpenID Connect)** is used for authentication. **Express-session** with `connect-pg-simple` manages server-side sessions, using secure, httpOnly cookies. **Passport.js** handles the OIDC flow, including token refresh. User data from OIDC claims is synchronized with the local users table. **Role-based access control** (guest/owner) is enforced at the route level.

### System Features

-   **ZERO Commission Model**: Platform's core differentiator — no booking fees, service fees, or commission charges for customers.
-   **Landing Page Value Proposition**: Prominent ZERO commission messaging, savings calculator showing 15-20% cost comparison vs competitors, trust indicators, and transparent pricing guarantees.
-   **Property Amenities System**: CRUD operations for amenities with many-to-many property relationships.
-   **Booking System**: Comprehensive booking table, server-side validation (no self-booking, overlap detection), pricing calculation, and a frontend booking form.
-   **Messaging System**: Real-time communication via WebSockets, conversation management, and unread message tracking.
-   **Review System**: Allows guests to submit reviews for completed bookings, owners to respond, and users to mark reviews as helpful.
-   **KYC & Property Listing Feature**: A unified multi-step wizard (`/list-property`) for all users, combining personal details, KYC verification, and property information in one flow. All "List Your Property" entry points (header button, home page banners) use the same wizard. No separate "Add Property" option exists - only the unified wizard flow.
-   **KYC Rejection Flow**: When a property owner's KYC is rejected, they are redirected to `/owner/kyc` which displays rejection reasons by section, document verification status (approved/rejected), and re-upload CTA. Rejected owners have limited menu access (KYC Review, My Property, Support) and cannot access features like Messages until reapproved. The Messages page shows appropriate blocking notices for rejected/pending users.
-   **Categorized Property Images**: Properties support categorized image uploads with 6 categories (Exterior, Reception, Rooms, Bathrooms, Amenities, Food & Dining). Each category includes helpful photography tips and supports captions. Images are stored as JSONB in the `categorizedImages` column. The `PropertyImageUploader` component provides a tabbed interface for organized uploads.
-   **KYC Document Uploads**: KYC applications support 5 document categories: Property Ownership Proof, Owner Identity Proof, Business License, NOC, and Safety Certificates with proper validation. Documents are stored using permanent access paths (`/objects/uploads/{uuid}`) instead of temporary signed URLs. ACL policies are automatically set on uploaded documents with HMAC-signed tokens (1-hour expiry) that tie uploads to specific users, preventing unauthorized ownership claims. Document owners can access their files, and admins can access all documents for KYC verification purposes.
-   **Destinations Feature**: Curated 65 Indian destinations across all states with autocomplete search, 56+ properties covering major cities, tourist spots, hill stations, heritage sites, and adventure destinations.
-   **Google Places City Search**: Comprehensive Indian city search powered by Google Maps Places API. The CitySearchInput component uses Places Autocomplete with types: ["(cities)"] and India restriction, enabling search for any Indian city including small towns like Dharchulla and Munsiyari. Home page SearchBar combines database destinations with Google Places results for complete coverage. City selection auto-populates state (administrative_area_level_1) and district (administrative_area_level_2) fields.
-   **Choose Listing Mode Feature**: New users who want to list properties can choose between Quick Listing (fast onboarding with minimal info) or Full Application (complete KYC verification). Quick Listing creates draft properties with limited visibility and inquiry-only mode. Users can upgrade to full listing anytime. Routes: `/owner/choose-mode` for mode selection, `/list-property?mode=quick` for quick listing wizard. The `listingMode` field on users tracks their choice (not_selected, quick, full). Quick listing owners see an upgrade CTA banner in their dashboard.
-   **Owner UX Improvements**: 
    - First-time owner welcome modal: Shows once when owner first accesses owner dashboard, tracked via `hasSeenOwnerModal` field on users.
    - Role switcher: Dropdown in header for switching between Customer Mode and Owner Mode.
    - Owner context indicator: Orange "Owner Mode" badge in header when on owner pages.
    - KYC email notifications: Automated emails via Resend for KYC submitted, approved, and rejected events.
    - In-app notification banners: Owner dashboard shows contextual banners for property live (green), paused (amber), and draft (blue with resume CTA) states.
    - Property controls: Owners can pause, resume, or deactivate listings via dropdown menu on each property card. Property status enum includes "paused" and "deactivated" values.
    - API endpoints: PATCH /api/properties/:id/pause, /resume, /deactivate for managing property visibility.

## External Dependencies

-   **Third-Party Services**:
    -   Replit Auth (OpenID Connect provider)
    -   Neon Database (Serverless PostgreSQL)
    -   Google Fonts CDN
    -   Google Maps Places API (city search and autocomplete)
-   **NPM Packages**:
    -   `@radix-ui/*` (UI primitives)
    -   `@tanstack/react-query` (Server state management)
    -   `wouter` (Client-side routing)
    -   `drizzle-orm`, `drizzle-zod` (ORM and schema validation)
    -   `react-hook-form`, `zod` (Form handling and validation)
    -   `passport`, `openid-client` (Authentication)
    -   `tailwindcss` (CSS framework)
    -   `vite` (Build tool)
    -   `express` (Web framework)
-   **Replit Integration**:
    -   `@replit/vite-plugin-runtime-error-modal`
    -   `@replit/vite-plugin-cartographer`
    -   `@replit/vite-plugin-dev-banner`