# ZECOHO - Hotel Booking Platform

## Overview

ZECOHO is a two-sided marketplace application for accommodation bookings, inspired by Airbnb. It connects guests with property owners/hoteliers, supporting various property types like hotels, villas, and apartments. The platform caters to three user roles: Guests, Property Owners, and Admins. Key capabilities include property discovery with advanced filtering, wishlist management, owner property management, a booking system with availability tracking, and user preference customization. The project aims to capture market potential by offering a robust and intuitive booking experience, with recent updates focusing on an Indian market launch (INR currency conversion) and a "Discover India" destinations feature.

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

-   **Property Amenities System**: CRUD operations for amenities with many-to-many property relationships.
-   **Booking System**: Comprehensive booking table, server-side validation (no self-booking, overlap detection), pricing calculation, and a frontend booking form.
-   **Messaging System**: Real-time communication via WebSockets, conversation management, and unread message tracking.
-   **Review System**: Allows guests to submit reviews for completed bookings, owners to respond, and users to mark reviews as helpful.
-   **KYC & Property Listing Feature**: A multi-step wizard for property owners, including personal details, KYC verification (address, government ID), and property information submission, with role promotion and property approval workflows.
-   **Destinations Feature**: Curated destinations (e.g., "Discover India") with dedicated browsing pages, search functionality, and integration with property listings.

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