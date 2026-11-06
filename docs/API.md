# Zippsalon API Documentation & App Developer Guide

Welcome to the Zippsalon API reference. This document provides everything needed to integrate web, iOS, Android, and Flutter client applications with the Zippsalon backend.

---

## 1. Overview & Base URLs

- **Interactive Swagger UI**: `http://localhost:4000/api-docs/` (or `PORT` specified in environment)
- **OpenAPI JSON Spec**: `http://localhost:4000/api-docs.json`
- **Health Check**: `GET /health`
- **API Base Prefix**: `/api/v1`

---

## 2. Authentication & Headers

Zippsalon uses Bearer JWT tokens for authenticated routes.

### Standard Request Headers
```http
Content-Type: application/json
Authorization: Bearer <your-jwt-token>
```

### File Upload Headers
```http
Authorization: Bearer <your-jwt-token>
Content-Type: multipart/form-data
```

---

## 3. Standard Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Validation Error Response (HTTP 400)
```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Unauthorized Error Response (HTTP 401)
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Forbidden Error Response (HTTP 403)
```json
{
  "success": false,
  "message": "Forbidden: Insufficient permissions"
}
```

---

## 4. API Modules Summary

| Module | Base Path | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | User registration, login, password reset, and token verification |
| **Users** | `/api/v1/users`, `/api/v1/me` | Profile updates, salon owner settings, profile completion |
| **Feed** | `/api/v1/feed` | Social feed posts, media uploads, likes, comments, shares, 24h stories |
| **Salons** | `/api/v1/salons` | Salons, branch outlets, addresses, timings, and owner salons |
| **Bookings**| `/api/v1/bookings` | Appointment bookings, status transitions, payments, cancellations |
| **Customers** | `/api/v1/customers` | Customer lookup, search by phone/email, salon customer mappings |
| **Staff** | `/api/v1/staff` | Staff members, roles, daily attendance marking, and reports |
| **Services**| `/api/v1/services` | Service categories, salon services, and combo packages |
| **GST** | `/api/v1/gst` | Tax configuration (CGST, SGST, IGST) and printable tax invoices |
| **Dashboard** | `/api/v1/dashboard` | Salon analytics, revenue, appointment metrics, and attendance summary |
| **Inventory** | `/api/v1/inventory` | Catalog brands/categories, vendor products, salon stock, low-stock alerts |
| **Upload** | `/api/v1/upload` | Secure image/media file upload endpoint |
| **Generative AI** | `/api/v1/generate` | AI hairstyle generation and style transformations |
| **Leads** | `/api/v1/leads` | Public inquiry submission and sales lead tracking |
| **RBAC** | `/api/v1/rbac` | Dynamic navigation menus, permissions list, and staff roles |
| **WhatsApp**| `/api/v1/whatsapp` | Multi-tenant WhatsApp Cloud API, templates, campaigns, webhook |
| **Master Data** | `/api/v1/master` | Countries, states, and cities reference lists |
| **Customer** | `/api/v1/customer` | OTP login, customer-safe catalog, profile, permissions, and own bookings |

### Customer OTP Authentication

Customer accounts use the existing JWT format but are issued only the `CUSTOMER` role and explicit `customer.*` permissions.

- `POST /api/v1/customer/auth/register` — create a customer mapping to a validated vendor salon/branch and request email OTP.
- `POST /api/v1/customer/auth/otp/email/request` — request email OTP by identifier.
- `POST /api/v1/customer/auth/otp/email/verify` — verify OTP and receive `accessToken`.
- `POST /api/v1/customer/auth/otp/whatsapp/request` — request WhatsApp OTP when WhatsApp OTP configuration is available.
- `POST /api/v1/customer/auth/otp/whatsapp/verify` — verify WhatsApp OTP.

In development, the response may include `testOtp`; production never exposes OTP values. OTPs expire after five minutes, are hashed, rate-limited, attempt-limited, and single-use.

### Customer APIs

Customer JWTs can access only customer-scoped endpoints:

- `GET/PUT /api/v1/customer/me`
- `GET /api/v1/customer/me/permissions`
- `GET /api/v1/customer/me/menu`
- `GET /api/v1/customer/salons`
- `GET /api/v1/customer/branches`
- `GET /api/v1/customer/services`
- `GET /api/v1/customer/products` — customer-safe fields only; no costs, suppliers, or stock adjustments.
- `GET/POST /api/v1/customer/bookings`
- `POST /api/v1/customer/bookings/:id/cancel`

---

## 5. Feed & Social Integration Guide (For App Developers)

### 5.1 Upload Media for Post or Story
`POST /api/v1/feed/media/upload` (Requires authenticated staff/vendor/admin with RBAC permission `feed.media.upload`)
- **Form Data**: `media` (files, up to 10 images/videos)
- **Accepted formats**: `.jpg`, `.jpeg`, `.png`, `.webp` (<= 10MB), `.mp4`, `.mov` (<= 50MB)
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "url": "/public/uploads/feed/3f28a9b2-uuid.jpg",
      "type": "IMAGE",
      "fileName": "3f28a9b2-uuid.jpg",
      "mimeType": "image/jpeg",
      "fileSize": 2048576
    }
  ]
}
```

### 5.2 Staff-Owned Feed Posts
These endpoints are for the authenticated staff member and must be scoped to that staff member's own content.

- `GET /api/v1/staff/me/posts` — list own posts (`feed.posts.view`)
- `POST /api/v1/staff/me/posts` — create own post (`feed.posts.create`)
- `PUT /api/v1/staff/me/posts/:id` — update own post (`feed.posts.update_own`)
- `DELETE /api/v1/staff/me/posts/:id` — delete own post (`feed.posts.delete_own`)
- `PATCH /api/v1/staff/me/posts/:id/archive` — archive own post (owner-only enforcement)

#### Example: create a staff post
```json
{
  "caption": "Behind the scenes with our bridal styling team ✨",
  "visibility": "PUBLIC",
  "status": "PUBLISHED",
  "mediaIds": ["<uuid-returned-from-feed-media-upload>"]
}
```

#### Example: update a staff post
```json
{
  "caption": "Updated lookbook content for today",
  "visibility": "PRIVATE",
  "status": "DRAFT"
}
```

### 5.3 Staff-Owned Stories
- `GET /api/v1/staff/me/stories` — list own stories (`feed.stories.view`)
- `POST /api/v1/staff/me/stories` — create own story (`feed.stories.create`)
- `PUT /api/v1/staff/me/stories/:id` — update own story (`feed.stories.update_own`)
- `DELETE /api/v1/staff/me/stories/:id` — delete own story (`feed.stories.delete_own`)

#### Example: create a staff story
```json
{
  "caption": "Today's salon mood ✨",
  "mediaIds": ["<uuid-returned-from-feed-media-upload>"]
}
```

### 5.4 Create Feed Post
`POST /api/v1/feed/posts`
```json
{
  "salonId": "00000000-0000-4000-8000-000000000001",
  "branchId": "00000000-0000-4000-8000-000000000002",
  "caption": "Check out our latest bridal transformation! ✨",
  "visibility": "PUBLIC",
  "status": "PUBLISHED",
  "media": [
    {
      "url": "/public/uploads/feed/3f28a9b2-uuid.jpg",
      "type": "IMAGE"
    }
  ]
}
```

### 5.5 List Feed Posts
`GET /api/v1/feed/posts?page=1&limit=10&salonId=<uuid>`
- Returns list of posts with author details, media array, `likeCount`, `commentCount`, and `isLiked` boolean for the current user.

### 5.6 Like / Unlike Post
- **Like**: `POST /api/v1/feed/posts/:id/like`
- **Unlike**: `DELETE /api/v1/feed/posts/:id/like`

### 5.7 Comments
- **List**: `GET /api/v1/feed/posts/:id/comments`
- **Add**: `POST /api/v1/feed/posts/:id/comments` -> `{ "message": "Great work!" }`
- **Edit**: `PUT /api/v1/feed/comments/:commentId` -> `{ "message": "Updated comment" }`
- **Delete**: `DELETE /api/v1/feed/comments/:commentId`

### 5.8 24-Hour Stories
- **List Stories**: `GET /api/v1/feed/stories`
- **Create Story**: `POST /api/v1/feed/stories` -> `{ "salonId": "<uuid>", "caption": "Morning vibe", "media": [{ "url": "...", "type": "IMAGE" }] }`
- **Update Story**: `PUT /api/v1/feed/stories/:id` -> `{ "caption": "Updated story caption" }`
- **View Story**: `POST /api/v1/feed/stories/:id/view`

### 5.9 Staff API Reference
The staff module exposes both salon-admin staff management routes and authenticated staff self-service routes.

#### 5.9.1 Staff Management Routes
- `POST /api/v1/staff` — add a new staff member to a salon (`ADMIN` / `VENDOR`)
- `GET /api/v1/staff` — list staff members scoped by the acting admin/vendor (`ADMIN` / `VENDOR`)
- `PATCH /api/v1/staff/:id` — update a staff member's details or status (`ADMIN` / `VENDOR`)
- `POST /api/v1/staff/attendance` — mark attendance (`ADMIN` / `VENDOR`)
- `GET /api/v1/staff/attendance` — get salon attendance summary (`ADMIN` / `VENDOR`)

#### 5.9.2 Authenticated Staff Self-Service Endpoints
- `GET /api/v1/staff/me/profile` — read the logged-in staff profile
- `GET /api/v1/staff/me/dashboard` — dashboard stats and overview
- `GET /api/v1/staff/me/appointments` — list assigned appointments
- `GET /api/v1/staff/me/earnings` — earnings summary
- `GET /api/v1/staff/me/commissions` — commission history
- `GET /api/v1/staff/me/schedule` — schedule and working hours
- `GET /api/v1/staff/me/reviews` — reviews and ratings summary
- `GET /api/v1/staff/me/attendance` — own attendance records
- `GET /api/v1/staff/me/posts` — list own feed posts (`feed.posts.view`)
- `POST /api/v1/staff/me/posts` — create own post (`feed.posts.create`)
- `PUT /api/v1/staff/me/posts/:id` — update own post (`feed.posts.update_own`)
- `DELETE /api/v1/staff/me/posts/:id` — delete own post (`feed.posts.delete_own`)
- `PATCH /api/v1/staff/me/posts/:id/archive` — archive own post
- `GET /api/v1/staff/me/stories` — list own stories (`feed.stories.view`)
- `POST /api/v1/staff/me/stories` — create own story (`feed.stories.create`)
- `DELETE /api/v1/staff/me/stories/:id` — delete own story (`feed.stories.delete_own`)
- `GET /api/v1/staff/me/notifications` — list notifications
- `PATCH /api/v1/staff/me/notifications/:id/read` — mark one notification as read
- `PATCH /api/v1/staff/me/notifications/read-all` — mark all notifications as read
- `GET /api/v1/staff/me/bank-details` — read bank details
- `PATCH /api/v1/staff/me/bank-details` — update bank details
- `GET /api/v1/staff/me/support/faqs` — support FAQs
- `GET /api/v1/staff/me/support/tickets` — list support tickets
- `POST /api/v1/staff/me/support/tickets` — create a support ticket

#### 5.9.3 Staff Feed Permission Keys
The staff feed APIs rely on the following RBAC permission keys:

- `feed.posts.view`
- `feed.posts.create`
- `feed.posts.update_own`
- `feed.posts.delete_own`
- `feed.stories.view`
- `feed.stories.create`
- `feed.stories.update_own`
- `feed.stories.delete_own`
- `feed.media.upload`

These are returned by `GET /api/v1/rbac/permissions/me` for authenticated staff users after seeding the staff demo role.

---

## 6. Appointment Booking Flow

1. **Get Available Services**: `GET /api/v1/services/salon/:salonId`
2. **Get Salon Staff**: `GET /api/v1/staff?salonId=:salonId`
3. **Create Booking**: `POST /api/v1/bookings/salon/:salonId`
```json
{
  "customerData": {
    "firstName": "Rohan",
    "lastName": "Verma",
    "phone": "9812345678",
    "countryCode": "+91"
  },
  "staffId": "00000000-0000-4000-8000-000000000004",
  "bookingDate": "2026-10-15T10:30:00.000Z",
  "items": [
    {
      "name": "Standard Haircut",
      "price": 300
    }
  ],
  "discount": 10,
  "taxType": "CGST_SGST",
  "payment": {
    "amount": 318.6,
    "method": "UPI",
    "transactionId": "UPI-123456789"
  },
  "notes": "Prefers scissors only"
}
```
4. **Fetch Booking Details**: `GET /api/v1/bookings/:id`
5. **Print GST Invoice**: `GET /api/v1/gst/print/:bookingId`

