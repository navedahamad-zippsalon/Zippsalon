type Method = "get" | "post" | "put" | "patch" | "delete";

type PathDefinition = [path: string, method: Method, summary: string, tag: string, body?: boolean];

const definitions: PathDefinition[] = [
  ["/api/v1/whatsapp/campaigns/preview", "post", "Preview eligible WhatsApp recipients and current estimated charges", "WhatsApp", true],
  ["/api/v1/whatsapp/campaigns/{id}/schedule", "post", "Schedule an owned draft WhatsApp campaign", "WhatsApp", true],
  ["/api/v1/whatsapp/campaigns/{id}", "delete", "Safely delete a draft or archive a campaign with message/billing history", "WhatsApp"],
  ["/api/v1/admin/whatsapp/campaigns/{id}", "delete", "Safely delete a draft or archive a campaign while preserving its history", "WhatsApp Admin"],
  ["/api/v1/whatsapp/messages/{id}", "get", "Get an owned WhatsApp message with masked recipient details", "WhatsApp"],
  ["/api/v1/whatsapp/status", "get", "Get WhatsApp configuration status for an authorized salon", "WhatsApp"],
  ["/api/v1/whatsapp/readiness", "get", "Check vendor campaign sending readiness", "WhatsApp"],
  ["/api/v1/whatsapp/contacts/{id}/messages", "get", "List paginated messages for an owned contact", "WhatsApp"],
  ["/api/v1/whatsapp/campaigns/{id}", "get", "Get an owned campaign and billing summary", "WhatsApp"],
  ["/api/v1/whatsapp/campaigns/{id}", "put", "Edit an owned draft campaign", "WhatsApp", true],
  ["/api/v1/whatsapp/campaigns/{id}/messages", "get", "List messages for an owned campaign", "WhatsApp"],
  ["/api/v1/whatsapp/campaigns/{id}/analytics", "get", "Get analytics for an owned campaign", "WhatsApp"],
  ["/api/v1/whatsapp/messages", "get", "List paginated WhatsApp messages", "WhatsApp"],
  ["/api/v1/whatsapp/analytics", "get", "Get WhatsApp campaign analytics", "WhatsApp"],
  ["/api/v1/admin/whatsapp/config/status", "get", "Get WhatsApp configuration health status", "WhatsApp Admin"],
  ["/api/v1/admin/whatsapp/templates/{id}/submit", "post", "Submit a WhatsApp template to Meta", "WhatsApp Admin"],
  ["/api/v1/admin/whatsapp/campaigns/{id}", "get", "Get an administrative campaign detail", "WhatsApp Admin"],
  ["/api/v1/admin/whatsapp/analytics", "get", "Get global WhatsApp analytics", "WhatsApp Admin"],
  ["/api/v1/admin/whatsapp/webhooks", "get", "List paginated WhatsApp webhook events", "WhatsApp Admin"],
  ["/api/v1/admin/whatsapp/webhooks/{id}", "get", "Inspect a WhatsApp webhook event", "WhatsApp Admin"],
  ["/api/v1/admin/whatsapp/webhooks/{id}/retry", "post", "Retry an unprocessed WhatsApp webhook event", "WhatsApp Admin"],
  ["/api/v1/whatsapp/billing", "get", "View WhatsApp billing for the authenticated vendor", "WhatsApp"],
  ["/api/v1/admin/whatsapp/billing", "get", "Filter WhatsApp campaign billing across vendors", "WhatsApp Admin"],
  ["/api/v1/advertisements", "get", "List active advertisements for the authenticated audience", "Advertisements"],
  ["/api/v1/admin/advertisements", "get", "List advertisements for administrators", "Admin"],
  ["/api/v1/admin/advertisements", "post", "Create an advertisement", "Admin", true],
  ["/api/v1/admin/advertisements/{id}", "get", "Get advertisement details", "Admin"],
  ["/api/v1/admin/advertisements/{id}", "put", "Update an advertisement", "Admin", true],
  ["/api/v1/admin/advertisements/{id}", "delete", "Soft-delete an advertisement", "Admin"],
  ["/api/v1/admin/advertisements/{id}/status", "patch", "Change advertisement status", "Admin", true],
  ["/api/v1/admin/advertisements/reorder", "put", "Reorder advertisements atomically", "Admin", true],
  ["/api/v1/customer/coupons", "get", "List applicable customer coupons", "Customer"],
  ["/api/v1/customer/coupons/validate", "post", "Validate a coupon for a booking", "Customer", true],
  ["/api/v1/customer/salons/{salonId}/reviews", "get", "List salon reviews", "Customer"],
  ["/api/v1/customer/staff/{staffId}/reviews", "get", "List staff reviews", "Customer"],
  ["/api/v1/customer/reviews", "post", "Create a review for a completed booking", "Customer", true],
  ["/api/v1/customer/reviews/{id}", "put", "Update the customer review", "Customer", true],
  ["/api/v1/customer/reviews/{id}", "delete", "Delete the customer review", "Customer"],
  ["/api/v1/customer/wallet", "get", "Get the customer wallet balance", "Customer"],
  ["/api/v1/customer/wallet/transactions", "get", "List customer wallet transactions", "Customer"],
  ["/api/v1/customer/referral", "get", "Get customer referral records", "Customer"],
  ["/api/v1/customer/referral/history", "get", "Get customer referral history", "Customer"],
  ["/api/v1/customer/referral", "post", "Create a customer referral code", "Customer"],
  ["/api/v1/customer/referral/validate", "post", "Validate a referral code", "Customer", true],
  ["/api/v1/customer/referral/apply", "post", "Apply a referral code", "Customer", true],
  ["/api/v1/customer/advertisements", "get", "List active advertisements", "Customer"],
  ["/api/v1/customer/addresses", "get", "List saved customer addresses", "Customer"],
  ["/api/v1/customer/addresses", "post", "Create a saved customer address", "Customer", true],
  ["/api/v1/customer/addresses/{id}", "put", "Update a saved customer address", "Customer", true],
  ["/api/v1/customer/addresses/{id}", "delete", "Delete a saved customer address", "Customer"],
  ["/api/v1/customer/addresses/{id}/default", "patch", "Set a saved address as default", "Customer"],
  ["/api/v1/customer/me", "put", "Update the customer profile", "Customer", true],
  ["/api/v1/customer/me/permissions", "get", "Get customer permissions", "Customer"],
  ["/api/v1/customer/me/menu", "get", "Get the customer menu", "Customer"],
  ["/api/v1/customer/salons", "get", "List salons associated with the customer", "Customer"],
  ["/api/v1/customer/branches", "get", "List branches associated with the customer", "Customer"],
  ["/api/v1/customer/services", "get", "List customer-visible salon services", "Customer"],
  ["/api/v1/customer/products", "get", "List customer-visible products", "Customer"],
  ["/api/v1/customer/bookings", "get", "List customer bookings", "Customer"],
  ["/api/v1/customer/bookings", "post", "Create a customer booking", "Customer", true],
  ["/api/v1/customer/bookings/{id}/cancel", "post", "Cancel a customer booking", "Customer"],
  ["/api/v1/subscriptions/change-plan", "post", "Change the vendor subscription plan", "Subscriptions", true],
  ["/api/v1/admin/settings/smtp", "get", "Get SMTP settings", "Settings"],
  ["/api/v1/admin/settings/smtp", "post", "Create SMTP settings", "Settings", true],
  ["/api/v1/admin/settings/smtp", "put", "Update SMTP settings", "Settings", true],
  ["/api/v1/admin/settings/smtp/test", "post", "Test SMTP settings", "Settings", true],
  ["/api/v1/admin/settings/smtp/test-email", "post", "Send an SMTP test email", "Settings", true],
  ["/api/v1/admin/settings/smtp", "delete", "Delete SMTP settings", "Settings"],
  ["/api/v1/admin/settings/whatsapp", "get", "Get WhatsApp delivery settings", "Settings"],
  ["/api/v1/admin/settings/whatsapp", "post", "Create WhatsApp delivery settings", "Settings", true],
  ["/api/v1/admin/settings/whatsapp", "put", "Update WhatsApp delivery settings", "Settings", true],
  ["/api/v1/admin/settings/whatsapp/test", "post", "Test WhatsApp delivery settings", "Settings", true],
  ["/api/v1/admin/settings/whatsapp/test-message", "post", "Send a WhatsApp test message", "Settings", true],
  ["/api/v1/admin/settings/whatsapp", "delete", "Delete WhatsApp delivery settings", "Settings"],
  ["/api/v1/config/smtp", "get", "Get SMTP settings", "Settings"],
  ["/api/v1/config/smtp", "post", "Create SMTP settings", "Settings", true],
  ["/api/v1/config/smtp", "put", "Update SMTP settings", "Settings", true],
  ["/api/v1/config/smtp", "delete", "Delete SMTP settings", "Settings"],
  ["/api/v1/config/smtp/test", "post", "Test SMTP settings", "Settings", true],
  ["/api/v1/config/smtp/test-email", "post", "Send an SMTP test email", "Settings", true],
  ["/api/v1/config/smtp/status", "patch", "Change SMTP status", "Settings", true],
  ["/api/v1/config/whatsapp", "get", "Get WhatsApp settings", "Settings"],
  ["/api/v1/config/whatsapp", "post", "Create WhatsApp settings", "Settings", true],
  ["/api/v1/config/whatsapp", "put", "Update WhatsApp settings", "Settings", true],
  ["/api/v1/config/whatsapp", "delete", "Delete WhatsApp settings", "Settings"],
  ["/api/v1/config/whatsapp/test", "post", "Test WhatsApp settings", "Settings", true],
  ["/api/v1/config/whatsapp/test-message", "post", "Send a WhatsApp test message", "Settings", true],
  ["/api/v1/config/whatsapp/status", "patch", "Change WhatsApp status", "Settings", true],
  ["/api/v1/tracking/heartbeat", "post", "Update the authenticated user's active tracking session", "Tracking", true],
  ["/api/v1/tracking/activity", "post", "Record a meaningful CRM or customer app activity", "Tracking", true],
  ["/api/v1/tracking/logout", "post", "Close the authenticated user's tracking session", "Tracking", true],
  ["/api/v1/tracking/overview", "get", "Get global login and usage analytics", "Tracking"],
  ["/api/v1/tracking/users", "get", "List tracked users with paginated usage summaries", "Tracking"],
  ["/api/v1/tracking/users/{userId}", "get", "Get a user's tracking sessions and activity", "Tracking"],
  ["/api/v1/tracking/sessions", "get", "List paginated tracking sessions", "Tracking"],
  ["/api/v1/tracking/activity", "get", "List paginated tracking activity", "Tracking"],
  ["/api/v1/tracking/menu-usage", "get", "Get CRM menu usage analytics", "Tracking"],
  ["/api/v1/tracking/customer-app", "get", "Get customer app screen usage analytics", "Tracking"],
  ["/api/v1/tracking/customer-app-usage", "get", "Get customer app screen usage analytics", "Tracking"],
  ["/api/v1/tracking/vendors", "get", "List vendor tracking summaries", "Tracking"],
  ["/api/v1/tracking/vendors/{id}", "get", "Get vendor tracking history", "Tracking"],
  ["/api/v1/tracking/staff", "get", "List staff tracking summaries", "Tracking"],
  ["/api/v1/tracking/staff/{id}", "get", "Get staff tracking history", "Tracking"],
  ["/api/v1/tracking/customers", "get", "List customer app tracking summaries", "Tracking"],
  ["/api/v1/tracking/customers/{id}", "get", "Get customer tracking history", "Tracking"],
  ["/api/v1/tracking/location-device", "get", "List approximate location and device history", "Tracking"],
  ["/api/v1/tracking/analytics", "get", "Get daily, weekly, or monthly tracking analytics", "Tracking"],
  ["/api/v1/tracking/export", "get", "Stream filtered tracking data as CSV", "Tracking"],
];

export const additionalOpenapiPaths: Record<string, Record<string, unknown>> = {};

const reportParameters = ["vendorId", "salonId", "branchId", "countryId", "cityId", "startDate", "endDate", "status"].map((name) => ({
  name,
  in: "query",
  required: false,
  schema: { type: "string", ...(name.endsWith("Date") ? { format: "date" } : {}) },
}));

additionalOpenapiPaths["/api/v1/reports/analytics"] = {
  get: {
    summary: "Get vendor and salon analytics",
    tags: ["Reports"],
    security: [{ bearerAuth: [] }],
    parameters: reportParameters,
    responses: { "200": { description: "Analytics report" }, "400": { description: "Validation error" }, "401": { description: "Unauthorized" }, "403": { description: "Forbidden" } },
  },
};
additionalOpenapiPaths["/api/v1/reports/filters"] = {
  get: {
    summary: "Get cascading report filter options",
    tags: ["Reports"],
    security: [{ bearerAuth: [] }],
    parameters: reportParameters.filter((parameter) => !["startDate", "endDate", "status"].includes(parameter.name)),
    responses: { "200": { description: "Report filter options" }, "400": { description: "Validation error" }, "401": { description: "Unauthorized" }, "403": { description: "Forbidden" } },
  },
};

const financePaginationParameters = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
  { name: "search", in: "query", schema: { type: "string", maxLength: 200 } },
];
const financeFilterParameters = [
  ...financePaginationParameters,
  ...["vendorId", "salonId", "branchId", "customerId", "staffId", "bookingId"].map((name) => ({
    name, in: "query", schema: { type: "string" },
  })),
  ...["startDate", "endDate"].map((name) => ({ name, in: "query", schema: { type: "string", format: "date-time" } })),
  ...["from", "to"].map((name) => ({ name, in: "query", schema: { type: "string", format: "date-time" }, description: "Accepted date filter alias" })),
  ...["approvalStatus", "settlementStatus", "paymentStatus"].map((name) => ({ name, in: "query", schema: { type: "string" } })),
  { name: "transactionType", in: "query", schema: { type: "string" } },
  { name: "sortBy", in: "query", schema: { type: "string", enum: ["createdAt", "bookingAmount", "commissionAmount", "vendorPayableAmount", "approvalStatus", "settlementStatus"] } },
  { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
];
const financeSettlementFilters = [
  ...financePaginationParameters.filter((item) => item.name !== "search"),
  { name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "status", in: "query", schema: { type: "string", enum: ["PROCESSING", "PENDING", "QUEUED", "PAID", "FAILED", "REVERSED", "MANUAL_REVIEW"] } },
  ...["startDate", "endDate"].map((name) => ({ name, in: "query", schema: { type: "string", format: "date-time" } })),
  ...["from", "to", "salonId", "branchId"].map((name) => ({ name, in: "query", schema: { type: "string", ...(name.endsWith("Id") ? { format: "uuid" } : { format: "date-time" }) } })),
];
const financeReportFilters = [
  { name: "period", in: "query", schema: { type: "string", enum: ["today", "yesterday", "week", "lastWeek", "last_week", "month", "lastMonth", "last_month", "year", "custom"], default: "month" } },
  { name: "granularity", in: "query", schema: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"], default: "daily" } },
  ...["startDate", "endDate", "from", "to"].map((name) => ({ name, in: "query", schema: { type: "string", format: "date-time" }, description: "Required date range for period=custom; use from/to or startDate/endDate" })),
];
const financeTrendFilters = [
  { name: "period", in: "query", schema: { type: "string", enum: ["today", "yesterday", "week", "lastWeek", "last_week", "month", "lastMonth", "last_month", "year", "custom"], default: "month" } },
  { name: "groupBy", in: "query", schema: { type: "string", enum: ["day", "week", "month", "year"], default: "day" } },
  ...["from", "to"].map((name) => ({ name, in: "query", schema: { type: "string", format: "date-time" }, description: "Required for period=custom" })),
];

function financeBody(properties: Record<string, unknown>, required: string[] = []) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: { type: "object", required, properties },
        example: { remarks: "Approved after payment and booking verification" },
      },
    },
  };
}
function financeSuccessExample(schemaName?: string) {
  const transaction = {
    transactionId: "7a9b29b4-8617-4f80-96a1-791eab7ad43a",
    bookingId: "4856f6c4-29ce-45aa-8468-a8a537ae7110",
    bookingAmount: "1000.00",
    commissionRate: "30.00",
    commissionAmount: "300.00",
    vendorGrossAmount: "1000.00",
    vendorPayableAmount: "700.00",
    transactionType: "BOOKING_PENDING_CREDIT",
    paymentStatus: "COMPLETED",
    approvalStatus: "PENDING",
    settlementStatus: "NOT_READY",
    razorpayReference: null,
    createdAt: "2026-10-06T10:00:00.000Z",
    approvedAt: null,
    settledAt: null,
    actions: {
      approve: { visible: true, allowed: true, label: "Approve" },
      hold: { visible: true, allowed: true, label: "Hold" },
    },
  };
  const pagination = { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false };
  const examples: Record<string, unknown> = {
    FinancialDashboardResponse: {
      summary: { totalBookingAmount: "1000.00", totalCommission: "300.00", totalVendorGross: "1000.00", totalVendorPayable: "700.00", totalPendingWallet: "1000.00", totalAvailableWallet: "0.00", totalPendingSettlement: "0.00", totalSettled: "0.00", totalRefunded: "0.00", totalFailedSettlement: "0.00" },
      today: { bookingAmount: "1000.00", commission: "300.00", vendorPayable: "700.00", pending: "1000.00", settled: "0.00" },
      week: { bookingAmount: "1000.00", commission: "300.00", vendorPayable: "700.00", pending: "1000.00", settled: "0.00" },
      month: { bookingAmount: "1000.00", commission: "300.00", vendorPayable: "700.00", pending: "1000.00", settled: "0.00" },
      year: { bookingAmount: "1000.00", commission: "300.00", vendorPayable: "700.00", pending: "1000.00", settled: "0.00" },
      settlement: { readyToSendToday: "0.00", pendingApproval: "1000.00", processing: "0.00", settledToday: "0.00", eligibleVendorCount: 0, eligibleTransactionCount: 0 },
    },
    FinancialSummaryResponse: { period: { from: "2026-10-01T00:00:00.000Z", to: "2026-10-06T23:59:59.999Z" }, bookingAmount: "1000.00", commission: "300.00", vendorPayable: "700.00", pending: "1000.00", approved: "0.00", processing: "0.00", settled: "0.00", failed: "0.00" },
    FinancialTrendsResponse: { period: { from: "2026-10-01T00:00:00.000Z", to: "2026-10-06T23:59:59.999Z" }, groupBy: "day", data: [{ period: "2026-10-06T00:00:00.000Z", bookingAmount: "1000.00", commission: "300.00", vendorPayable: "700.00", pending: "1000.00", approved: "0.00", processing: "0.00", settled: "0.00", failed: "0.00" }] },
    PaginatedFinancialTransactionResponse: { data: [transaction], items: [transaction], pagination },
    FinancialTransactionDetailResponse: { ...transaction, customer: { id: "customer-id", firstName: "Ananya" }, vendor: { id: "vendor-id", firstName: "Rahul" }, salon: { id: "salon-id", name: "Example Salon" }, branch: null, walletEntries: [], settlements: [], auditLogs: [] },
    PendingSettlementResponse: { totalEligibleAmount: "0.00", todaySettlementAmount: "0.00", pendingApprovalAmount: "1000.00", processingAmount: "0.00", failedAmount: "0.00", eligibleVendorCount: 0, eligibleTransactionCount: 0, nextSettlementAt: null, data: [], pagination },
    CommissionSettingsResponse: { commissionType: "PERCENTAGE", commissionValue: 30, currency: "INR", status: "ACTIVE", effectiveFrom: "2026-10-01T00:00:00.000Z" },
    SettlementSettingsResponse: { settlementMode: "MANUAL", intervalValue: 1, intervalUnit: "DAYS", minimumSettlementAmount: "0.00", autoSettlementEnabled: false, nextSettlementAt: null, sourceAccountNumber: null, sourceAccountConfigured: false },
    PaginatedSettlementResponse: { data: [], items: [], pagination },
    SettlementResponse: { settlementId: "7a9b29b4-8617-4f80-96a1-791eab7ad43a", vendor: { id: "vendor-id", firstName: "Rahul" }, salon: null, branch: null, amount: "700.00", status: "PROCESSING", razorpayReference: null, initiatedAt: "2026-10-06T10:00:00.000Z", completedAt: null, failureReason: null },
    VendorWalletSummaryResponse: { wallet: { pendingBalance: "1000.00", availableBalance: "0.00", processingBalance: "0.00", paidBalance: "0.00", currency: "INR" }, totals: { totalBookingValue: "1000.00", totalCommission: "300.00", totalVendorPayable: "700.00" } },
  };
  return { success: true, data: examples[schemaName ?? ""] ?? { message: "Financial operation completed successfully" } };
}
function financePath(path: string, method: "get" | "post" | "put", summary: string, options: {
  parameters?: any[];
  body?: Record<string, unknown>;
  required?: string[];
  example?: Record<string, unknown>;
  responseSchema?: string;
  permission: string;
}) {
  const pathParameters = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1],
    in: "path",
    required: true,
    schema: { type: "string", format: "uuid" },
  }));
  const defaultSchema = path.endsWith("/dashboard") || path.endsWith("/reports")
    ? "FinancialDashboardResponse"
    : path.endsWith("/trends")
      ? "FinancialTrendsResponse"
      : path.endsWith("/summary") && path.includes("/booking/commission/")
        ? "FinancialSummaryResponse"
        : path.endsWith("/pending-settlement") || path.endsWith("/pending-settlements")
          ? "PendingSettlementResponse"
          : path.includes("/transactions/") && method === "get"
            ? "FinancialTransactionDetailResponse"
            : path.endsWith("/transactions") && method === "get"
              ? "PaginatedFinancialTransactionResponse"
              : path.includes("/settlements") && path.endsWith("/settlements") && method === "get"
                ? "PaginatedSettlementResponse"
                : path.includes("/settlements/") && method === "get"
                  ? "SettlementResponse"
                  : path.endsWith("/settings") && (path.includes("/booking/commission/") || path.endsWith("/commission"))
                    ? "CommissionSettingsResponse"
                    : path.endsWith("/commission")
                      ? "CommissionSettingsResponse"
                      : path.includes("settlement-settings") || path.endsWith("/settings")
                        ? "SettlementSettingsResponse"
                        : path.endsWith("/wallet") || path.endsWith("/wallet/summary")
                          ? "VendorWalletSummaryResponse"
                          : undefined;
  const operation: Record<string, unknown> = {
    summary,
    description: `Requires the ${options.permission} permission. Vendor endpoints are scoped to the authenticated vendor account.`,
    tags: ["Booking Finance"],
    security: [{ bearerAuth: [] }],
    parameters: [...pathParameters, ...(options.parameters ?? [])],
    responses: {
      "200": {
        description: "Successful operation",
        content: {
          "application/json": {
            schema: options.responseSchema || defaultSchema
              ? { $ref: `#/components/schemas/${options.responseSchema ?? defaultSchema}` }
              : {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                data: { type: "object" },
              },
            },
            example: financeSuccessExample(options.responseSchema ?? defaultSchema),
          },
        },
      },
      "400": { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ValidationError" }, example: { success: false, message: "Validation Error", errors: [{ field: "limit", message: "Too big: expected number to be <=100" }] } } } },
      "401": { description: "Missing or invalid authentication token", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { success: false, message: "Unauthorized" } } } },
      "403": { description: "Role or permission denied", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { success: false, message: "Forbidden" } } } },
      "404": { description: "Resource not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { success: false, message: "Financial transaction not found" } } } },
      "409": { description: "Invalid financial state transition", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { success: false, message: "This transaction has already been decided" } } } },
    },
  };
  if (options.body) {
    const body = financeBody(options.body, options.required ?? []) as any;
    if (options.example) body.content["application/json"].example = options.example;
    operation.requestBody = body;
  }
  additionalOpenapiPaths[path] ??= {};
  additionalOpenapiPaths[path][method] = operation;
}

const commissionBody = {
  commissionType: { type: "string", enum: ["PERCENTAGE", "FIXED"] },
  commissionValue: { type: "number", minimum: 0, description: "Percentage (0-100) or fixed amount in the configured currency" },
  currency: { type: "string", minLength: 3, maxLength: 3, default: "INR" },
  effectiveFrom: { type: "string", format: "date-time" },
};
const decisionBody = { remarks: { type: "string", maxLength: 500 }, reason: { type: "string", maxLength: 500, description: "Backward-compatible alias of remarks" } };
const settlementSettingsBody = {
  settlementMode: { type: "string", enum: ["MANUAL", "AUTOMATIC"] },
  intervalValue: { type: "integer", minimum: 1 },
  intervalUnit: { type: "string", enum: ["SECONDS", "MINUTES", "HOURS", "DAYS", "WEEKS", "MONTHS"] },
  minimumSettlementAmount: { type: "number", minimum: 0 },
  autoSettlementEnabled: { type: "boolean" },
  sourceAccountNumber: { type: "string", writeOnly: true, description: "Encrypted at rest and never returned in full" },
  payoutMode: { type: "string", enum: ["IMPS", "NEFT", "RTGS", "UPI"] },
};
const razorpayXBody = {
  environment: { type: "string", enum: ["TEST", "LIVE"] },
  keyId: { type: "string" },
  keySecret: { type: "string", writeOnly: true },
  webhookSecret: { type: "string", writeOnly: true },
  enabled: { type: "boolean" },
};
const payoutAccountBody = {
  accountHolderName: { type: "string", minLength: 3, maxLength: 120 },
  bankName: { type: "string", minLength: 2, maxLength: 120 },
  accountNumber: { type: "string", writeOnly: true },
  ifscCode: { type: "string" },
  accountType: { type: "string", enum: ["SAVINGS", "CURRENT", "SALARY", "OTHER"] },
};
const financePathGroups = [
  { base: "/api/v1/admin/booking-finance", aliases: false },
  { base: "/api/v1/booking/commission", aliases: true },
];
for (const { base, aliases } of financePathGroups) {
  if (aliases) {
    financePath(`${base}/dashboard`, "get", "Get finance dashboard totals and date-wise series", { parameters: financeReportFilters, permission: "booking-finance.view" });
    financePath(`${base}/summary`, "get", "Get financial summary for a period", { parameters: financeReportFilters, permission: "booking-finance.view" });
    financePath(`${base}/trends`, "get", "Get database-aggregated booking, commission, payable, pending, and settled chart data", { parameters: financeTrendFilters, permission: "booking-finance.view" });
    financePath(`${base}/pending-settlement`, "get", "Get payable balances eligible for settlement and today's settlement totals", { parameters: financePaginationParameters, permission: "booking-finance.view" });
    financePath(`${base}/pending-settlements`, "get", "Get paginated eligible vendor and transaction settlement records", { parameters: financePaginationParameters, permission: "booking-finance.view" });
    financePath(`${base}/settlement-settings`, "get", "Get settlement schedule and mode settings", { permission: "booking-finance.view" });
    financePath(`${base}/settlement-settings`, "put", "Update settlement schedule and mode settings", { body: settlementSettingsBody, example: { settlementMode: "MANUAL", intervalValue: 1, intervalUnit: "DAYS", minimumSettlementAmount: 0, autoSettlementEnabled: false, payoutMode: "IMPS" }, required: ["settlementMode", "intervalValue", "intervalUnit", "minimumSettlementAmount", "autoSettlementEnabled", "payoutMode"], permission: "booking-finance.configure" });
  }

  if (!aliases) {
    financePath(`${base}/commission`, "get", "Get the active booking commission rule", { permission: "booking-finance.view" });
    financePath(`${base}/commission`, "put", "Create a new effective-dated commission rule", { body: commissionBody, example: { commissionType: "PERCENTAGE", commissionValue: 30, currency: "INR" }, required: ["commissionType", "commissionValue"], permission: "booking-finance.configure" });
  }
  financePath(`${base}/transactions`, "get", "List booking financial transactions with filters and pagination", { parameters: financeFilterParameters, permission: "booking-finance.view" });
  financePath(`${base}/transactions/{id}`, "get", "Get a booking financial transaction and audit timeline", { permission: "booking-finance.view" });
  financePath(`${base}/transactions/{id}/approve`, "post", "Approve a pending or held booking finance transaction; repeated approval returns 409 COMMISSION_ALREADY_APPROVED", { body: decisionBody, example: { remarks: "Approved after payment verification" }, permission: "booking-finance.approve" });
  financePath(`${base}/transactions/{id}/reject`, "post", "Reject a pending booking finance transaction", { body: decisionBody, example: { remarks: "Payment requires review" }, permission: "booking-finance.approve" });
  if (!aliases) financePath(`${base}/transactions/{id}/hold`, "post", "Place a pending booking finance transaction on hold; repeated hold returns 409 COMMISSION_ALREADY_ON_HOLD", { body: decisionBody, example: { remarks: "Hold for supporting documentation" }, permission: "booking-finance.approve" });
  financePath(`${base}/settlements`, "get", "List vendor settlements with filters and pagination", { parameters: financeSettlementFilters, permission: "booking-finance.view" });
  financePath(`${base}/settlements/{id}`, "get", "Get settlement details, related bookings, and audit history", { permission: "booking-finance.view" });
  financePath(`${base}/settlements/{id}/process`, "post", "Process an existing eligible settlement through RazorpayX", { permission: "booking-finance.settle" });
  financePath(`${base}/settlements/{id}/retry`, "post", "Retry a failed or reversed settlement using a new idempotent payout", { permission: "booking-finance.settle" });
  if (!aliases) {
    financePath(`${base}/ledger`, "get", "List vendor wallet ledger entries", { parameters: [...financePaginationParameters, ...financeSettlementFilters.slice(-3), { name: "bookingId", in: "query", schema: { type: "string" } }, { name: "type", in: "query", schema: { type: "string" } }, { name: "bucket", in: "query", schema: { type: "string" } }], permission: "booking-finance.view" });
    financePath(`${base}/reports`, "get", "Get wallet totals, period summaries, and date-wise financial reporting", { parameters: financeReportFilters, permission: "booking-finance.view" });
    financePath(`${base}/pending-settlement`, "get", "Get eligible settlement totals and counts", { permission: "booking-finance.view" });
    financePath(`${base}/vendor-summary`, "get", "Get paginated vendor-level booking, commission, wallet, and settlement summaries", { parameters: financeFilterParameters, permission: "booking-finance.view" });
    financePath(`${base}/vendors/{vendorId}/payout-account`, "get", "Get masked payout account details for a vendor", { permission: "booking-finance.view" });
    financePath(`${base}/vendors/{vendorId}/payout-account`, "put", "Save encrypted vendor bank details; when RazorpayX is configured, create and verify the provider fund account", { body: payoutAccountBody, example: { accountHolderName: "Example Vendor", bankName: "Example Bank", accountNumber: "1234567890", ifscCode: "ABCD0123456", accountType: "CURRENT" }, required: ["accountHolderName", "bankName", "accountNumber", "ifscCode"], permission: "booking-finance.payout-account.manage" });
    financePath(`${base}/settlements/vendors/{vendorId}`, "post", "Initiate settlement for a vendor", { permission: "booking-finance.settle" });
    financePath(`${base}/settings`, "get", "Get settlement settings", { permission: "booking-finance.view" });
    financePath(`${base}/settings`, "put", "Update settlement settings", { body: settlementSettingsBody, example: { settlementMode: "MANUAL", intervalValue: 1, intervalUnit: "DAYS", minimumSettlementAmount: 0, autoSettlementEnabled: false, payoutMode: "IMPS" }, required: ["settlementMode", "intervalValue", "intervalUnit", "minimumSettlementAmount", "autoSettlementEnabled", "payoutMode"], permission: "booking-finance.configure" });
    financePath(`${base}/razorpayx`, "get", "Get RazorpayX environment, payout readiness, and missing configuration fields without exposing secrets", { permission: "booking-finance.view" });
    financePath(`${base}/razorpayx`, "put", "Configure RazorpayX payout credentials", { body: razorpayXBody, example: { environment: "TEST", keyId: "rzp_test_configured_key", keySecret: "replace-with-secret", webhookSecret: "replace-with-webhook-secret", enabled: false }, required: ["environment", "keyId", "enabled"], permission: "booking-finance.configure" });
  } else {
    financePath(`${base}/vendor-summary`, "get", "Get paginated vendor-level financial summaries", { parameters: financeFilterParameters, permission: "booking-finance.view" });
    financePath(`${base}/settings`, "get", "Get the active booking commission rule", { permission: "booking-finance.view" });
    financePath(`${base}/settings`, "put", "Update booking commission settings", { body: commissionBody, example: { commissionType: "PERCENTAGE", commissionValue: 30, currency: "INR" }, required: ["commissionType", "commissionValue"], permission: "booking-finance.configure" });
  }
}

const vendorFinanceBase = "/api/v1/vendor/finance";
financePath(`${vendorFinanceBase}/wallet`, "get", "Get the authenticated vendor's wallet balances and lifetime totals", { permission: "booking-finance.wallet.view" });
financePath(`${vendorFinanceBase}/lookups/{type}`, "get", "Search only the authenticated vendor's own salons or branches", { parameters: [
  { name: "type", in: "path", required: true, schema: { type: "string", enum: ["salons", "branches"] } },
  { name: "search", in: "query", schema: { type: "string", maxLength: 160 } },
  { name: "salonId", in: "query", schema: { type: "string", format: "uuid" }, description: "Limit branch results to the selected owned salon" },
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
], permission: "booking-finance.wallet.view" });
financePath(`${vendorFinanceBase}/transactions`, "get", "List only the authenticated vendor's financial transactions", { parameters: financeFilterParameters, permission: "booking-finance.wallet.view" });
financePath(`${vendorFinanceBase}/wallet/entries`, "get", "List only the authenticated vendor's wallet ledger entries", { parameters: financePaginationParameters, permission: "booking-finance.wallet.view" });
financePath(`${vendorFinanceBase}/settlements`, "get", "List only the authenticated vendor's settlements", { parameters: financeSettlementFilters, permission: "booking-finance.wallet.view" });
financePath(`${vendorFinanceBase}/payout-account`, "get", "Get masked payout account details for the authenticated vendor", { permission: "booking-finance.payout-account.manage" });
financePath(`${vendorFinanceBase}/payout-account`, "put", "Create or update the authenticated vendor's payout account", { body: payoutAccountBody, example: { accountHolderName: "Example Vendor", bankName: "Example Bank", accountNumber: "1234567890", ifscCode: "ABCD0123456", accountType: "CURRENT" }, required: ["accountHolderName", "bankName", "accountNumber", "ifscCode"], permission: "booking-finance.payout-account.manage" });

const canonicalVendorWalletBase = "/api/v1/vendor/wallet";
financePath(`${canonicalVendorWalletBase}/summary`, "get", "Get the authenticated vendor's pending, available, processing, and settled wallet totals", { permission: "booking-finance.wallet.view" });
financePath(`${canonicalVendorWalletBase}/transactions`, "get", "List only the authenticated vendor's transactions with filters and pagination", { parameters: financeFilterParameters, permission: "booking-finance.wallet.view" });
financePath(`${canonicalVendorWalletBase}/transactions/{id}`, "get", "Get a transaction only when it belongs to the authenticated vendor", { permission: "booking-finance.wallet.view" });
financePath(`${canonicalVendorWalletBase}/settlements`, "get", "List only the authenticated vendor's settlement history", { parameters: financeSettlementFilters, permission: "booking-finance.wallet.view" });

for (const [path, method, summary, tag, body] of definitions) {
  const operation: Record<string, unknown> = {
    summary,
    tags: [tag],
    security: [{ bearerAuth: [] }],
    responses: {
      "200": { description: "Successful operation" },
      "400": { description: "Validation error" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Resource not found" },
    },
  };
  if (body) operation.requestBody = { required: true, content: { "application/json": { schema: { type: "object" } } } };
  additionalOpenapiPaths[path] ??= {};
  additionalOpenapiPaths[path][method] = operation;
}

const paymentWalletQueryParameters = [
  ...["page", "limit"].map((name) => ({
    name,
    in: "query",
    schema: { type: "integer", minimum: 1, ...(name === "limit" ? { maximum: 100, default: 10 } : { default: 1 }) },
  })),
  ...["search", "vendorName", "salonName", "branchName", "customerName", "customerContact", "bookingNumber", "transactionReference"].map((name) => ({
    name,
    in: "query",
    schema: { type: "string", maxLength: 200 },
  })),
  ...["startDate", "endDate", "from", "to"].map((name) => ({
    name,
    in: "query",
    schema: { type: "string", format: "date-time" },
  })),
  ...["status", "refundStatus", "approvalStatus", "settlementStatus", "settlementRecordStatus", "paymentMethod", "paymentTransactionType", "transactionType", "walletTransactionType", "walletTransactionStatus", "customerStatus", "customerId", "ledgerStatus", "period", "sortBy", "sortOrder"].map((name) => ({
    name,
    in: "query",
    schema: { type: "string" },
  })),
];
const paymentWalletPaths: Array<[string, "get" | "put" | "post", string, boolean?]> = [
  ["/api/v1/admin/payment-wallet/overview", "get", "Get Payment & Wallet overview metrics"],
  ["/api/v1/admin/payment-wallet/payments", "get", "List payments with readable name/reference filters"],
  ["/api/v1/admin/payment-wallet/payments/{reference}", "get", "Get a payment by payment or transaction reference"],
  ["/api/v1/admin/payment-wallet/transactions", "get", "List payment transactions"],
  ["/api/v1/admin/payment-wallet/gateway", "get", "Get sanitized payment gateway configuration"],
  ["/api/v1/admin/payment-wallet/gateway", "put", "Update payment gateway configuration", true],
  ["/api/v1/admin/payment-wallet/gateway/test", "post", "Test payment gateway configuration"],
  ["/api/v1/admin/payment-wallet/refunds", "get", "List refund records"],
  ["/api/v1/admin/payment-wallet/refunds/{reference}", "get", "Get a refund by refund or gateway reference"],
  ["/api/v1/admin/payment-wallet/refunds", "post", "Submit a payment gateway refund", true],
  ["/api/v1/admin/payment-wallet/customer-wallets", "get", "List customer wallets"],
  ["/api/v1/admin/payment-wallet/customer-wallets/{customerId}", "get", "Get a customer wallet and balance totals"],
  ["/api/v1/admin/payment-wallet/customer-wallets/{customerId}/transactions", "get", "List a customer's wallet transactions"],
  ["/api/v1/admin/payment-wallet/customer-wallets/{customerId}/transactions/{transactionId}", "get", "Get a customer wallet transaction"],
  ["/api/v1/admin/payment-wallet/customer-wallet-transactions", "get", "List customer wallet transactions"],
  ["/api/v1/admin/payment-wallet/wallet/overview", "get", "Get vendor wallet balances and finance totals"],
  ["/api/v1/admin/payment-wallet/wallet/transactions", "get", "List vendor wallet ledger entries"],
  ["/api/v1/admin/payment-wallet/commission", "get", "Get booking commission dashboard"],
  ["/api/v1/admin/payment-wallet/commission/transactions", "get", "List commission transactions"],
  ["/api/v1/admin/payment-wallet/commission/transactions/{id}/approve", "post", "Approve a pending or held commission transaction; repeated approval returns 409 COMMISSION_ALREADY_APPROVED", true],
  ["/api/v1/admin/payment-wallet/commission/transactions/{id}/hold", "post", "Hold a pending commission transaction; repeated hold returns 409 COMMISSION_ALREADY_ON_HOLD", true],
  ["/api/v1/admin/payment-wallet/commission/transactions/{id}/reject", "post", "Reject a commission transaction", true],
  ["/api/v1/admin/payment-wallet/settlements/pending", "get", "List eligible pending settlements"],
  ["/api/v1/admin/payment-wallet/settlements/vendors/{vendorId}", "post", "Start settlement for a vendor"],
  ["/api/v1/admin/payment-wallet/settlements/history", "get", "List settlement history"],
  ["/api/v1/admin/payment-wallet/settlements/history/{id}/process", "post", "Process a settlement"],
  ["/api/v1/admin/payment-wallet/settlements/history/{id}/retry", "post", "Retry a failed settlement"],
  ["/api/v1/admin/payment-wallet/settlements/settings", "get", "Get settlement settings"],
  ["/api/v1/admin/payment-wallet/settlements/settings", "put", "Update settlement settings", true],
  ["/api/v1/admin/payment-wallet/commission/settings", "get", "Get commission settings"],
  ["/api/v1/admin/payment-wallet/commission/settings", "put", "Update commission settings", true],
  ["/api/v1/admin/payment-wallet/reports", "get", "Get financial report aggregates"],
];
for (const [path, method, summary, hasBody] of paymentWalletPaths) {
  const operation: Record<string, unknown> = {
    summary,
    description: "Requires an authenticated administrator and the route's existing payment/finance permission.",
    tags: ["Payment & Wallet"],
    security: [{ bearerAuth: [] }],
    ...(method === "get" && !path.includes("{reference}") ? { parameters: paymentWalletQueryParameters } : {}),
    responses: {
      "200": { description: "Successful operation" },
      "400": { description: "Validation error" },
      "401": { description: "Unauthorized" },
      "403": { description: "Forbidden" },
      "404": { description: "Resource not found" },
    },
  };
  if (hasBody) operation.requestBody = { required: true, content: { "application/json": { schema: { type: "object" } } } };
  additionalOpenapiPaths[path] ??= {};
  additionalOpenapiPaths[path][method] = operation;
}
for (const type of ["salons", "branches", "vendors", "customers"]) {
  const path = `/api/v1/admin/payment-wallet/lookups/${type}`;
  additionalOpenapiPaths[path] = {
    get: {
      summary: `Search Payment & Wallet ${type} by display name or contact`,
      tags: ["Payment & Wallet"],
      security: [{ bearerAuth: [] }],
      parameters: [
        { name: "search", in: "query", schema: { type: "string", maxLength: 160 } },
        { name: "salonName", in: "query", schema: { type: "string", maxLength: 160 }, description: "Optional parent salon name for branch results" },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
      ],
      responses: {
        "200": { description: "Lookup results include internal IDs for selection and human-readable labels for display" },
        "401": { description: "Unauthorized" },
        "403": { description: "Forbidden" },
      },
    },
  };
}

const resourcePermissionByPath: Record<string, string> = {
  "/api/v1/payments/summary": "payment-wallet.overview.view",
  "/api/v1/payments": "payment-wallet.payments.view",
  "/api/v1/payments/{reference}": "payment-wallet.payments.view",
  "/api/v1/payments/transactions": "payment-wallet.transactions.view",
  "/api/v1/payments/transactions/{reference}": "payment-wallet.transactions.view",
  "/api/v1/refunds": "payment-wallet.refunds.view",
  "/api/v1/refunds/summary": "payment-wallet.refunds.view",
  "/api/v1/refunds/{reference}": "payment-wallet.refunds.view",
  "/api/v1/customer-wallet": "payment-wallet.customer-wallet.view",
  "/api/v1/customer-wallet/transactions": "payment-wallet.customer-wallet.view",
  "/api/v1/customer-wallet/{customerId}": "payment-wallet.customer-wallet.view",
  "/api/v1/customer-wallet/{customerId}/transactions": "payment-wallet.customer-wallet.view",
  "/api/v1/customer-wallet/{customerId}/transactions/{transactionId}": "payment-wallet.customer-wallet.view",
  "/api/v1/booking/commission/settings": "booking-finance.view",
  "/api/v1/vendor/finance/wallet/transactions": "booking-finance.wallet.view",
  "/api/v1/vendor/finance/wallet/transactions/{id}": "booking-finance.wallet.view",
};
for (const [path, permission] of Object.entries(resourcePermissionByPath)) {
  const isRefundCreate = path === "/api/v1/refunds";
  const methods = path === "/api/v1/refunds"
    ? ["get", "post"]
    : path === "/api/v1/booking/commission/settings"
      ? ["get", "put"]
      : ["get"];
  for (const method of methods) {
    const parameters = method === "get" && [
      "/api/v1/payments",
      "/api/v1/payments/summary",
      "/api/v1/payments/transactions",
      "/api/v1/refunds",
      "/api/v1/refunds/summary",
      "/api/v1/customer-wallet",
      "/api/v1/customer-wallet/transactions",
      "/api/v1/customer-wallet/{customerId}/transactions",
      "/api/v1/vendor/finance/wallet/transactions",
    ].includes(path) ? paymentWalletQueryParameters : [];
    const operation: Record<string, unknown> = {
      summary: method === "post" ? "Create a real Razorpay refund for a completed payment" : `Get ${path.split("/").filter(Boolean).pop()} Payment & Wallet data`,
      description: path.startsWith("/api/v1/vendor/")
        ? `Requires an authenticated vendor and the ${permission} permission. Data is scoped to the authenticated vendor.`
        : path.startsWith("/api/v1/refunds")
          ? `Requires an authenticated administrator and the ${permission} permission. Seeded development fixtures are marked with developmentRecord: true.`
          : `Requires an authenticated administrator and the ${permission} permission.`,
      tags: ["Payment & Wallet"],
      security: [{ bearerAuth: [] }],
      parameters: [
        ...(path.includes("{reference}") ? [{ name: "reference", in: "path", required: true, schema: { type: "string" } }] : []),
        ...(path.includes("{customerId}") ? [{ name: "customerId", in: "path", required: true, schema: { type: "string", format: "uuid" } }] : []),
        ...(path.includes("{transactionId}") ? [{ name: "transactionId", in: "path", required: true, schema: { type: "string", format: "uuid" } }] : []),
        ...(path.includes("{id}") ? [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }] : []),
        ...parameters,
      ],
      responses: {
        "200": { description: "Successful operation" },
        "201": { description: "Refund submitted to Razorpay" },
        "400": { description: "Validation error" },
        "401": { description: "Unauthorized" },
        "403": { description: "Permission denied" },
        "404": { description: "Resource not found" },
        "409": { description: "Refund request requires reconciliation or violates idempotency" },
        "422": { description: "Payment cannot be refunded or refund amount is invalid" },
        "502": { description: "Razorpay did not confirm the refund" },
      },
    };
    if (isRefundCreate && method === "post") {
      operation.requestBody = {
        required: true,
        content: { "application/json": { schema: { type: "object", required: ["paymentReference", "reason", "idempotencyKey"], properties: {
          paymentReference: { type: "string", description: "Payment ID or gateway payment reference" },
          amount: { type: "number", exclusiveMinimum: 0, description: "Refund amount in INR; defaults to remaining refundable balance" },
          reason: { type: "string", minLength: 3, maxLength: 500 },
          idempotencyKey: { type: "string", minLength: 8, maxLength: 100 },
        } } } },
      };
    }
    additionalOpenapiPaths[path] ??= {};
    additionalOpenapiPaths[path][method] = operation;
  }
}
additionalOpenapiPaths["/api/v1/booking/commission/settings"].put = {
  summary: "Update the effective-dated global booking commission rule",
  tags: ["Booking Finance"],
  security: [{ bearerAuth: [] }],
  parameters: [],
  requestBody: {
    required: true,
    content: { "application/json": { schema: { type: "object", required: ["commissionType", "commissionValue"], properties: commissionBody } } },
  },
  responses: { "200": { description: "Commission settings updated; existing booking finance snapshots are retained" }, "400": { description: "Validation error" }, "401": { description: "Unauthorized" }, "403": { description: "Permission denied" } },
};
