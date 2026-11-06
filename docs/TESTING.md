# Automated API Testing Guide

## 1. Running the Test Suite

The test suite runs using the built-in Node.js 24 test runner (`node:test`) and requires zero external runners or daemons.

### Run All Tests
```bash
npm test
```
This compiles TypeScript (`npm run build`) and executes:
1. `tests/whatsapp.test.js`: WhatsApp encryption, phone number normalization, exponential backoffs, template counts.
2. `tests/api.test.js`: Integration tests against the live Express application, testing Auth, Validation, RBAC, Parameters, GST calculations, and File Uploads.

### Run OpenAPI Documentation Completeness Check
```bash
npm run docs:check
```
Verifies that 100% of registered routes and HTTP methods are fully documented in OpenAPI 3.0 (Target: 0 undocumented endpoints).

---

## 2. Test Architecture

- **Test Fixtures**: Located at `tests/fixtures/sample-data.json`. Contains valid and invalid request payloads for users, salons, bookings, and leads.
- **Test Factories**: Located at `tests/factories/auth.factory.js`. Provides helper functions:
  - `generateTestToken(userId, roles)`: Generates a valid signed JWT for any user and role.
  - `generateExpiredToken(userId, roles)`: Generates an expired token for negative authorization testing.
- **In-Process Testing**: `tests/api.test.js` binds the Express `app` to an ephemeral port (`port: 0`), preventing port collision and guaranteeing clean teardown in `test.after()`.

---

## 3. Test Coverage Areas

1. **System & OpenAPI Docs**:
   - `GET /health` returns 200 OK
   - `GET /api-docs.json` returns valid OpenAPI 3.0 specification with domain schemas
2. **Authentication & Validation Layer**:
   - Missing login credentials return HTTP 400 with field errors
   - Invalid email formats return HTTP 400
   - Invalid register payloads return HTTP 400
3. **Security & Role Enforcement**:
   - Unauthenticated access to protected routes returns HTTP 401
   - Malformed JWT token returns HTTP 401
   - Expired JWT token returns HTTP 401
   - Forbidden role access (e.g. CUSTOMER trying to access admin endpoints) returns HTTP 403
4. **Parameter Validation**:
   - Non-UUID route params return HTTP 400 `ValidationError` with `errors: [{ field: "id", ... }]`
   - Empty customer search query returns HTTP 400
5. **Leads Validation**:
   - Empty name, invalid email, or invalid phone returns HTTP 400
6. **GST Calculation Unit Verification**:
   - Verifies 9% CGST + 9% SGST calculations and discounts
   - Verifies 18% IGST interstate calculations
7. **File Upload Safety**:
   - Path traversal folder sanitization
   - Missing upload file returns HTTP 400

