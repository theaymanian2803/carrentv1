# CarShare Connect

Gemini said

This is the ultimate, production-grade prompt for Lovable AI. To build a true SaaS platform, we need to introduce a Super Admin role, KYC (Identity Verification), Stripe Connect (for split payments), a Review System, and In-App Messaging.

Copy and paste this massive prompt directly into Lovable. It is highly structured to force the AI to generate the exact database schema, UI components, and role-based logic you need.

Role: You are an elite Full-Stack Engineer and UI/UX Expert.
Task: Build a comprehensive, multi-tenant SaaS Car Rental Marketplace.
Tech Stack: React, Vite, Tailwind CSS, Shadcn UI, Recharts, Lucide Icons, Supabase (Auth, Database, Storage), and Stripe Connect.

Core Concept: A peer-to-peer car sharing SaaS where "Owners" list vehicles, "Renters" book them, and "Admins" oversee the platform and collect a commission on every transaction.

1. Database Schema & RLS (Supabase)

Generate the Supabase SQL schema, TypeScript interfaces, and strict Row Level Security (RLS) policies for the following:

users: id (uuid), role (enum: 'admin', 'owner', 'renter'), full_name, avatar_url, kyc_status (enum: 'pending', 'verified', 'rejected'), stripe_account_id.

cars: id, owner_id (ref: users), make, model, year, category (SUV, Sedan, Luxury, Electric), daily_rate, location_lat, location_lng, address, description, features (jsonb), images (text array), is_active, status (enum: 'pending_approval', 'live', 'delisted').

bookings: id, car_id (ref: cars), renter_id (ref: users), start_date, end_date, total_days, platform_fee, owner_payout, total_price, status (enum: 'pending', 'approved', 'active', 'completed', 'cancelled', 'disputed').

reviews: id, booking_id, reviewer_id, reviewee_id, rating (1-5), comment, created_at.

messages: id, sender_id, receiver_id, booking_id, content, read_status, created_at.

2. Super Admin Dashboard (Protected: Admin Only)

Overview Metrics: Use Recharts to show Monthly Recurring Revenue (MRR) from platform fees, Active Users, and Total Bookings.

User Management: A Shadcn Data Table with pagination to view all users, approve/reject KYC documents (driver's licenses), and ban users.

Listing Approvals: A queue of newly added cars requiring Admin approval before going live on the marketplace.

Dispute Resolution: A panel to view flagged bookings and resolve refunds.

3. SaaS Owner/Host Dashboard (Protected: Owner Only)

Performance Analytics: Recharts graphs showing monthly earnings, views on their car listings, and booking conversion rates.

Fleet Management: A grid of their listed cars. Include a multi-step Shadcn Form to add a new car (with drag-and-drop Supabase Storage image uploads for up to 5 images).

Calendar & Pricing: A master Shadcn Calendar to block out unavailable dates and set dynamic weekend pricing.

Booking Requests: A Kanban-style board (Pending, Upcoming, In Progress, Completed) to manage renter requests.

Payouts: A Stripe Connect integration UI showing available balance and next payout date.

4. Renter Dashboard & Experience

Advanced Search & Discovery: A complex search bar on the landing page (Location, Dates). The results page must have a split view: a grid of car cards on the left, and an interactive Map (Leaflet/Mapbox) on the right showing car locations.

Granular Filters: Shadcn sliders for Price, checkboxes for Category, Seats, Transmission, and "Instant Book" vs "Requires Approval".

Car Details Page: A prominent image carousel. Detailed specs, Host profile with their average rating, a date-picker for booking, and a breakdown of costs (Daily Rate x Days + Platform Fee = Total).

My Trips: Dashboard showing "Upcoming", "Past", and "Cancelled" trips. Include a button to "Message Host" and "Leave a Review" for past trips.

5. Essential SaaS Features & UI Directives

In-App Messaging: A real-time chat interface for renters and owners to communicate once a booking is requested.

Checkout Flow: Secure Stripe payment element modal. The payment is authorized upon request and captured only when the owner approves the booking.

Design System: Premium, trustworthy SaaS aesthetic. Deep Navy backgrounds (#0f172a), crisp white cards, and an Emerald Green (#10b981) for primary conversion buttons (Book, Approve, Pay).

Feedback: Extensive use of skeleton loaders for all data fetching. Use Shadcn Toasts for all mutations (e.g., "Message sent", "Booking approved", "Car listed").

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://templatecar.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b97bbabe-94c7-4421-8acf-0a05841b7d3f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
