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
-   **Review System**: Guests receive a review request email after check-out. They can rate properties (1-5 stars) with optional category ratings (cleanliness, staff, location, value) and comments. Owners can respond to reviews. The system prevents duplicate reviews per booking and only allows reviews for completed stays. Review page accessible via `/property/:propertyId/review?bookingId=:id`.
-   **Unified KYC & Property Listing**: A multi-step wizard (`/list-property`) for combined personal details, KYC verification, and property information. Features a "Choose Listing Mode" (Quick or Full Application) for flexible onboarding.
-   **Categorized Property Images**: Supports organized image uploads for properties across six categories with captions.
-   **KYC Document Uploads**: Secure handling of five categories of KYC documents with validation and access control.
-   **Extensive Destinations**: Curated database of 65 Indian destinations and 56+ properties, complemented by **Google Maps Places API** for comprehensive city search.
-   **Owner Experience Enhancements**: Includes a welcome modal, role switcher, owner context indicator, KYC email notifications, in-app banners for property status, and controls to manage listing visibility (pause, resume).
-   **Admin-Approved Property Deactivation**: Owners cannot directly deactivate or delete their properties. Instead, they must submit a deactivation request with a reason (minimum 10 characters). The request can be for either deactivation (keeping property data) or deletion (permanent removal). Admins review pending requests in the admin portal's "Deactivation Requests" tab and can approve (triggering automatic property deactivation/deletion) or reject (with required reason). Owners can view their pending request status and cancel requests before admin action.
-   **Room Utilization Dashboard**: The owner dashboard displays room utilization by room type with aggregate booked/pending/available counts for the next 30 days. Each room type row is expandable to reveal date-wise availability breakdown showing daily occupancy status (Booked, Pending, Available) with visual indicators for full, partial, or open days.
-   **Mandatory Geotagging with Reverse Geocoding**: Properties require GPS coordinates (latitude/longitude) before they can be published. The Owner Portal includes a Location tab with an interactive map picker featuring address search with autocomplete, drag-and-drop pin placement, and reverse geocoding with automatic address field population. When a location is set via GPS, map click, or search, the system extracts and auto-fills street address, locality, city, district, state, pincode, and country from Google Maps Geocoding API. Features 300ms debouncing and caching to prevent duplicate API calls, plus real-time loading indicators. Properties without location data display warning badges and cannot be approved or resumed until coordinates are set.
-   **Availability Override System**: Owners can manage property availability by blocking dates for various reasons (hold, sold_out, maintenance), with options for room count specification and room-type-specific blocking.
-   **Room Type & Meal Plan Management**: Allows owners to define multiple room types with individual base prices, occupancy settings, and total rooms. Supports configurable occupancy-based pricing and various meal options (e.g., Room Only, Breakfast) with price adjustments. **Meal pricing is per-person per-night**: owners set prices per guest, and the platform calculates total meal cost as (meal price × number of guests × nights). All UI labels and booking summaries clearly show "per person" pricing to avoid customer confusion. The customer UI provides an OTA-style room selection with dynamic price calculations.
-   **Booking Email Deep-Linking**: All booking notification emails include CTA links with the booking reference code (e.g., `/my-bookings?bookingRef=OGTYNP`). When users click these links, the my-bookings page automatically highlights and scrolls to the matching booking. Unauthenticated users are redirected to login with the reference preserved, then returned to the booking after authentication. If the booking reference doesn't match any user bookings, a friendly error banner is displayed.
-   **Guest Policy Attributes**: Properties can define guest policies including Couple Friendly, Local ID Allowed, Foreign Guests Allowed, and Hourly Booking options. These are captured during property onboarding (Step 3 of the wizard) and can be edited in the Owner Portal's Status tab via Switch controls. Search filters support all four guest policy attributes for guest-side filtering.
-   **Hidden Property IDs**: Internal property identifiers (property codes like "PROP-SRY23X") are hidden from all customer-facing views including property listing cards, property detail pages, booking confirmations, and emails. Property IDs remain in URLs for routing purposes but are not displayed as visible text. This maintains a clean customer experience while preserving internal tracking capabilities.
-   **How to Reach Section**: Property details page displays a dedicated "How to Reach" section showing nearest transport hubs (Metro Stations, Railway Stations, Bus Stops, Airports) with distance in kilometers and estimated travel time. Features "Get Directions" CTAs that open Google Maps with the property as destination. Transport data is fetched via Google Places API within a 25km radius and updates automatically when property location changes. Visible on both web and mobile views.
-   **Versioned Policy Management**: Complete Terms & Conditions and Privacy Policy management system with admin panel at `/admin/policies`. Features include: draft/publish/archive workflow, version tracking, automatic archiving of previous versions when publishing new ones, dynamic content loading on Terms/Privacy pages with static fallback. Users must accept policies on first login, and when new policy versions are published, the consent modal automatically appears forcing re-acceptance before accessing the platform. Policy acceptance is tracked with timestamps and version numbers in the users table.
-   **Comprehensive Contact Us Page**: Admin-editable contact information system with Contact Us page at `/contact` and admin panel at `/admin/contact-settings`. Features all required contact sections: Customer Support (email, phone, hours), Property Owner Support (dedicated hotelier support), Grievance Redressal Officer (required under Indian IT Act 2000 and Consumer Protection Rules 2020), Privacy & Data Protection (DPO contact, data deletion requests), Business & Partnerships (press/media inquiries), and Registered Office (company address, CIN). All contact information is stored in the `contact_settings` table and can be updated by admins without code deployment. Footer includes links to Contact Us page.
-   **Property Owner Agreement System**: Complete Owner Agreement management with admin panel at `/admin/owner-agreements`. Features include: draft/publish/archive workflow, version tracking, automatic archiving of previous versions when publishing new ones, dynamic content loading on public `/owner-agreement` page. Property owners must accept the agreement when accessing owner features (dashboard, listings, bookings). When new versions are published, owners are required to re-accept before accessing owner functionality. Agreement acceptance is tracked with timestamps and version numbers in the users table. Initial agreement is auto-seeded on first startup with comprehensive ZECOHO Property Owner Agreement terms covering zero commission model, owner obligations, payment terms, and legal provisions.

## Pending Features
-   **Payment Gateway Integration**: Stripe integration for booking payments is pending. When ready to implement, use the Stripe connector integration or manually configure with STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY secrets.

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