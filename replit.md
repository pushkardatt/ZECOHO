# ZECOHO - Hotel Booking Platform

## Overview
ZECOHO is a zero-commission hotel booking platform connecting guests directly with hoteliers, aiming to pass 100% of savings to customers. It supports Guests, Property Owners, and Admins, offering property discovery with advanced filtering, wishlist management, and a comprehensive booking system. The platform emphasizes direct hotelier connections, a zero-commission model, and an extensive database of Indian destinations. It focuses on disrupting the traditional online travel agency model by eliminating intermediary fees and fostering direct relationships between properties and guests.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is built with React, TypeScript, and Vite, using Wouter for routing and TanStack Query for server state management. UI components are derived from Shadcn/ui (Radix UI) and styled with Tailwind CSS, featuring an Airbnb-inspired, image-first, responsive design. React Hook Form and Zod ensure type-safe form validation.

### Backend
The backend utilizes Express.js on Node.js, providing a RESTful API with custom middleware for authentication, logging, and error handling.

### Data Storage
PostgreSQL (via Neon's serverless driver) and Drizzle ORM manage data, ensuring type-safe queries. The schema includes entities for Users, Properties, Rooms, Amenities, Wishlists, User Preferences, Bookings, Conversations, Messages, Reviews, and Destinations. Drizzle-Zod ensures schema consistency, and Drizzle Kit manages migrations.

### Authentication and Authorization
Authentication is handled by Replit Auth (OpenID Connect). Express-session with `connect-pg-simple` manages server-side sessions. Passport.js facilitates the OIDC flow, and role-based access control is enforced at the route level.

### Key Features
-   **ZERO Commission Model**: Eliminates all booking and service fees.
-   **Dynamic Booking System**: Manages the full booking lifecycle, including server-side validation, pricing, and owner/guest interfaces, with real-time notifications via WebSockets.
-   **Real-time Messaging**: Direct guest-owner communication using WebSockets, including conversation and unread message tracking.
-   **Review System**: Allows guests to rate properties post-checkout with category ratings and comments, and owners can respond.
-   **Unified KYC & Property Listing**: A multi-step wizard for combined personal details, KYC, and property information, offering quick or full application modes.
-   **Categorized Property Images**: Organized image uploads for properties across categories with captions.
-   **KYC Document Uploads**: Secure handling and validation of KYC documents.
-   **Extensive Destinations**: Database of Indian destinations, enhanced by Google Maps Places API for city search.
-   **Owner Experience Enhancements**: Features like welcome modals, role switcher, KYC notifications, in-app banners, and listing visibility controls.
-   **Admin-Approved Property Deactivation**: Owners request property deactivation/deletion, which admins review and approve/reject.
-   **Room Utilization Dashboard**: Displays room availability and occupancy breakdown for owners.
-   **Mandatory Geotagging**: Requires GPS coordinates for properties, with an interactive map picker, address search, and reverse geocoding via Google Maps Geocoding API.
-   **Availability Override System**: Owners can block dates for rooms with specified reasons.
-   **Room Type & Meal Plan Management**: Defines room types, occupancy-based pricing, and meal options with per-person pricing.
-   **Booking Email Deep-Linking**: CTA links in booking emails highlight specific bookings on the 'My Bookings' page.
-   **Guest Policy Attributes**: Properties can define and filter by Couple Friendly, Local ID Allowed, Foreign Guests Allowed, and Hourly Booking options.
-   **Hidden Property IDs**: Internal property identifiers are hidden from customer-facing views.
-   **How to Reach Section**: Property details display nearest transport hubs with distance and "Get Directions" CTAs via Google Maps.
-   **Versioned Policy Management**: Admin system for Terms & Conditions and Privacy Policy with draft/publish/archive workflows, version tracking, and forced re-acceptance upon updates.
-   **Comprehensive Contact Us Page**: Admin-editable contact information for various support types, including grievance redressal and registered office details.
-   **Property Owner Agreement System**: Admin system for managing owner agreements with versioning and mandatory acceptance for accessing owner functionalities.
-   **Guest Cancellation Flow**: Implements owner-defined cancellation policies (flexible/moderate/strict) with automated refund calculations and a refund preview API.
-   **Comprehensive Admin Control System**: Admin dashboard with sections for Booking Management (cancel, no-show, check-in/out), Owner Compliance (suspend/reinstate owners), Inventory Health (monitor/fix room availability), and Support Inbox (manage customer conversations), all with audit logging.
-   **AI Chat Support System**: Rule-based FAQ chatbot for logged-in users, featuring a knowledge base, quick actions, auto-escalation to human support, and conversation management.

## External Dependencies

-   **Third-Party Services**:
    -   Replit Auth (OpenID Connect)
    -   Neon Database (Serverless PostgreSQL)
    -   Google Maps Places API
-   **NPM Packages**:
    -   @radix-ui/*
    -   @tanstack/react-query
    -   wouter
    -   drizzle-orm, drizzle-zod
    -   react-hook-form, zod
    -   passport, openid-client
    -   tailwindcss
    -   vite
    -   express