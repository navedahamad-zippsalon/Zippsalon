# Payment & Wallet demo data

This seed is for a development or test database only. It refuses `NODE_ENV=production` and requires an explicit opt-in. It is additive and scoped to `vendor@example.com`: it uses that account's existing root salon, one of its existing branches/staff if present, and its salon-linked customers. It creates the vendor, salon, service, or customer accounts only when needed; it does not modify existing account profiles. It does not import global dashboard data, create customer wallet credits, call Razorpay, create payouts, or simulate settlement transitions.

## Seed

Configure a non-production `DATABASE_URL`, then set the opt-in in the shell where the command runs:

```powershell
$env:NODE_ENV = "development"
$env:ALLOW_PAYMENT_WALLET_DEMO_SEED = "true"
npm run seed:payment-wallet-demo
```

The seed creates four refunded and four completed bookings plus one pending-payment and one failed-payment booking for the target vendor. Its booking payments, refund rows, and booking-finance transactions are tied to those bookings and the target vendor. Pending/failed bookings stay unpaid, and do not receive finance rows. Finance entries are created through the existing booking-finance service, which records the gross amount as pending and calculates commission and vendor payable from the active commission rule. If no active rule exists, the seed temporarily enables its own 20% demo rule inside the transaction and restores that rule's prior active/effective settings before commit. No unrelated commission rule is changed.

The JSON reports target-salon fixture counts, payment/refund/finance counts, pending and failed payment counts, newly created finance transactions, wallet balances, and explicitly reports zero customer-wallet transactions created. Reruns reuse marker-tagged records. Run focused, database-free checks with `npm run test:payment-wallet-seed`.

The seed intentionally does not create settlement history. The service's settlement invariant is more than inserting a `VendorSettlement`: it requires approved finance transactions in `ELIGIBLE` state, debits the vendor's `availableBalance`, credits `processingBalance`, writes two matching wallet-ledger entries, transitions the linked finance rows to `PROCESSING`, and records an audit event. The normal initiation path also requires global platform payout credentials and a verified vendor payout account, then submits an external RazorpayX payout. Fabricating a `PAID` or in-flight settlement would therefore either misstate external payout history or require directly synthesizing state outside the service invariants; this development seed leaves balances and settlement settings untouched instead.

## Reset

The existing `reset:payment-wallet-demo` command is destructive and is not part of the seed workflow described above. Review its deletion scope and select a non-production database before using it. Never point seed/reset commands at production.
