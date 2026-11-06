# Pre-Seeded Test Accounts & Credentials

The seed script (`prisma/seed.ts`) populates a rich, realistic test environment for local development and QA testing.

---

## 1. Test Accounts Credentials

All standard test accounts share the unified password: **`Admin@12345`**

| Role | Email | Password | Scope / Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@zippsalon.com` / `admin@example.test` | `Admin@123` / `Admin@12345` | Global admin with all 95 platform permissions |
| **Salon Owner** | `owner@example.test` | `Admin@12345` | Head office salon owner (`Luxe Glamour Salon HO`) |
| **Branch Manager** | `manager@example.test` | `Admin@12345` | Branch outlet manager |
| **Staff / Stylist** | `staff@example.test` | `Admin@12345` | Generic stylist account |
| **Customer** | `customer@example.test` | `Admin@12345` | Demo client for booking flow testing |

---

## 2. Seeded Staff Accounts with Granular Access Control Limits (`npm run seed:dummy`)

Each staff member below is configured with specific **Staff Roles** and permission boundaries for testing authorization and access limits:

| Staff Name & Role | Email | Password | Allowed Access (Permitted) | Restricted / Blocked (Denied) |
| :--- | :--- | :--- | :--- | :--- |
| **Priya Sharma**<br>*(Front Desk Receptionist)* | `receptionist@zippsalon.com` | **`Staff@123`** | • `bookings.view`, `bookings.create`, `bookings.edit`<br>• `customers.view`, `customers.create`, `customers.edit`<br>• `attendance.view`, `attendance.create`<br>• `services.view`, `categories.view`<br>• `leads.view`, `leads.create`, `leads.edit` | 🔒 **BLOCKED**:<br>• `inventory.*` (No inventory access)<br>• `salons.*` & `branch.*` (No salon settings)<br>• `staff.*` (Cannot manage or view staff)<br>• `access-control.*` (Cannot alter roles)<br>• `bookings.delete` (Cannot delete bookings) |
| **Vikram Malhotra**<br>*(Senior Hair Stylist)* | `stylist@zippsalon.com` | **`Staff@123`** | • `bookings.view` (View appointment schedule)<br>• `services.view`, `categories.view`<br>• `attendance.view`, `attendance.create`<br>• `feed.view`, `feed.create`, `feed.navbar` (Publish transformations to Feed) | 🔒 **BLOCKED**:<br>• `customers.*` (No customer CRM access)<br>• `inventory.*` (No stock access)<br>• `bookings.create/edit/delete` (Front-desk only)<br>• `staff.*`, `salons.*`, `access-control.*` |
| **Rahul Verma**<br>*(Store & Inventory Manager)* | `inventory@zippsalon.com` | **`Staff@123`** | • `inventory.view`, `inventory.create`, `inventory.edit`<br>• `inventory.navbar`<br>• Low-stock tracking & product variants<br>• `attendance.view`, `attendance.create` | 🔒 **BLOCKED**:<br>• `bookings.*` (No appointment access)<br>• `customers.*` (No customer CRM access)<br>• `feed.*` (No feed/social access)<br>• `staff.*`, `salons.*`, `leads.*`, `whatsapp.*` |
| **Ananya Joshi**<br>*(Junior Apprentice / Trainee)* | `trainee@zippsalon.com` | **`Staff@123`** | • `attendance.view`, `attendance.create` (Clock personal attendance)<br>• `services.view`, `categories.view` (View price guide for learning) | 🔒 **BLOCKED (Maximum Restriction)**:<br>• `bookings.*` (Forbidden)<br>• `customers.*` (Forbidden)<br>• `inventory.*` (Forbidden)<br>• `feed.*` (Forbidden)<br>• `staff.*`, `salons.*`, `leads.*`, `whatsapp.*` |

---

## 2. Additional Seeded Customer Accounts

20 customer accounts are seeded for booking and search testing:
- `customer1@example.test` through `customer20@example.test`
- Password: `Admin@12345`
- Phone numbers: `+919820000001` through `+919820000020`
- Each customer is mapped to at least one active salon.

---

## 3. Pre-Seeded Salons & Outlets

### Head Office Salons:
1. **Zipp Delhi Premium Salon** (New Delhi, PIN: 110001)
   - Branches:
     - *Zipp Delhi Premium - Saket* (PIN: 110017)
     - *Zipp Delhi Premium - Connaught Place* (PIN: 110001)
     - *Zipp Delhi Premium - Karol Bagh* (PIN: 110005)
2. **Zipp Delhi Elite Salon** (New Delhi, PIN: 110020)
   - Branches:
     - *Zipp Delhi Elite - Vasant Kunj* (PIN: 110070)
     - *Zipp Delhi Elite - Dwarka* (PIN: 110075)
3. **Zipp Jaipur Royal Salon** (Jaipur, PIN: 302001)
   - Branches:
     - *Zipp Jaipur Royal - Vaishali Nagar* (PIN: 302021)
     - *Zipp Jaipur Royal - Malviya Nagar* (PIN: 302017)
     - *Zipp Jaipur Royal - C-Scheme* (PIN: 302001)
4. **Zipp Jaipur Heritage Salon** (Jaipur, PIN: 302015)
   - Branches:
     - *Zipp Jaipur Heritage - Mansarovar* (PIN: 302020)
     - *Zipp Jaipur Heritage - Raja Park* (PIN: 302004)

---

## 4. Pre-Seeded Sample Data

- **Services**: Haircut, Express Facial, Gold Facial, Deep Tissue Massage, etc.
- **Categories**: Haircut, Facial, Massage, Demo Services.
- **Bookings**: 30 appointments across statuses (`CONFIRMED`, `CHECKED_IN`, `DONE`, `PENDING`, `CANCELLED`, `NO_SHOW`).
- **Payments**: Linked payments via UPI, Card, and Cash.
- **GST Configurations**: Active 9% CGST + 9% SGST + 18% IGST configured for all salons.
- **Leads**: 10 inquiry records across statuses (`NEW`, `CONTACTED`, `QUALIFIED`, `CONVERTED`, `REJECTED`).

