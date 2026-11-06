# WhatsApp API

The module is mounted below `/api/v1` and uses the existing JWT bearer authentication. Admin routes require `ADMIN` or `SUPER_ADMIN`; vendor data is scoped from the authenticated user through owned salons and branches.

## Main resources

- Vendor: `/whatsapp/connections`, `/whatsapp/contacts`, `/whatsapp/templates`, `/whatsapp/campaigns`, `/whatsapp/campaigns/preview`, `/whatsapp/messages/send`, `/whatsapp/pricing/estimate`, `/whatsapp/billing`, `/whatsapp/dashboard`
- Admin: `/admin/whatsapp/config`, `/admin/whatsapp/connections`, `/admin/whatsapp/templates`, `/admin/whatsapp/campaigns`, `/admin/whatsapp/pricing`, `/admin/whatsapp/usage`, `/admin/whatsapp/billing`, `/admin/whatsapp/messages`, `/admin/whatsapp/dashboard`
- Meta webhook: `GET|POST /api/v1/whatsapp/webhook`

Use `Idempotency-Key` on message and campaign creation. Secrets are encrypted with `WHATSAPP_ENCRYPTION_KEY` and never serialized in responses. Templates require both application `status=APPROVED` and provider `providerStatus=APPROVED` before sending. Marketing recipients must be `OPTED_IN`; STOP, UNSUBSCRIBE, CANCEL, and REMOVE opt contacts out.

## Isolated WhatsApp billing

Admin pricing rows support `costPerMessage`, optional `campaignCharge`, `currency`, `effectiveFrom`, `effectiveTo`, and `active`. Campaign creation snapshots the effective rate and fixed charge; later pricing edits do not change campaign estimates or actual charges. Preview estimates count eligible opted-in contacts from the selected salon/branch in the backend.

Actual WhatsApp usage is recorded only after the provider accepts a message. Failed and never-submitted messages are not billable. Campaign billing records are usage calculations (`CALCULATED`), not payment receipts: this module has no WhatsApp payment collection, so paid amount remains zero and calculated charges remain outstanding until another payment system records collection. WhatsApp billing never reads, reserves, debits, refunds, or updates Vendor Wallet balances or ledgers.

The Redis-backed job consumer runs as a separate process: `npm run worker:whatsapp`. Configure Redis and keep that worker running alongside the API to process queued campaigns and messages. The API returns `WHATSAPP_QUEUE_UNAVAILABLE` rather than accepting new jobs when Redis cannot accept them.

## Meta setup

1. Create a Meta app and WhatsApp Business account.
2. Configure `APP_PUBLIC_URL/api/v1/whatsapp/webhook` as the callback.
3. Store the verify token and webhook secret through the admin config API.
4. Configure the phone number ID, business account ID, access token, and API version.
5. Set `WHATSAPP_PROVIDER=mock` for local tests to avoid real sends.

Swagger UI is available at `/api-docs/` after the server starts.
