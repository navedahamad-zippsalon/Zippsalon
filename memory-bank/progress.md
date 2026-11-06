# Progress

**What works**

- Backend TypeScript build passes after subscription-aware menu changes.
- Existing automated suite: 33 passed, 0 failed, including vendor onboarding.
- Live verification passed for four plan codes, Enterprise current subscription, enabled features, menu authorization, Basic restrictions, and vendor fetchAll denial.

**Not started / backlog**

- Remaining older migrations are still pending in this local database and should be applied through the normal deployment process.

**Known issues**

- The subscription-permission migration is applied and the vendor demo data is provisioned successfully.
- Legacy lowercase Free was renamed to an inactive `FREE_LEGACY_*` record to preserve historical references; active references were moved to canonical `FREE`.
- `/generate/image` returns `503 AI_PROVIDER_NOT_CONFIGURED` when `STABILITY_API_KEY` is absent; build and all 33 tests pass.
- Added plan-bound roles, normalized plan permissions, effective permission cache invalidation, Access Control endpoints, and Free/Enterprise compatibility mappings.
- Applied `20260915100000_add_plan_bound_roles` and `20260915101000_add_plan_permissions`; older unrelated migrations remain pending locally.
- Applied `20260915110000_add_customer_otp`; customer inventory/accounts seed is idempotent and full regression suite passes 33/33.

_Keep bullets factual and small; link issues or PRs when useful._
