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
-   **KYC & Property Listing Feature**: A multi-step wizard for property owners, including personal details, KYC verification (address, government ID), and property information submission, with role promotion and property approval workflows.
-   **Destinations Feature**: Curated 65 Indian destinations across all states with autocomplete search, 56+ properties covering major cities, tourist spots, hill stations, heritage sites, and adventure destinations.

## External Dependencies

-   **Third-Party Services**:
    -   Replit Auth (OpenID Connect provider)
    -   Neon Database (Serverless PostgreSQL)
    -   Google Fonts CDN
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