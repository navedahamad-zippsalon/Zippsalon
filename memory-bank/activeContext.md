# Active context

**Current focus** (one short paragraph):

Vendor menu authorization now resolves the active subscription through the shared subscription service, intersects plan-mapped permissions with RBAC permissions, and protects authenticated menu caching.

**In progress**:

- [x] Implement subscription-aware menu filtering and fetchAll hardening
- [x] Add idempotent feature-permission schema and seed mapping
- [x] Apply migrations and verify live subscription, feature, menu, and plan-restriction responses

**Decisions (recent)**:

- Added `SubscriptionFeaturePermission` as the explicit plan-feature to RBAC bridge.
- Enterprise onboarding remains idempotent and no longer has an all-menus fallback.
- Canonical subscription status is now returned as `ACTIVE`/`TRIALING`/`INACTIVE`; duplicate legacy Free codes are preserved as inactive history.
- AI image generation now validates Stability configuration and returns actionable provider errors instead of generic 500 responses.
- RBAC now intersects role permissions with active vendor plan permissions, supports reusable plan-bound roles, and exposes Access Control APIs.
- Customer accounts now use OTP authentication, explicit CUSTOMER permissions, isolated customer APIs, and customer-safe catalog access.

**Open questions**:

-

_Update when the task or branch focus changes._
