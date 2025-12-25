# ZECOHO - Hotel Booking Platform

## Overview
ZECOHO is a ZERO COMMISSION hotel booking platform designed to connect guests directly with hoteliers, eliminating intermediary fees. It aims to pass 100% of savings to customers. The platform supports three user roles (Guests, Property Owners, Admins) and offers property discovery with advanced filtering, wishlist management, a comprehensive booking system, and user preference customization. Key features include a strong emphasis on direct hotelier connections, a zero-commission value proposition, and an extensive database of Indian destinations and properties.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses **React with TypeScript** and **Vite**, with **Wouter** for client-side routing and role-based access. **TanStack Query** manages server state. **Shadcn/ui components** based on Radix UI, styled with **Tailwind CSS**, provide an Airbnb-inspired, image-first, responsive design. **React Hook Form** and **Zod** ensure type-safe form validation.

### Backend
The backend is built with **Express.js on Node.js**, featuring a **RESTful API** with custom middleware for authentication, logging, and error handling.

### Data Storage
**PostgreSQL** (via Neon's serverless driver) is used with **Drizzle ORM** for type-safe queries. The schema includes Users, Properties, Rooms, Amenities, Wishlists, User Preferences, Bookings, Conversations, Messages, Reviews, and Destinations. **Drizzle-Zod** ensures schema consistency, and **Drizzle Kit** manages migrations.

### Authentication and Authorization
**Replit Auth (OpenID Connect)** handles authentication. **Express-session** with `connect-pg-simple` manages server-side sessions using secure, httpOnly cookies. **Passport.js** facilitates the OIDC flow and token refresh. User data from OIDC claims is synchronized, and **role-based access control** is enforced at the route level.

### Key Features
-   **ZERO Commission Model**: Eliminates booking, service, and commission fees.
-   **Dynamic Booking System**: Manages the full booking lifecycle (pending, confirmed, rejected, completed) with server-side validation, pricing calculation, and owner/guest management interfaces. Includes real-time notifications via WebSockets for booking status changes.
-   **Real-time Messaging**: Facilitates direct communication between guests and owners using WebSockets, with conversation management and unread message tracking.
-   **Review System**: Allows guests to review properties post-booking and owners to respond.
-   **Unified KYC & Property Listing**: A multi-step wizard (`/list-property`) for combined personal details, KYC verification, and property information. Features a "Choose Listing Mode" (Quick or Full Application) for flexible onboarding.
-   **Categorized Property Images**: Supports organized image uploads for properties across six categories with captions.
-   **KYC Document Uploads**: Secure handling of five categories of KYC documents with validation and access control.
-   **Extensive Destinations**: Curated database of 65 Indian destinations and 56+ properties, complemented by **Google Maps Places API** for comprehensive city search.
-   **Owner Experience Enhancements**: Includes a welcome modal, role switcher, owner context indicator, KYC email notifications, in-app banners for property status, and controls to manage listing visibility (pause, resume, deactivate).
-   **Availability Override System**: Owners can manage property availability by blocking dates for various reasons (hold, sold_out, maintenance), with options for room count specification and room-type-specific blocking.
-   **Room Type & Meal Plan Management**: Allows owners to define multiple room types with individual base prices, occupancy settings, and total rooms. Supports configurable occupancy-based pricing and various meal options (e.g., Room Only, Breakfast) with price adjustments. The customer UI provides an OTA-style room selection with dynamic price calculations.

## External Dependencies

-   **Third-Party Services**:
    -   Replit Auth (OpenID Connect)
    -   Neon Database (Serverless PostgreSQL)
    -   Google Fonts CDN
    -   Google Maps Places API
-   **NPM Packages**:
    -   `@radix-ui/*`
    -   `@tanstack/react-query`
    -   `wouter`
    -   `drizzle-orm`, `drizzle-zod`
    -   `react-hook-form`, `zod`
    -   `passport`, `openid-client`
    -   `tailwindcss`
    -   `vite`
    -   `express`