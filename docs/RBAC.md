# Role-Based Access Control (RBAC) & Permissions Architecture

## 1. System Roles

The system defines 5 primary application roles:

| Role Name | Description | Access Scope |
| :--- | :--- | :--- |
| `ADMIN` / `SUPER_ADMIN` | Global platform administrator | Full system access to all salons, users, inventory, templates, and audits |
| `VENDOR` / `SALON_OWNER` | Salon business owner | Full management of owned salons, branches, staff, services, bookings, inventory |
| `STAFF` | Salon stylist, barber, therapist | Can view schedule, customer appointments, and self attendance records |
| `CUSTOMER` | End user booking appointments | Can browse feed, book appointments, leave reviews, and view booking history |

---

## 2. Dynamic Permission Actions

Permissions are stored in the `Permission` table and checked dynamically using:
- `requirePermissionOrRoles(action, ...roles)` middleware (`src/common/middleware/permission.middleware.ts`)
- `hasSalonPermission(salonId, userId, userRoles)` utility (`src/common/utils/permission.util.ts`)

### Common Permission Actions:
- `dashboard.view`
- `feed.view`, `feed.create`, `feed.edit`, `feed.delete`
- `salons.view`, `salons.create`, `salons.edit`, `salons.delete`
- `branch.view`, `branch.create`, `branch.edit`, `branch.delete`
- `staff.view`, `staff.create`, `staff.edit`, `staff.delete`
- `attendance.view`, `attendance.create`, `attendance.edit`, `attendance.delete`
- `services.view`, `services.create`, `services.edit`, `services.delete`
- `customers.view`, `customers.create`, `customers.edit`, `customers.delete`
- `bookings.view`, `bookings.create`, `bookings.edit`, `bookings.delete`
- `whatsapp.view`, `whatsapp.create`, `whatsapp.edit`, `whatsapp.delete`
- `inventory.view`, `inventory.create`, `inventory.edit`, `inventory.delete`
- `leads.view`, `leads.create`, `leads.edit`, `leads.delete`
- `access-control.view`, `access-control.create`, `access-control.edit`, `access-control.delete`

---

## 3. Staff Roles (Granular Salon-Level Roles)

Salons can define custom staff roles (e.g., "Senior Hair Stylist", "Nail Technician", "Spa Therapist") linked to specific granular permissions.
- Staff role permissions are managed via `/api/v1/rbac/staff-roles`.
- Updates to staff roles are transactional via `prisma.$transaction` to guarantee consistency.

---

## 4. Permission Caching

User permissions are cached in Redis with key pattern:
`rbac:perms:v2:<userId>[:<salonId>]` with a TTL of 3600 seconds (1 hour).
When permissions or roles are toggled, the cache is automatically invalidated using `cacheInvalidate("rbac:perms:v2:*")`.

---

## 5. Payment & Wallet Vendor Scope

`GET /api/v1/rbac/menus` filters the menu tree by the authenticated user's effective permissions, subscription entitlements, and each menu's audience. The Payment & Wallet parent is included only when it has at least one visible child. A general booking-finance permission does not grant Vendors access to platform-level financial pages.

Vendor menu entries map to `booking-finance.wallet.view` (Wallet & Transactions) and `booking-finance.payout-account.view` (Payout Account). Payout-account changes require the separate `booking-finance.payout-account.manage` permission. Platform payment configuration and other platform finance menus are Admin-only; their APIs also enforce Admin roles and permissions. The legacy `/vendor/payment-gateway` route is Admin-guarded and is not shown in the sidebar.

Vendor finance endpoints under `/api/v1/vendor/finance` derive the vendor identity from the authenticated session and scope wallet, ledger, and settlement queries to that vendor. They do not trust a caller-supplied `vendorId`.

---

## 6. Pre-Seeded Staff Profiles & Access Limits Matrix (`npm run seed:dummy`)

For testing and verifying granular authorization, the following staff profiles are pre-seeded with **`Staff@123`**:

| Staff Role | Email | Password | Allowed Modules | Blocked / Forbidden Modules |
| :--- | :--- | :--- | :--- | :--- |
| **Front Desk Receptionist** | `receptionist@zippsalon.com` | `Staff@123` | • `Bookings` (view, create, edit)<br>• `Customers` (view, create, edit)<br>• `Attendance` (view, mark)<br>• `Services` & `Categories` (view)<br>• `Leads` (view, create, edit) | 🔒 `Inventory`, `Staff Management`, `Salons/Branches`, `Role Admin`, `Bookings Delete` |
| **Senior Hair Stylist** | `stylist@zippsalon.com` | `Staff@123` | • `Bookings` (view schedule)<br>• `Services` (view menu)<br>• `Attendance` (view, mark)<br>• `Feed` (view, publish post transformations) | 🔒 `Customer CRM`, `Inventory`, `Bookings Create/Edit/Delete`, `Staff Management` |
| **Store & Inventory Manager** | `inventory@zippsalon.com` | `Staff@123` | • `Inventory` (categories, brands, products, variants, stock updates)<br>• Low-stock tracking<br>• `Attendance` (view, mark) | 🔒 `Bookings`, `Customer CRM`, `Feed`, `WhatsApp`, `Staff Management` |
| **Junior Apprentice** | `trainee@zippsalon.com` | `Staff@123` | • `Attendance` (view, mark self)<br>• `Services` (view price guide only) | 🔒 **ALL operational modules**: `Bookings`, `Customers`, `Inventory`, `Feed`, `Staff` |

