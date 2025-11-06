# Studio LeFlow - Music Production Studio Website

## Overview
Studio LeFlow is a professional music production studio based in Belgrade, Serbia, offering recording, mixing/mastering, instrumental production, and complete song creation services. The project aims to provide a dynamic online presence for the studio, built with a React + TypeScript frontend and an Express.js backend. It focuses on showcasing services, engaging users through project giveaways, and enabling easy content management for administrators.

## User Preferences
I want iterative development. Ask before making major changes. I prefer detailed explanations.

## System Architecture

### Technology Stack
**Frontend:** React 18 with TypeScript, Vite, Tailwind CSS + shadcn/ui, Framer Motion for UI animations, Wouter for routing, TanStack Query for server state management, React Hook Form + Zod for form validation.
**Backend:** Express.js with TypeScript, Drizzle ORM (PostgreSQL), Passport.js for authentication, Express Session.

### UI/UX Decisions
The website features a modern design utilizing Tailwind CSS and shadcn/ui components. Framer Motion is integrated throughout for professional animations, smooth page transitions, and enhanced user experience. The design prioritizes responsiveness and includes accessibility considerations. The Studio LeFlow transparent emblem logo is integrated, with automatic color inversion for dark/light themes. SEO optimization is a key focus, including dynamic meta tags, Open Graph tags, structured data, sitemap, robots.txt, and geo-tags for local SEO.

### Key Features
- **CMS Content Management**: Admins can edit site content directly on pages ("Izmeni Sajt" toggle) with an inline editing system for:
  - Text editing (hero sections, CTA, service descriptions)
  - Image uploads and management (service images, equipment photos)
  - Team member management (add/delete)
- **User Authentication**: Email/password authentication with verification.
- **Project Giveaways**: Monthly project uploads, a voting system, and admin approval for entries.
- **Contact Form**: Direct email notifications.
- **File Uploads**: MP3 file uploads for projects, image uploads for CMS content.
- **Admin Panel**: Comprehensive management for users, project approvals, and CMS editing.

### System Design Choices
- **Database**: PostgreSQL managed by Replit, utilizing Drizzle ORM for schema management (users, projects, votes, comments, contact submissions, CMS content, settings).
- **Development & Production**: Configured for seamless development on port 5000 with Vite integration and production deployment targeting Autoscale with optimized builds.
- **Performance**: Optimized for Core Web Vitals, especially Largest Contentful Paint (LCP), through lazy loading, prioritized image fetching, async font loading, server compression, and Vite build optimizations (chunk splitting, minification).
- **Language**: Primarily Serbian for all UI and content.

## External Dependencies
- **PostgreSQL**: Replit managed database for all persistent data.
- **Resend**: Email service for user verification, password resets, and contact form notifications. 
  - Production API key configured with verified custom domain (`mail.studioleflow.com`)
  - From address: `no-reply@mail.studioleflow.com`
  - Development mode fallback with debug endpoint for testing
  - Fail-safe: production fails if RESEND_FROM_EMAIL is missing
- **UploadThing**: File upload service specifically for MP3 files (max 16MB per file).

## Recent Updates (2025-11-06)
- **Email System**: Migrated to production Resend with verified domain, development fallback implemented
- **Page Transitions**: Enhanced with smooth scale + fade animations (0.4s duration, professional easing curve)
- **Code Quality**: Removed bcryptjs dependency, using Node.js scrypt for password hashing
- **CMS Image Editing**: Implemented EditableImage component for inline image uploads in admin mode
- **Favicon**: Added Studio LeFlow logo as site favicon (32x32) and Apple touch icon (180x180)
- **Terminology Update**: Changed all instances of "sesija" to "termin" throughout the application
- **PostCSS Build Warning**: Documented known benign warning from Tailwind CSS 3.x + PostCSS 8.4+ ("did not pass `from` option"). Warning is cosmetic only - CSS compiles correctly (77.94 kB). Custom Vite logger configured to attempt suppression. No functional impact, production-safe
- **SEO Enhancement**: Added "leflow" as standalone keyword in SEO meta tags (SEO.tsx and home.tsx)
- **Verification Modal Fix**: Fixed email verification flow - modal now appears immediately after registration (no redirection), removed auto-login from registration, user is logged in only after successful email verification
- **Deployment Configuration**: .gitignore created, build optimizations verified, deployment target set to Autoscale
- **Ready for Production**: All systems tested and verified, production build successful (20.53s), verification modal working on all devices