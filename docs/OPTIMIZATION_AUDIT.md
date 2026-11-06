# Zipp Salon Backend Optimization Audit

Date: 2026-09-05

## Baseline

- `npm run build`: passed.
- `npm test`: passed (7 existing WhatsApp tests).
- `npm run dev`: starts successfully.
- `GET /health`: returns `{ "status": "OK" }`.
- Database schema and migration state were not changed by this audit.
- No frontend source project exists in this workspace, so frontend compilation is not available here.

## Application Shape

- Entry: `src/server.ts`, `src/app.ts`
- API prefix: `/api/v1`
- Route groups: auth, users, leads, master, salons, admin, staff, upload, services, customers, bookings, gst, inventory, feed, generate, rbac, dashboard, whatsapp.
- Infrastructure: Prisma, Redis/ioredis, Winston, Swagger UI.
- Validation: Zod exists in auth, salon, staff, service, customer, feed, inventory, WhatsApp, and RBAC modules; coverage is not uniform across all routes.
- Authentication: JWT bearer middleware in `auth.middleware.ts`.
- Authorization: role middleware, permission middleware, salon access middleware, and RBAC service.
- Uploads: Multer routes plus base64 image helper.
- External integrations: generative image API and Meta WhatsApp provider.

## Findings

### High priority

1. Global error handling logs complete error objects and stack traces and returns raw `err.message`; this can expose implementation details. Prisma/JWT/application error mapping is not centralized.
2. Redis is optional in practice but several paths assume a live connection. Unconfigured Redis must remain a no-op/fallback without repeated connection errors.
3. Most route parameters, queries, and request bodies are not validated at route boundaries. Several services validate ad hoc with `any` payloads.
4. Multiple services instantiate `PrismaClient` instead of reusing the shared infrastructure client, increasing connection pressure.

### Medium priority

1. Swagger UI is available, but there is no `/api-docs.json` endpoint and reusable OpenAPI response/schema components are minimal.
2. Request correlation IDs and response timing are not consistently available in logs.
3. CORS and JSON body limits are implicit rather than environment-configured.
4. File/base64 upload validation should enforce decoded size/type and reject malformed data before writing.
5. Existing controllers use mixed error response styles; refactors must preserve their existing successful response bodies.
6. Pagination/query defaults are implemented independently in modules.

### Low priority

1. Dead imports and broad `any` types remain in legacy modules.
2. Some independent reads can be parallelized, but query-shape changes need response-contract tests first.
3. Complete endpoint documentation and API inventory are incomplete.

## Compatibility Constraints

- Existing route URLs, HTTP methods, auth behavior, role meaning, database models, migration history, and response bodies are preserved.
- No migration is part of this optimization pass.
- Changes should be additive middleware/utilities or narrowly scoped internal fixes with executable regression checks.
