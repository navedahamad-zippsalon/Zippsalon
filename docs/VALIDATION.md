# Zippsalon Request Validation Architecture

## 1. Validation Strategy

Zippsalon uses a centralized **Zod 4** request validation layer attached to Express routes via the `validate` middleware (`src/common/middleware/validate.middleware.ts`).

### Key Characteristics:
- **No Controller Pollution**: Handlers receive cleanly parsed, sanitized input.
- **Strict Typing**: Route parameters, query parameters, headers, and request bodies are validated according to predefined schemas.
- **Fail Fast**: Invalid requests are stopped at the middleware level before reaching business services or database queries.
- **Backward Compatible**: Extra unrecognized fields are preserved safely via `.passthrough()` where necessary to prevent breaking existing API clients.

---

## 2. Standard Validation Error Contract

When validation fails on any field, the API returns HTTP status `400 Bad Request` with this standardized JSON response:

```json
{
  "success": false,
  "message": "Validation Error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_format"
    }
  ]
}
```

---

## 3. Validator Modules (`src/validators/`)

| File | Scope & Schemas |
| :--- | :--- |
| `common.ts` | `paginationSchema`, `uuidParam(name)`, `idParam(name)` |
| `auth.ts` | `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changePasswordSchema` |
| `users.ts` | `updateProfileSchema`, `updateMySalonSchema` |
| `salons.ts` | `createSalonSchema`, `updateSalonSchema`, `adminCreateSalonSchema` |
| `admin.ts` | `adminUpdateSalonStatusSchema`, `adminUserQuerySchema` |
| `staff.ts` | `createStaffSchema`, `updateStaffSchema`, `markAttendanceSchema`, `attendanceQuerySchema` |
| `customers.ts` | `createCustomerSchema`, `customerSearchQuerySchema` |
| `services.ts` | `createServiceSchema`, `updateServiceSchema`, `createServiceCategorySchema`, `createComboSchema` |
| `bookings.ts` | `createBookingSchema`, `updateBookingSchema`, `addPaymentSchema`, `bookingQuerySchema` |
| `gst.ts` | `updateGSTConfigSchema` |
| `leads.ts` | `createLeadSchema`, `updateLeadStatusSchema` |
| `rbac.ts` | `createMenuSchema`, `updateMenuSchema`, `reorderMenuSchema`, `togglePermissionSchema`, `createStaffRoleSchema`, `updateStaffRoleSchema` |
| `dashboard.ts` | `dashboardStatsQuerySchema` |
| `upload.ts` | `uploadFolderQuerySchema` |
| `payments.ts` | `paymentSchema` |

---

## 4. Usage Pattern in Route Definitions

```typescript
import { validate } from "../../common/middleware/validate.middleware";
import { createBookingSchema } from "../../validators/bookings";
import { uuidParam } from "../../validators/common";

router.post(
  "/salon/:salonId",
  validate({
    params: uuidParam("salonId"),
    body: createBookingSchema,
  }),
  bookingController.createBooking
);
```

