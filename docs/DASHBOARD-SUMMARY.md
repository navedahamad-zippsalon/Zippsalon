# Dashboard summary metric definitions

The Admin and Vendor dashboard summary is included in the existing `GET /api/v1/dashboard` response as `data.dashboardSummary`. It uses the same authenticated dashboard scope resolver as the other dashboard data; Vendor identity comes from the authenticated user, and selected salon/branch filters are validated against that scope. No client-supplied vendor identifier is accepted as a substitute for authentication.

The business timezone is `APP_TIMEZONE`, falling back to `Asia/Kolkata`. Business-day and month boundaries are converted to timestamps in that timezone. `Expense.expenseDate` is a database date, so expense aggregation uses the corresponding calendar-date boundaries.

## Financial metrics

- Sales use completed `Payment.amount` records, grouped by payment creation time, linked to bookings whose status is not `CANCELLED` or `NO_SHOW`. This is the existing dashboard/report revenue definition. Payments are summed once; invoice totals and booking totals are never added to payments. Pending, failed, and refunded payment records are not sales. A partial refund that leaves its Payment marked `COMPLETED` follows the existing report behavior and is not separately deducted.
- Today’s cash and UPI totals are the same successful payment rows filtered by the persisted `Payment.method` enum (`CASH` or `UPI`). `CARD`, `OTHER`, and `RAZORPAY` are not relabeled as UPI.
- Month sales run from the first business-calendar day through the current business date. The comparison period runs from the first of the previous month through the matching day number, clamped to that month’s last day. A percentage is unavailable when the prior comparison period has zero sales.
- Expenses use active, non-deleted `Expense` records by `expenseDate`, with their salon and optional branch scope. Category names come from the linked `ExpenseCategory` rows.
- Approximate profit follows the existing analytics definition: completed-payment sales minus active recorded expenses. It is explicitly presented as an estimate; it is not a full accounting or settlement calculation.
- There is no standalone salon invoice/bill ledger in the current schema. GST invoices are generated from bookings on demand, so `today.billCount` is `null` and the UI explicitly reports that invoice count is not tracked. Appointment counts are not used as bill counts.

## Operational and customer metrics

- Today’s appointment count groups bookings by status within the business-day range and the current dashboard filters. Completed appointments count only `Booking.status = DONE`.
- Total customers are unique users associated with scoped salons through `SalonCustomer` or scoped bookings (for a selected branch, through bookings for that branch). Inactive customers are those with at least one completed visit before the 45-day cutoff and no completed visit on or after it. Customers without a completed visit are not considered inactive.
- Aggregations use separate payment, expense, booking, and customer queries/CTEs to avoid join multiplication and duplicate counts.

## Authorization and partial availability

The existing dashboard route and response envelope are retained. Vendor salon ownership/branch access is resolved server-side. For non-admin users, summary fields are set to unavailable when effective RBAC permissions do not include the corresponding permission. Revenue accepts the legacy dashboard access permission `dashboard.view` (and `dashboard.revenue.view` if configured); expenses, appointments, and customer details use `expenses.view`, `bookings.view`, and `customers.view`. The frontend hides actions unless their existing create/view permissions permit the target workflow.
