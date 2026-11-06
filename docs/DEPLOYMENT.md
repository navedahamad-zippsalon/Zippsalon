# Production Deployment & Environment Guide

## 1. Environment Variable Validation (`src/config/env.ts`)

All environment variables are validated at process boot via Zod. If any required variable is missing or malformed, the process exits immediately with a descriptive error before connecting to external services.

| Variable | Type | Default | Required in Production | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development \| production \| test` | `development` | Yes | Application environment mode |
| `PORT` | `integer` | `4000` | No | HTTP listening port |
| `DATABASE_URL` | `string` | - | **Yes** | PostgreSQL connection URL |
| `JWT_SECRET` | `string` | - | **Yes** | Secret used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | `string` | `7d` | No | JWT access token expiration duration |
| `REDIS_URL` | `string` | `redis://localhost:6379` | No | Redis connection URI for caching and locks |
| `WHATSAPP_ENCRYPTION_KEY` | `string` | - | **Yes** | 32-character AES-256 secret for token encryption |

---

## 2. Build & Start Commands

### Production Build
```bash
npm run build
```

### Production Process Start
```bash
npm start
```
Starts `dist/server.js`.

### Verify Documentation Completeness
```bash
npm run docs:check
```

### Run Tests Before Deployment
```bash
npm test
```

---

## 3. Production Safety Rules

1. **Never Run `npx prisma db seed` Against Production**:
   `prisma/seed.ts` contains an explicit check:
   ```typescript
   if (process.env.NODE_ENV === "production") {
       console.error("CRITICAL: Refusing to run seed in production environment!");
       process.exit(1);
   }
   ```
2. **Never Run `prisma db push` or `prisma migrate reset` Against Production**:
   Always apply versioned migrations using `npx prisma migrate deploy`.
3. **Always Run Behind a Reverse Proxy (Nginx / Cloudflare)**:
   Ensure HTTPS termination and standard security headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`).

