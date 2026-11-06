--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AttendanceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttendanceStatus" AS ENUM (
    'PRESENT',
    'HALF_DAY',
    'ABSENT'
);


ALTER TYPE public."AttendanceStatus" OWNER TO postgres;

--
-- Name: BookingMedium; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BookingMedium" AS ENUM (
    'IN_SALON',
    'ONLINE',
    'APP'
);


ALTER TYPE public."BookingMedium" OWNER TO postgres;

--
-- Name: BookingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BookingStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CHECKED_IN',
    'DONE',
    'CANCELLED',
    'NO_SHOW'
);


ALTER TYPE public."BookingStatus" OWNER TO postgres;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER'
);


ALTER TYPE public."Gender" OWNER TO postgres;

--
-- Name: LeadStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LeadStatus" AS ENUM (
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'CONVERTED',
    'REJECTED'
);


ALTER TYPE public."LeadStatus" OWNER TO postgres;

--
-- Name: PaymentMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentMethod" AS ENUM (
    'CASH',
    'UPI',
    'CARD',
    'OTHER'
);


ALTER TYPE public."PaymentMethod" OWNER TO postgres;

--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
);


ALTER TYPE public."PaymentStatus" OWNER TO postgres;

--
-- Name: UserSource; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserSource" AS ENUM (
    'WEBSITE',
    'ADMIN'
);


ALTER TYPE public."UserSource" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Address; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Address" (
    id text NOT NULL,
    "salonId" text NOT NULL,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    state text NOT NULL,
    pincode text NOT NULL,
    country text NOT NULL
);


ALTER TABLE public."Address" OWNER TO postgres;

--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    "staffId" text NOT NULL,
    date date NOT NULL,
    status public."AttendanceStatus" NOT NULL,
    "markedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Attendance" OWNER TO postgres;

--
-- Name: Booking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Booking" (
    id text NOT NULL,
    "salonId" text NOT NULL,
    "customerId" text NOT NULL,
    "staffId" text,
    "bookingDate" timestamp(3) without time zone NOT NULL,
    status public."BookingStatus" DEFAULT 'PENDING'::public."BookingStatus" NOT NULL,
    medium public."BookingMedium" DEFAULT 'IN_SALON'::public."BookingMedium" NOT NULL,
    "totalAmount" double precision NOT NULL,
    discount double precision DEFAULT 0 NOT NULL,
    "finalAmount" double precision NOT NULL,
    "totalPaid" double precision DEFAULT 0 NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Booking" OWNER TO postgres;

--
-- Name: BookingService; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."BookingService" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    "serviceId" text,
    "comboId" text,
    name text NOT NULL,
    price double precision NOT NULL
);


ALTER TABLE public."BookingService" OWNER TO postgres;

--
-- Name: Combo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Combo" (
    id text NOT NULL,
    "salonId" text NOT NULL,
    name text NOT NULL,
    description text,
    price double precision NOT NULL,
    duration integer NOT NULL,
    "imageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Combo" OWNER TO postgres;

--
-- Name: ComboItem; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ComboItem" (
    id text NOT NULL,
    "comboId" text NOT NULL,
    "serviceId" text NOT NULL
);


ALTER TABLE public."ComboItem" OWNER TO postgres;

--
-- Name: Lead; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Lead" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    "countryCode" text DEFAULT '+1'::text NOT NULL,
    message text,
    status public."LeadStatus" DEFAULT 'NEW'::public."LeadStatus" NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Lead" OWNER TO postgres;

--
-- Name: Menu; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Menu" (
    id text NOT NULL,
    label text NOT NULL,
    icon text,
    path text,
    "parentId" text,
    "order" integer DEFAULT 0 NOT NULL,
    "showInSidebar" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Menu" OWNER TO postgres;

--
-- Name: MenuPermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MenuPermission" (
    id text NOT NULL,
    "menuId" text NOT NULL,
    "permissionId" text NOT NULL
);


ALTER TABLE public."MenuPermission" OWNER TO postgres;

--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PasswordResetToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PasswordResetToken" OWNER TO postgres;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "bookingId" text NOT NULL,
    amount double precision NOT NULL,
    method public."PaymentMethod" NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    "transactionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: Permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    action text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Permission" OWNER TO postgres;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RolePermission" (
    id text NOT NULL,
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL
);


ALTER TABLE public."RolePermission" OWNER TO postgres;

--
-- Name: Route; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Route" (
    id text NOT NULL,
    path text NOT NULL,
    method text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Route" OWNER TO postgres;

--
-- Name: RoutePermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RoutePermission" (
    id text NOT NULL,
    "routeId" text NOT NULL,
    "permissionId" text NOT NULL
);


ALTER TABLE public."RoutePermission" OWNER TO postgres;

--
-- Name: Salon; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Salon" (
    id text NOT NULL,
    name text NOT NULL,
    "ownerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "avgPrice" double precision,
    "avgWaitTime" integer,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    timings jsonb NOT NULL,
    "parentId" text,
    "isProfileCompleted" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Salon" OWNER TO postgres;

--
-- Name: SalonContact; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SalonContact" (
    id text NOT NULL,
    "salonId" text NOT NULL,
    phone text NOT NULL,
    "countryCode" text NOT NULL,
    email text,
    "isPrimary" boolean DEFAULT false NOT NULL,
    "isWhatsapp" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."SalonContact" OWNER TO postgres;

--
-- Name: SalonCustomer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SalonCustomer" (
    id text NOT NULL,
    "salonId" text NOT NULL,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SalonCustomer" OWNER TO postgres;

--
-- Name: SalonImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SalonImage" (
    id text NOT NULL,
    "salonId" text NOT NULL,
    url text NOT NULL
);


ALTER TABLE public."SalonImage" OWNER TO postgres;

--
-- Name: SalonStaff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SalonStaff" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "salonId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    role text,
    "createdById" text,
    "staffRoleId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "updatedById" text
);


ALTER TABLE public."SalonStaff" OWNER TO postgres;

--
-- Name: Service; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Service" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "categoryId" text,
    "basePrice" double precision NOT NULL,
    "baseDuration" integer NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdById" text,
    "salonId" text NOT NULL,
    "updatedById" text
);


ALTER TABLE public."Service" OWNER TO postgres;

--
-- Name: ServiceCategory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceCategory" (
    id text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."ServiceCategory" OWNER TO postgres;

--
-- Name: ServiceImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ServiceImage" (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    url text NOT NULL
);


ALTER TABLE public."ServiceImage" OWNER TO postgres;

--
-- Name: StaffRole; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StaffRole" (
    id text NOT NULL,
    "salonId" text,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StaffRole" OWNER TO postgres;

--
-- Name: StaffRolePermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."StaffRolePermission" (
    id text NOT NULL,
    "staffRoleId" text NOT NULL,
    "permissionId" text NOT NULL
);


ALTER TABLE public."StaffRolePermission" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text,
    email text NOT NULL,
    phone text NOT NULL,
    password text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    dob timestamp(3) without time zone,
    gender public."Gender",
    "countryCode" text NOT NULL,
    source public."UserSource" DEFAULT 'ADMIN'::public."UserSource" NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserRole" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "roleId" text NOT NULL
);


ALTER TABLE public."UserRole" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: Address; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Address" (id, "salonId", line1, line2, city, state, pincode, country) FROM stdin;
1b00bd72-4e83-4f2f-a235-005fc91daf79	bcc2a7e5-5120-4a7a-bd66-81c8a63df727	HO Address, New Delhi	\N	New Delhi	Delhi	110001	India
15948cef-3421-478b-ace3-a8bb5c3e37a3	b55204b8-006a-4916-9318-74a89874046d	Saket Market	\N	New Delhi	Delhi	110017	India
34ce69f9-b33a-4024-be63-a2b7d1454a2b	c49b3f21-9f67-443c-bca4-612759dd0ca8	Connaught Place Market	\N	New Delhi	Delhi	110001	India
69ee6284-b307-423d-a7d2-5139b094d115	c646e3b8-1c0a-4651-bcdf-453d01c550d9	Karol Bagh Market	\N	New Delhi	Delhi	110005	India
628dbb6f-f4c2-4c36-baee-5012cbad907c	0db7ebcd-8710-46f7-9026-c48fe5c3673d	HO Address, New Delhi	\N	New Delhi	Delhi	110020	India
4713a05b-01c5-4416-9d0b-b76ef1d7fa36	5525e891-c9b2-435b-8eec-eb9927db5f54	Vasant Kunj Market	\N	New Delhi	Delhi	110070	India
64433d3d-2b0c-4c5d-b9c6-a1d2f5068479	44dca150-9f6e-4890-8ad4-c48ff35bcacf	Dwarka Market	\N	New Delhi	Delhi	110075	India
efc0ce59-59e0-4b2a-92c2-18b55f3c6f09	f0c549c4-50cb-47ec-ab2d-032e2a0366d5	HO Address, Jaipur	\N	Jaipur	Rajasthan	302001	India
aecec3b3-204e-4c10-87f5-cc8477620574	c6c65ec1-182a-4256-93e7-823d71f0cb41	Vaishali Nagar Market	\N	Jaipur	Rajasthan	302021	India
1fc87831-2899-4d7a-87fb-78c2883c4a0b	4a36c6da-67be-497d-b083-228d82002415	Malviya Nagar Market	\N	Jaipur	Rajasthan	302017	India
f64b563a-8668-460e-afe8-282be746c364	9021a2b9-ce6f-4611-a4e1-3ec78d145e74	C-Scheme Market	\N	Jaipur	Rajasthan	302001	India
4853a9fc-b7c0-44b8-a526-2485aed77c92	f508ebe0-c046-427e-b638-902b144f0bb9	HO Address, Jaipur	\N	Jaipur	Rajasthan	302015	India
00a2d37c-54d4-4e2c-9630-8e36e1a7693e	6dd02bde-a7b8-4930-b6f5-28ec60164352	Mansarovar Market	\N	Jaipur	Rajasthan	302020	India
f6758755-e338-4532-a5cd-f9a17b80c88b	d208ba95-a7da-4a40-9610-ffdbe58121de	Raja Park Market	\N	Jaipur	Rajasthan	302004	India
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Attendance" (id, "staffId", date, status, "markedById", "createdAt", "updatedAt") FROM stdin;
5a4cd87e-5447-4892-9945-c124b1cac43a	91ef7731-42c2-4c04-b5c1-1f98a7586862	2026-08-26	PRESENT	dc3a8c49-f397-4152-80f5-2632047cc0f0	2026-08-26 08:15:17.523	2026-08-26 08:15:26.83
d20311e8-c94f-4979-b502-596c22b03553	dd0b82f0-a7c3-4fc8-99e9-f138a48916e8	2026-08-26	PRESENT	dc3a8c49-f397-4152-80f5-2632047cc0f0	2026-08-26 08:15:30.298	2026-08-26 08:15:30.298
d209d7ea-e030-4a9a-932f-9e044dd5c10b	9f2980b4-6a27-46e7-8621-c7acdf06c9a0	2026-08-26	PRESENT	dc3a8c49-f397-4152-80f5-2632047cc0f0	2026-08-26 08:15:33.97	2026-08-26 08:15:33.97
\.


--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Booking" (id, "salonId", "customerId", "staffId", "bookingDate", status, medium, "totalAmount", discount, "finalAmount", "totalPaid", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BookingService; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BookingService" (id, "bookingId", "serviceId", "comboId", name, price) FROM stdin;
\.


--
-- Data for Name: Combo; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Combo" (id, "salonId", name, description, price, duration, "imageUrl", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ComboItem; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ComboItem" (id, "comboId", "serviceId") FROM stdin;
\.


--
-- Data for Name: Lead; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Lead" (id, name, email, phone, "countryCode", message, status, metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Menu; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Menu" (id, label, icon, path, "parentId", "order", "showInSidebar", "createdAt", "updatedAt") FROM stdin;
2324be74-f540-4a73-b524-a1ba9bcd4f0e	Dashboard	LayoutDashboard	/dashboard	\N	1	t	2026-08-26 07:57:08.466	2026-08-26 07:57:08.466
d2ee2643-8b99-4a1b-b5cf-648dde2c1fe0	Salons	Store	/salons	\N	2	t	2026-08-26 07:57:08.472	2026-08-26 07:57:08.472
437d0346-59d7-4df2-b6cb-25d0a28d767d	Branches	GitBranch	/branch	\N	3	t	2026-08-26 07:57:08.484	2026-08-26 07:57:08.484
d74b6d2a-0e17-4ecd-8f24-ca52aa9aa896	Staff	Users	/staff	\N	4	t	2026-08-26 07:57:08.495	2026-08-26 07:57:08.495
926cafa1-4581-41e4-a1b8-0ba6675ae0bf	Attendance	CalendarCheck	/attendance	\N	5	t	2026-08-26 07:57:08.503	2026-08-26 07:57:08.503
5feb0204-b35e-4bfd-bfe2-7832008cf96c	Services	Scissors	/services	\N	6	t	2026-08-26 07:57:08.513	2026-08-26 07:57:08.513
0949f7d2-dc5a-466d-889b-45acdc26efc8	Categories	Tags	/categories	\N	7	t	2026-08-26 07:57:08.522	2026-08-26 07:57:08.522
62baf66f-95d3-4385-9a87-66b19a965fac	Customers	UserGroup	/customers	\N	8	t	2026-08-26 07:57:08.531	2026-08-26 07:57:08.531
e79dd3a0-5e5a-4098-94d8-2ffa3d7825e8	Bookings	Calendar	/bookings	\N	9	t	2026-08-26 07:57:08.54	2026-08-26 07:57:08.54
131c66c6-ec60-47be-a20d-27ffcf897102	Leads	UserPlus	/leads	\N	10	t	2026-08-26 07:57:08.549	2026-08-26 07:57:08.549
f6d268c0-54b8-4f72-981d-fcfb4dceaad5	Access Control	Shield	/access-control	\N	11	t	2026-08-26 07:57:08.558	2026-08-26 07:57:08.558
8f6a2841-dde7-4607-8546-d4391796f609	Settings	Settings	/settings	\N	12	t	2026-08-26 07:57:08.567	2026-08-26 07:57:08.567
\.


--
-- Data for Name: MenuPermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MenuPermission" (id, "menuId", "permissionId") FROM stdin;
a337741d-b5e5-464d-a2e6-2a53aa7dd8c7	d2ee2643-8b99-4a1b-b5cf-648dde2c1fe0	abe4b12d-4f45-4948-a4f3-3534b89d5ee1
5f406954-f133-49b1-b40d-5ef53f0ccdee	437d0346-59d7-4df2-b6cb-25d0a28d767d	d74fe958-d77a-43ef-b71e-71e9cf953de1
1b233939-161e-41af-848a-3148fa847120	d74b6d2a-0e17-4ecd-8f24-ca52aa9aa896	e531b0f0-7648-4a80-9c4e-92ce76983e70
dcadf445-b2f5-4422-905b-8b5137d87041	926cafa1-4581-41e4-a1b8-0ba6675ae0bf	8eb9be26-50f6-486c-9959-1778b6a487fa
f21971f2-7db0-4b9b-9241-3f78159a1ec7	5feb0204-b35e-4bfd-bfe2-7832008cf96c	b8b25a5c-458d-47b3-bf49-bdd52fad49f0
7d26f67e-f103-4ee5-9ad9-ccf7ef104561	0949f7d2-dc5a-466d-889b-45acdc26efc8	fc057fbf-adc2-464a-91b6-2797533c1ccf
3b44122f-30e2-4cc0-a68c-6d26e1409d81	62baf66f-95d3-4385-9a87-66b19a965fac	29347b03-bdee-4b9e-b013-8a2564a07b90
2ce50f5d-a7c0-4805-b836-f75856a48625	e79dd3a0-5e5a-4098-94d8-2ffa3d7825e8	d41f7fc5-4eb5-47e0-861a-95f395d6fb39
9f8dbb94-08d0-4b14-b627-976900e6089a	131c66c6-ec60-47be-a20d-27ffcf897102	ecccbce5-3c95-4b19-93e6-f0f4886fe659
3c398a16-c52c-45c4-a476-44472c7fc3a6	f6d268c0-54b8-4f72-981d-fcfb4dceaad5	e449bb59-b7e7-4b07-bbd6-d14a33713957
500beab4-854f-4467-9a79-30d91a9dad3f	8f6a2841-dde7-4607-8546-d4391796f609	cc2851f8-3ab0-4142-bc37-40af2c3a21d1
\.


--
-- Data for Name: PasswordResetToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PasswordResetToken" (id, token, "userId", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "bookingId", amount, method, status, "transactionId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Permission" (id, action, description, "createdAt", "updatedAt") FROM stdin;
3a265d4f-6c1f-4dcd-9c81-80d5436eb1ca	dashboard.view	View Dashboard	2026-08-26 07:57:07.949	2026-08-26 07:57:07.949
abe4b12d-4f45-4948-a4f3-3534b89d5ee1	salons.view	View Salons	2026-08-26 07:57:07.952	2026-08-26 07:57:07.952
ae971300-d39b-4095-9ca3-87b74eabe9cd	salons.create	Create Salons	2026-08-26 07:57:07.956	2026-08-26 07:57:07.956
85b5d28f-dac6-4d0a-8105-dc45f6325d12	salons.edit	Edit Salons	2026-08-26 07:57:07.959	2026-08-26 07:57:07.959
ae7d2b9d-4b8b-402b-892f-b7fc3aac95d1	salons.delete	Delete Salons	2026-08-26 07:57:07.963	2026-08-26 07:57:07.963
d74fe958-d77a-43ef-b71e-71e9cf953de1	branch.view	View Branches	2026-08-26 07:57:07.965	2026-08-26 07:57:07.965
c44f6f4d-0ed1-4348-8cb6-80bb8cc83591	branch.create	Create Branches	2026-08-26 07:57:07.968	2026-08-26 07:57:07.968
a496d4cc-a09c-4f11-a50c-516f950d4ec8	branch.edit	Edit Branches	2026-08-26 07:57:07.972	2026-08-26 07:57:07.972
bac51a5c-aa87-450d-88f2-6a4cc0b9ecfb	branch.delete	Delete Branches	2026-08-26 07:57:07.976	2026-08-26 07:57:07.976
e531b0f0-7648-4a80-9c4e-92ce76983e70	staff.view	View Staff	2026-08-26 07:57:07.979	2026-08-26 07:57:07.979
461372bf-e4ec-4473-a50a-da2e7c7d057f	staff.create	Create Staff	2026-08-26 07:57:07.982	2026-08-26 07:57:07.982
890350fb-5705-4df0-ae15-7c1efe119a53	staff.edit	Edit Staff	2026-08-26 07:57:07.984	2026-08-26 07:57:07.984
1af99382-dc27-44af-b39d-4d60c3bd3f8c	staff.delete	Delete Staff	2026-08-26 07:57:07.988	2026-08-26 07:57:07.988
8eb9be26-50f6-486c-9959-1778b6a487fa	attendance.view	View Attendance	2026-08-26 07:57:07.993	2026-08-26 07:57:07.993
af43b013-8775-4fc8-a2ae-749f91eb41cc	attendance.create	Create Attendance	2026-08-26 07:57:07.996	2026-08-26 07:57:07.996
64bb8e41-b4a0-48f5-a3f6-bdc05e8bf159	attendance.edit	Edit Attendance	2026-08-26 07:57:07.999	2026-08-26 07:57:07.999
7bc2535a-9b78-40f2-8357-c768f96b00f1	attendance.delete	Delete Attendance	2026-08-26 07:57:08.002	2026-08-26 07:57:08.002
b8b25a5c-458d-47b3-bf49-bdd52fad49f0	services.view	View Services	2026-08-26 07:57:08.008	2026-08-26 07:57:08.008
d120ce7d-4633-40df-a1f0-c61cd1c4887b	services.create	Create Services	2026-08-26 07:57:08.012	2026-08-26 07:57:08.012
d0de3b51-25f7-4aa7-89cd-e0a64141ade7	services.edit	Edit Services	2026-08-26 07:57:08.015	2026-08-26 07:57:08.015
5ebe63a6-fa48-4448-b207-4e1dde61e27d	services.delete	Delete Services	2026-08-26 07:57:08.018	2026-08-26 07:57:08.018
fc057fbf-adc2-464a-91b6-2797533c1ccf	categories.view	View Categories	2026-08-26 07:57:08.023	2026-08-26 07:57:08.023
32bb00b6-97fd-4b35-a54c-7956596b7627	categories.create	Create Categories	2026-08-26 07:57:08.027	2026-08-26 07:57:08.027
a2a0514c-8283-48dc-969b-ae96b8b2eceb	categories.edit	Edit Categories	2026-08-26 07:57:08.03	2026-08-26 07:57:08.03
b4caa165-0585-4a4f-97e0-dd5b2bc4c7ff	categories.delete	Delete Categories	2026-08-26 07:57:08.032	2026-08-26 07:57:08.032
29347b03-bdee-4b9e-b013-8a2564a07b90	customers.view	View Customers	2026-08-26 07:57:08.035	2026-08-26 07:57:08.035
e550a527-9252-4743-86ba-0819833ce0cb	customers.create	Create Customers	2026-08-26 07:57:08.04	2026-08-26 07:57:08.04
188b82a9-3cbb-4c08-8220-6271b56ac736	customers.edit	Edit Customers	2026-08-26 07:57:08.043	2026-08-26 07:57:08.043
16482799-c981-428c-a568-83c837fdb88b	customers.delete	Delete Customers	2026-08-26 07:57:08.047	2026-08-26 07:57:08.047
d41f7fc5-4eb5-47e0-861a-95f395d6fb39	bookings.view	View Bookings	2026-08-26 07:57:08.05	2026-08-26 07:57:08.05
af527293-f600-4108-98f8-185e125b9b4c	bookings.create	Create Bookings	2026-08-26 07:57:08.054	2026-08-26 07:57:08.054
da891a31-cb85-483b-8714-a8525bb5762e	bookings.edit	Edit Bookings	2026-08-26 07:57:08.06	2026-08-26 07:57:08.06
6ef61283-991b-4dbd-a4fd-7c19724e6908	bookings.delete	Delete Bookings	2026-08-26 07:57:08.064	2026-08-26 07:57:08.064
ecccbce5-3c95-4b19-93e6-f0f4886fe659	leads.view	View Leads	2026-08-26 07:57:08.067	2026-08-26 07:57:08.067
b2a5e5b0-020f-448f-b83d-b38e7f665ae9	leads.create	Create Leads	2026-08-26 07:57:08.071	2026-08-26 07:57:08.071
c80f2a2b-f771-46e7-99ce-649a1be4083e	leads.edit	Edit Leads	2026-08-26 07:57:08.076	2026-08-26 07:57:08.076
3c005434-8307-4d28-842c-21beb9ff160e	leads.delete	Delete Leads	2026-08-26 07:57:08.079	2026-08-26 07:57:08.079
e449bb59-b7e7-4b07-bbd6-d14a33713957	access-control.view	View Access Control	2026-08-26 07:57:08.083	2026-08-26 07:57:08.083
74cdf2c2-d411-484f-9124-c936bf26e551	access-control.create	Create Access Control	2026-08-26 07:57:08.088	2026-08-26 07:57:08.088
5e40e4e1-f097-4bb2-83cb-7f6c6e513dfb	access-control.edit	Edit Access Control	2026-08-26 07:57:08.093	2026-08-26 07:57:08.093
46990347-717e-4b06-b647-9d9afa1c3920	access-control.delete	Delete Access Control	2026-08-26 07:57:08.097	2026-08-26 07:57:08.097
cc2851f8-3ab0-4142-bc37-40af2c3a21d1	settings.view	View Settings	2026-08-26 07:57:08.101	2026-08-26 07:57:08.101
4c38e058-e584-4e5b-b774-499d30656fa8	settings.create	Create Settings	2026-08-26 07:57:08.107	2026-08-26 07:57:08.107
3a7d0116-05a7-40b8-8196-26f2b40d6e80	settings.edit	Edit Settings	2026-08-26 07:57:08.112	2026-08-26 07:57:08.112
5de51cb9-7042-4aaa-bcc5-173977c25131	settings.delete	Delete Settings	2026-08-26 07:57:08.116	2026-08-26 07:57:08.116
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name) FROM stdin;
20151234-0f5b-4368-9d9a-4b6d94077187	ADMIN
7a930c3b-2546-4295-a092-e49c3702e3df	CUSTOMER
95b1d303-28f6-4bca-a9a5-97ea3eef06ff	VENDOR
e735534f-31b5-4385-b315-19eb6c2fb572	STAFF
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RolePermission" (id, "roleId", "permissionId") FROM stdin;
a1b86084-4ef8-42ed-abf4-81f5f0b2695b	20151234-0f5b-4368-9d9a-4b6d94077187	3a265d4f-6c1f-4dcd-9c81-80d5436eb1ca
1e64f4ea-ca98-4038-8405-71e8d9eff381	20151234-0f5b-4368-9d9a-4b6d94077187	abe4b12d-4f45-4948-a4f3-3534b89d5ee1
e3717b49-6af8-4bb3-b859-c91546950201	20151234-0f5b-4368-9d9a-4b6d94077187	ae971300-d39b-4095-9ca3-87b74eabe9cd
70e09c52-9eb3-4d19-8da7-492e4d758b14	20151234-0f5b-4368-9d9a-4b6d94077187	85b5d28f-dac6-4d0a-8105-dc45f6325d12
15f4e7f0-6e53-4405-ac95-7975da9f7ed2	20151234-0f5b-4368-9d9a-4b6d94077187	ae7d2b9d-4b8b-402b-892f-b7fc3aac95d1
e2b845d2-ea46-4709-8c63-000b38a1e2eb	20151234-0f5b-4368-9d9a-4b6d94077187	d74fe958-d77a-43ef-b71e-71e9cf953de1
ac257df7-32ca-402f-94d3-9ed6365b6605	20151234-0f5b-4368-9d9a-4b6d94077187	c44f6f4d-0ed1-4348-8cb6-80bb8cc83591
60fa3db8-01cc-4515-9a5b-1749cc7529a8	20151234-0f5b-4368-9d9a-4b6d94077187	a496d4cc-a09c-4f11-a50c-516f950d4ec8
86e3775a-7dd9-4c43-aebd-2ce007774019	20151234-0f5b-4368-9d9a-4b6d94077187	bac51a5c-aa87-450d-88f2-6a4cc0b9ecfb
2373667f-d77b-40d0-8fe1-19139d895d84	20151234-0f5b-4368-9d9a-4b6d94077187	e531b0f0-7648-4a80-9c4e-92ce76983e70
c000ad41-58da-42dd-8f24-66d341f32e60	20151234-0f5b-4368-9d9a-4b6d94077187	461372bf-e4ec-4473-a50a-da2e7c7d057f
5ff17692-a0a9-477a-8133-1cee8cb92e41	20151234-0f5b-4368-9d9a-4b6d94077187	890350fb-5705-4df0-ae15-7c1efe119a53
26303535-5f86-4422-b3df-feac374a840a	20151234-0f5b-4368-9d9a-4b6d94077187	1af99382-dc27-44af-b39d-4d60c3bd3f8c
65cd909b-52ae-44bc-bb5a-69c17470e156	20151234-0f5b-4368-9d9a-4b6d94077187	8eb9be26-50f6-486c-9959-1778b6a487fa
cb1d5307-4c25-4291-bbd3-bd20344dea8a	20151234-0f5b-4368-9d9a-4b6d94077187	af43b013-8775-4fc8-a2ae-749f91eb41cc
abd52e81-d54f-478a-a263-ca4ee7f6c712	20151234-0f5b-4368-9d9a-4b6d94077187	64bb8e41-b4a0-48f5-a3f6-bdc05e8bf159
15af1e22-2863-46cb-9c79-1546c360a904	20151234-0f5b-4368-9d9a-4b6d94077187	7bc2535a-9b78-40f2-8357-c768f96b00f1
e8baaf95-5e4c-4cd8-b752-99d1d5cad132	20151234-0f5b-4368-9d9a-4b6d94077187	b8b25a5c-458d-47b3-bf49-bdd52fad49f0
cc59a97d-b418-45bf-a3e7-48e3da2905d8	20151234-0f5b-4368-9d9a-4b6d94077187	d120ce7d-4633-40df-a1f0-c61cd1c4887b
e2a32735-45f7-48e3-bd5f-dcd884236a4d	20151234-0f5b-4368-9d9a-4b6d94077187	d0de3b51-25f7-4aa7-89cd-e0a64141ade7
1ae7c2a5-5913-4391-9ea3-a89b117395e7	20151234-0f5b-4368-9d9a-4b6d94077187	5ebe63a6-fa48-4448-b207-4e1dde61e27d
01e5ffb2-18dc-44ed-b53e-a4c3b5fdc0cc	20151234-0f5b-4368-9d9a-4b6d94077187	fc057fbf-adc2-464a-91b6-2797533c1ccf
9dcb8121-8082-481e-9715-844b8060ebb5	20151234-0f5b-4368-9d9a-4b6d94077187	32bb00b6-97fd-4b35-a54c-7956596b7627
631c6c48-5818-4000-8007-7921403b4bd5	20151234-0f5b-4368-9d9a-4b6d94077187	a2a0514c-8283-48dc-969b-ae96b8b2eceb
607fe051-50f8-48fd-b011-a3ae24a3c629	20151234-0f5b-4368-9d9a-4b6d94077187	b4caa165-0585-4a4f-97e0-dd5b2bc4c7ff
d359b33e-ee0e-4019-9177-d49a63c053d3	20151234-0f5b-4368-9d9a-4b6d94077187	29347b03-bdee-4b9e-b013-8a2564a07b90
56b00883-0fd8-465b-ac65-b5460f943fd4	20151234-0f5b-4368-9d9a-4b6d94077187	e550a527-9252-4743-86ba-0819833ce0cb
155d6ee5-d379-48b5-bfb0-ae7c42d9ec3f	20151234-0f5b-4368-9d9a-4b6d94077187	188b82a9-3cbb-4c08-8220-6271b56ac736
4769c742-c552-462d-8a21-752d5c8ce948	20151234-0f5b-4368-9d9a-4b6d94077187	16482799-c981-428c-a568-83c837fdb88b
26b746a5-ae96-4a06-8836-1557d708dd0f	20151234-0f5b-4368-9d9a-4b6d94077187	d41f7fc5-4eb5-47e0-861a-95f395d6fb39
433cb4a1-a27b-4432-98bf-75bb380c8dec	20151234-0f5b-4368-9d9a-4b6d94077187	af527293-f600-4108-98f8-185e125b9b4c
a134885f-b843-4ff9-8305-83cef81d1a99	20151234-0f5b-4368-9d9a-4b6d94077187	da891a31-cb85-483b-8714-a8525bb5762e
af7f5972-e746-49d8-b196-cc53779796ed	20151234-0f5b-4368-9d9a-4b6d94077187	6ef61283-991b-4dbd-a4fd-7c19724e6908
f4927105-c54e-490d-a823-e94326c554d0	20151234-0f5b-4368-9d9a-4b6d94077187	ecccbce5-3c95-4b19-93e6-f0f4886fe659
f48e83b5-e14b-4c38-a47a-5133ba842461	20151234-0f5b-4368-9d9a-4b6d94077187	b2a5e5b0-020f-448f-b83d-b38e7f665ae9
d90b1c5d-aad6-41c7-abb2-9aa8611cd26c	20151234-0f5b-4368-9d9a-4b6d94077187	c80f2a2b-f771-46e7-99ce-649a1be4083e
fd504b58-9f9f-4a74-9239-b88b5c482757	20151234-0f5b-4368-9d9a-4b6d94077187	3c005434-8307-4d28-842c-21beb9ff160e
bba6a3ba-7d40-44fb-b89f-646d2dfc0b6b	20151234-0f5b-4368-9d9a-4b6d94077187	e449bb59-b7e7-4b07-bbd6-d14a33713957
8a1be835-c256-42cf-ba19-c4d4bba7614f	20151234-0f5b-4368-9d9a-4b6d94077187	74cdf2c2-d411-484f-9124-c936bf26e551
a88c3124-82e5-4da6-a3b1-52c139165434	20151234-0f5b-4368-9d9a-4b6d94077187	5e40e4e1-f097-4bb2-83cb-7f6c6e513dfb
cabd1600-b48b-4fd6-b89a-b4de3bceda9f	20151234-0f5b-4368-9d9a-4b6d94077187	46990347-717e-4b06-b647-9d9afa1c3920
b56a0727-d992-436e-9df6-95789abb8a6d	20151234-0f5b-4368-9d9a-4b6d94077187	cc2851f8-3ab0-4142-bc37-40af2c3a21d1
06a9b0fd-b298-4f81-b59a-ba09c36b1c8a	20151234-0f5b-4368-9d9a-4b6d94077187	4c38e058-e584-4e5b-b774-499d30656fa8
ed2c2fc3-1a2c-42e9-8a89-f7ea50994324	20151234-0f5b-4368-9d9a-4b6d94077187	3a7d0116-05a7-40b8-8196-26f2b40d6e80
afb96723-d028-41a6-bacd-083f8ebffb56	20151234-0f5b-4368-9d9a-4b6d94077187	5de51cb9-7042-4aaa-bcc5-173977c25131
1a69d8a3-9a58-403a-9b12-791365a90720	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	3a265d4f-6c1f-4dcd-9c81-80d5436eb1ca
bb6f3d2b-b0c4-408e-9fd6-2350b5273602	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	abe4b12d-4f45-4948-a4f3-3534b89d5ee1
e01150d1-0771-4e94-ad77-9efd0e033936	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	ae971300-d39b-4095-9ca3-87b74eabe9cd
0ed0f2db-bee7-4292-a939-5cecd14c031a	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	85b5d28f-dac6-4d0a-8105-dc45f6325d12
c86729a8-62fb-403f-9026-e08da099c5ab	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	ae7d2b9d-4b8b-402b-892f-b7fc3aac95d1
314c9c68-3893-48fa-8e4e-e4ff1ea78d5c	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	d74fe958-d77a-43ef-b71e-71e9cf953de1
52e8dd36-69fd-4c58-8b68-05b2728da994	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	c44f6f4d-0ed1-4348-8cb6-80bb8cc83591
6c17f5a9-7497-4501-87e2-9860d3757878	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	a496d4cc-a09c-4f11-a50c-516f950d4ec8
d61fd853-10ac-47fb-8835-5009a809bcd3	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	bac51a5c-aa87-450d-88f2-6a4cc0b9ecfb
c02a4279-07cd-436e-8804-2eab990eaf8b	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	e531b0f0-7648-4a80-9c4e-92ce76983e70
92821733-a8cd-4f51-a383-6d11d42d8f90	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	461372bf-e4ec-4473-a50a-da2e7c7d057f
ba767db5-3de3-441a-9619-61c32dd49cac	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	890350fb-5705-4df0-ae15-7c1efe119a53
17cf80c7-1e44-44e2-abbc-383e703e8fbd	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	1af99382-dc27-44af-b39d-4d60c3bd3f8c
0ccb9a8f-22d5-4c3e-80ba-9bc7364eaf7d	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	8eb9be26-50f6-486c-9959-1778b6a487fa
e5ca6c17-1aa8-4c82-b064-e3fe4fdbd110	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	af43b013-8775-4fc8-a2ae-749f91eb41cc
d7db3916-6181-4fc6-a219-fcc2bcb2fb19	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	64bb8e41-b4a0-48f5-a3f6-bdc05e8bf159
9b11bd36-111f-4ef5-b7e3-eb172370578c	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	7bc2535a-9b78-40f2-8357-c768f96b00f1
5e5f5f6c-1f82-4c61-a09d-307f41a9823e	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	b8b25a5c-458d-47b3-bf49-bdd52fad49f0
fd87f973-a854-4ad1-a682-3ce19fb35c15	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	d120ce7d-4633-40df-a1f0-c61cd1c4887b
71d3caa4-806e-4820-a730-b962bc8264a8	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	d0de3b51-25f7-4aa7-89cd-e0a64141ade7
6d57ea25-774e-4e04-a831-f78c9406737d	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	5ebe63a6-fa48-4448-b207-4e1dde61e27d
ea449746-c5a8-4a94-8bff-3c1668ec1822	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	fc057fbf-adc2-464a-91b6-2797533c1ccf
c64a7b2b-0b72-4804-a423-2c75f504c997	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	32bb00b6-97fd-4b35-a54c-7956596b7627
c1adb691-38ab-4782-8156-6068e969adfd	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	a2a0514c-8283-48dc-969b-ae96b8b2eceb
b091ef81-6899-4907-8a45-f1cfe583ed7a	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	b4caa165-0585-4a4f-97e0-dd5b2bc4c7ff
930c52dc-3871-4d4d-b69a-38e930401f28	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	29347b03-bdee-4b9e-b013-8a2564a07b90
325a8fbc-8d2c-4d69-b139-64d9c8daf8d6	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	e550a527-9252-4743-86ba-0819833ce0cb
3087c6a6-ea0e-4c5f-813e-e564de58c01a	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	188b82a9-3cbb-4c08-8220-6271b56ac736
7b3bc877-cb1f-425a-8e63-7e5df2d9a0ab	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	16482799-c981-428c-a568-83c837fdb88b
c68ef0cf-94df-4fb4-af1a-62e6382f4001	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	d41f7fc5-4eb5-47e0-861a-95f395d6fb39
084c6ea0-8c13-4cad-b24f-8c2470749c8d	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	af527293-f600-4108-98f8-185e125b9b4c
3c70d1e8-2af2-452c-abed-3a3675ca0b92	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	da891a31-cb85-483b-8714-a8525bb5762e
bf0e9856-0e73-4c45-bc54-e4c9e6e0bced	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	6ef61283-991b-4dbd-a4fd-7c19724e6908
749f6084-26bc-4363-a4a6-fdc6c559deab	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	ecccbce5-3c95-4b19-93e6-f0f4886fe659
c16c8b2f-165a-4a4d-87f0-2da8bdb09f56	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	b2a5e5b0-020f-448f-b83d-b38e7f665ae9
1046a993-3a15-4b95-b8e8-37f03347058c	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	c80f2a2b-f771-46e7-99ce-649a1be4083e
6ef0584c-d6ac-4506-9d6e-511a89e714fd	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	3c005434-8307-4d28-842c-21beb9ff160e
03ae43ef-790a-4180-81a6-b47375c06366	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	cc2851f8-3ab0-4142-bc37-40af2c3a21d1
9a6d008d-8f72-4b31-b3a3-b499b15b4879	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	4c38e058-e584-4e5b-b774-499d30656fa8
9c827184-dce9-4d08-9b64-8e0886f69845	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	3a7d0116-05a7-40b8-8196-26f2b40d6e80
8e04b876-009e-40d8-bcab-c72fb1451aba	95b1d303-28f6-4bca-a9a5-97ea3eef06ff	5de51cb9-7042-4aaa-bcc5-173977c25131
\.


--
-- Data for Name: Route; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Route" (id, path, method, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RoutePermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RoutePermission" (id, "routeId", "permissionId") FROM stdin;
\.


--
-- Data for Name: Salon; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Salon" (id, name, "ownerId", "createdAt", "updatedAt", version, "avgPrice", "avgWaitTime", description, "isActive", timings, "parentId", "isProfileCompleted") FROM stdin;
bcc2a7e5-5120-4a7a-bd66-81c8a63df727	Zipp Delhi Premium Salon	e368f043-eaa3-45c6-a39e-9bff79874558	2026-08-26 07:57:08.663	2026-08-26 07:57:08.663	1	500	15	Head office of Zipp Delhi Premium Salon located in Delhi Region.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	\N	t
b55204b8-006a-4916-9318-74a89874046d	Zipp Delhi Premium - Saket	ea7489ab-eb0b-47a1-809f-c8bf5fb23041	2026-08-26 07:57:08.696	2026-08-26 07:57:08.696	1	450	20	Branch salon located at Saket.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	bcc2a7e5-5120-4a7a-bd66-81c8a63df727	t
c49b3f21-9f67-443c-bca4-612759dd0ca8	Zipp Delhi Premium - Connaught Place	764565c1-2459-4d70-a2ee-6af41763272c	2026-08-26 07:57:08.734	2026-08-26 07:57:08.734	1	450	20	Branch salon located at Connaught Place.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	bcc2a7e5-5120-4a7a-bd66-81c8a63df727	t
c646e3b8-1c0a-4651-bcdf-453d01c550d9	Zipp Delhi Premium - Karol Bagh	c0d5ef6b-cedb-4c13-ae9f-fb1ad2aa909e	2026-08-26 07:57:08.773	2026-08-26 07:57:08.773	1	450	20	Branch salon located at Karol Bagh.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	bcc2a7e5-5120-4a7a-bd66-81c8a63df727	t
0db7ebcd-8710-46f7-9026-c48fe5c3673d	Zipp Delhi Elite Salon	e368f043-eaa3-45c6-a39e-9bff79874558	2026-08-26 07:57:08.797	2026-08-26 07:57:08.797	1	500	15	Head office of Zipp Delhi Elite Salon located in Delhi Region.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	\N	t
5525e891-c9b2-435b-8eec-eb9927db5f54	Zipp Delhi Elite - Vasant Kunj	feeff79b-8bd7-47e8-9a71-3ec96a04bf1a	2026-08-26 07:57:08.816	2026-08-26 07:57:08.816	1	450	20	Branch salon located at Vasant Kunj.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	0db7ebcd-8710-46f7-9026-c48fe5c3673d	t
44dca150-9f6e-4890-8ad4-c48ff35bcacf	Zipp Delhi Elite - Dwarka	6771aa27-a245-4518-922c-ec13af079019	2026-08-26 07:57:08.844	2026-08-26 07:57:08.844	1	450	20	Branch salon located at Dwarka.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	0db7ebcd-8710-46f7-9026-c48fe5c3673d	t
f0c549c4-50cb-47ec-ab2d-032e2a0366d5	Zipp Jaipur Royal Salon	e368f043-eaa3-45c6-a39e-9bff79874558	2026-08-26 07:57:08.867	2026-08-26 07:57:08.867	1	500	15	Head office of Zipp Jaipur Royal Salon located in Jaipur Region.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	\N	t
c6c65ec1-182a-4256-93e7-823d71f0cb41	Zipp Jaipur Royal - Vaishali Nagar	6a8374cb-92b4-4ea3-8998-bda6d839c7f9	2026-08-26 07:57:08.889	2026-08-26 07:57:08.889	1	450	20	Branch salon located at Vaishali Nagar.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	f0c549c4-50cb-47ec-ab2d-032e2a0366d5	t
4a36c6da-67be-497d-b083-228d82002415	Zipp Jaipur Royal - Malviya Nagar	a158f4f2-cb29-45f8-8a0b-9ad38cdf732c	2026-08-26 07:57:08.919	2026-08-26 07:57:08.919	1	450	20	Branch salon located at Malviya Nagar.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	f0c549c4-50cb-47ec-ab2d-032e2a0366d5	t
9021a2b9-ce6f-4611-a4e1-3ec78d145e74	Zipp Jaipur Royal - C-Scheme	07acf6ae-3184-4bb6-9dcf-3e827dc1b27e	2026-08-26 07:57:08.951	2026-08-26 07:57:08.951	1	450	20	Branch salon located at C-Scheme.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	f0c549c4-50cb-47ec-ab2d-032e2a0366d5	t
f508ebe0-c046-427e-b638-902b144f0bb9	Zipp Jaipur Heritage Salon	e368f043-eaa3-45c6-a39e-9bff79874558	2026-08-26 07:57:08.979	2026-08-26 07:57:08.979	1	500	15	Head office of Zipp Jaipur Heritage Salon located in Jaipur Region.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	\N	t
6dd02bde-a7b8-4930-b6f5-28ec60164352	Zipp Jaipur Heritage - Mansarovar	c99d55cc-8830-40e5-85e1-23374aeb181a	2026-08-26 07:57:08.999	2026-08-26 07:57:08.999	1	450	20	Branch salon located at Mansarovar.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	f508ebe0-c046-427e-b638-902b144f0bb9	t
d208ba95-a7da-4a40-9610-ffdbe58121de	Zipp Jaipur Heritage - Raja Park	dcbdc94d-ed2f-4826-a4d3-97ed4248a9bc	2026-08-26 07:57:09.033	2026-08-26 07:57:09.033	1	450	20	Branch salon located at Raja Park.	t	{"friday": {"open": "09:00", "close": "21:00"}, "monday": {"open": "09:00", "close": "21:00"}, "sunday": {"open": "10:00", "close": "22:00"}, "tuesday": {"open": "09:00", "close": "21:00"}, "saturday": {"open": "10:00", "close": "22:00"}, "thursday": {"open": "09:00", "close": "21:00"}, "wednesday": {"open": "09:00", "close": "21:00"}}	f508ebe0-c046-427e-b638-902b144f0bb9	t
\.


--
-- Data for Name: SalonContact; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SalonContact" (id, "salonId", phone, "countryCode", email, "isPrimary", "isWhatsapp") FROM stdin;
c7a77c0d-241d-40a7-bb17-ba6093c8440a	bcc2a7e5-5120-4a7a-bd66-81c8a63df727	9000000001	91	\N	t	f
2b571b77-9f53-479a-9fe5-671a181c8bb0	b55204b8-006a-4916-9318-74a89874046d	9000000003	91	\N	t	f
cdab6a9b-90c2-417d-9cc4-aded8f79df49	c49b3f21-9f67-443c-bca4-612759dd0ca8	9000000006	91	\N	t	f
d890b466-2f78-4e44-b14d-3c0932a90da9	c646e3b8-1c0a-4651-bcdf-453d01c550d9	9000000009	91	\N	t	f
480ec567-7a76-41a7-a42a-7b0e20717978	0db7ebcd-8710-46f7-9026-c48fe5c3673d	9000000011	91	\N	t	f
9ff2d187-8e8a-4b9b-a39e-b994e4b0962a	5525e891-c9b2-435b-8eec-eb9927db5f54	9000000013	91	\N	t	f
8f55bace-48d1-406d-aefa-61d91c5a72d2	44dca150-9f6e-4890-8ad4-c48ff35bcacf	9000000016	91	\N	t	f
3385bc2d-6f73-4113-b9e3-298510f43251	f0c549c4-50cb-47ec-ab2d-032e2a0366d5	9000000018	91	\N	t	f
0a4fb5f3-f850-4fb1-9f59-75c31685a899	c6c65ec1-182a-4256-93e7-823d71f0cb41	9000000020	91	\N	t	f
3930b244-1443-4583-b96d-a389e664812f	4a36c6da-67be-497d-b083-228d82002415	9000000023	91	\N	t	f
1d9973d8-769d-4ab8-b4d2-dbc798d189f3	9021a2b9-ce6f-4611-a4e1-3ec78d145e74	9000000026	91	\N	t	f
ccfb43c7-4083-4d73-8b4c-a3f4f4175ce7	f508ebe0-c046-427e-b638-902b144f0bb9	9000000028	91	\N	t	f
8c948dd0-a7b9-464b-9b1f-cfbb2fbd51d4	6dd02bde-a7b8-4930-b6f5-28ec60164352	9000000030	91	\N	t	f
822e95c2-3ed5-4a4b-9022-9e0b058624bc	d208ba95-a7da-4a40-9610-ffdbe58121de	9000000033	91	\N	t	f
\.


--
-- Data for Name: SalonCustomer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SalonCustomer" (id, "salonId", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SalonImage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SalonImage" (id, "salonId", url) FROM stdin;
\.


--
-- Data for Name: SalonStaff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SalonStaff" (id, "userId", "salonId", "createdAt", "isActive", role, "createdById", "staffRoleId", "updatedAt", "updatedById") FROM stdin;
d0ae10f8-323e-4c2c-91ed-0e1135c33b85	83e047d9-2df0-4eb5-a481-59b63eeca809	b55204b8-006a-4916-9318-74a89874046d	2026-08-26 07:57:08.721	t	Stylist	ea7489ab-eb0b-47a1-809f-c8bf5fb23041	\N	2026-08-26 07:57:08.721	\N
849e00a9-0360-4427-a389-bacfa338a952	abcf6391-2619-4115-95e1-2503ab7acd7e	c49b3f21-9f67-443c-bca4-612759dd0ca8	2026-08-26 07:57:08.759	t	Stylist	764565c1-2459-4d70-a2ee-6af41763272c	\N	2026-08-26 07:57:08.759	\N
b47894d4-e2f8-494c-8b84-858da8c145cc	c25ab714-9dba-4982-bbe0-7d963900b885	c646e3b8-1c0a-4651-bcdf-453d01c550d9	2026-08-26 07:57:08.794	t	Stylist	c0d5ef6b-cedb-4c13-ae9f-fb1ad2aa909e	\N	2026-08-26 07:57:08.794	\N
d58653fc-b5ac-435d-bf61-d87c8f52ab31	6c2ff3b9-9920-461b-ad0d-6bfea5a92120	5525e891-c9b2-435b-8eec-eb9927db5f54	2026-08-26 07:57:08.832	t	Stylist	feeff79b-8bd7-47e8-9a71-3ec96a04bf1a	\N	2026-08-26 07:57:08.832	\N
d9b0c137-762c-4615-bd61-a5a98f7d81bc	5395924c-5fbc-41f4-a15e-5593c284b825	44dca150-9f6e-4890-8ad4-c48ff35bcacf	2026-08-26 07:57:08.863	t	Stylist	6771aa27-a245-4518-922c-ec13af079019	\N	2026-08-26 07:57:08.863	\N
f54abb30-f653-4736-bc1e-113ae468c7d1	5c8765bb-6f81-4a80-83d8-9deb2de12f72	c6c65ec1-182a-4256-93e7-823d71f0cb41	2026-08-26 07:57:08.909	t	Stylist	6a8374cb-92b4-4ea3-8998-bda6d839c7f9	\N	2026-08-26 07:57:08.909	\N
91ef7731-42c2-4c04-b5c1-1f98a7586862	dadd01e6-6845-42f8-a31c-eda11b181149	4a36c6da-67be-497d-b083-228d82002415	2026-08-26 07:57:08.941	t	Stylist	a158f4f2-cb29-45f8-8a0b-9ad38cdf732c	\N	2026-08-26 07:57:08.941	\N
4550bc9a-6c64-48b9-9719-145a392af307	a3201440-4384-4666-9018-f46adff5a4f9	9021a2b9-ce6f-4611-a4e1-3ec78d145e74	2026-08-26 07:57:08.975	t	Stylist	07acf6ae-3184-4bb6-9dcf-3e827dc1b27e	\N	2026-08-26 07:57:08.975	\N
dd0b82f0-a7c3-4fc8-99e9-f138a48916e8	f69fbae5-fd94-4bf7-a0c0-c574feea9910	6dd02bde-a7b8-4930-b6f5-28ec60164352	2026-08-26 07:57:09.023	t	Stylist	c99d55cc-8830-40e5-85e1-23374aeb181a	\N	2026-08-26 07:57:09.023	\N
9f2980b4-6a27-46e7-8621-c7acdf06c9a0	bf6508f7-f019-458e-8b94-eedaf0aac191	d208ba95-a7da-4a40-9610-ffdbe58121de	2026-08-26 07:57:09.053	t	Stylist	dcbdc94d-ed2f-4826-a4d3-97ed4248a9bc	\N	2026-08-26 07:57:09.053	\N
\.


--
-- Data for Name: Service; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Service" (id, name, description, "categoryId", "basePrice", "baseDuration", "isActive", "createdAt", "updatedAt", "createdById", "salonId", "updatedById") FROM stdin;
8770eed3-3166-41b3-ae52-28f712b26669	Signature Haircut	Premium stylist haircut with wash	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	400	30	t	2026-08-26 07:57:08.681	2026-08-26 07:57:08.681	e368f043-eaa3-45c6-a39e-9bff79874558	bcc2a7e5-5120-4a7a-bd66-81c8a63df727	\N
5082af5a-f07a-44bd-b2a0-8f39b619dc9f	Express Facial	Quick clean-up and hydration	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	600	45	t	2026-08-26 07:57:08.681	2026-08-26 07:57:08.681	e368f043-eaa3-45c6-a39e-9bff79874558	bcc2a7e5-5120-4a7a-bd66-81c8a63df727	\N
d1952ec2-df65-4e75-a356-d351f639c484	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:08.706	2026-08-26 07:57:08.706	ea7489ab-eb0b-47a1-809f-c8bf5fb23041	b55204b8-006a-4916-9318-74a89874046d	\N
e3d26ae5-09c9-448a-a6af-23c25b54a94a	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:08.706	2026-08-26 07:57:08.706	ea7489ab-eb0b-47a1-809f-c8bf5fb23041	b55204b8-006a-4916-9318-74a89874046d	\N
0fe0dadd-4911-4d27-84aa-6013a2cbdb80	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:08.706	2026-08-26 07:57:08.706	ea7489ab-eb0b-47a1-809f-c8bf5fb23041	b55204b8-006a-4916-9318-74a89874046d	\N
7a4e5779-e151-493e-bfa8-189fc0676efe	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:08.744	2026-08-26 07:57:08.744	764565c1-2459-4d70-a2ee-6af41763272c	c49b3f21-9f67-443c-bca4-612759dd0ca8	\N
b3a1e1fa-1839-4ced-bafe-ffa6409f7c4b	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:08.744	2026-08-26 07:57:08.744	764565c1-2459-4d70-a2ee-6af41763272c	c49b3f21-9f67-443c-bca4-612759dd0ca8	\N
5cac69f0-83e4-4770-8f97-1a611fcfe893	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:08.744	2026-08-26 07:57:08.744	764565c1-2459-4d70-a2ee-6af41763272c	c49b3f21-9f67-443c-bca4-612759dd0ca8	\N
772875de-b279-493c-80ad-101256fb4479	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:08.78	2026-08-26 07:57:08.78	c0d5ef6b-cedb-4c13-ae9f-fb1ad2aa909e	c646e3b8-1c0a-4651-bcdf-453d01c550d9	\N
c35cad7a-e7ce-4d57-a978-4e7528089956	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:08.78	2026-08-26 07:57:08.78	c0d5ef6b-cedb-4c13-ae9f-fb1ad2aa909e	c646e3b8-1c0a-4651-bcdf-453d01c550d9	\N
d57fb2be-f9f5-47c6-8b26-a9038a9d2fab	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:08.78	2026-08-26 07:57:08.78	c0d5ef6b-cedb-4c13-ae9f-fb1ad2aa909e	c646e3b8-1c0a-4651-bcdf-453d01c550d9	\N
6b7c4101-6490-40d7-8c64-408a44f8ca31	Signature Haircut	Premium stylist haircut with wash	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	400	30	t	2026-08-26 07:57:08.806	2026-08-26 07:57:08.806	e368f043-eaa3-45c6-a39e-9bff79874558	0db7ebcd-8710-46f7-9026-c48fe5c3673d	\N
7f099fe9-e076-4d55-9cf7-329c43767975	Express Facial	Quick clean-up and hydration	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	600	45	t	2026-08-26 07:57:08.806	2026-08-26 07:57:08.806	e368f043-eaa3-45c6-a39e-9bff79874558	0db7ebcd-8710-46f7-9026-c48fe5c3673d	\N
edaea918-7399-4804-ba47-a7357396a90d	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:08.822	2026-08-26 07:57:08.822	feeff79b-8bd7-47e8-9a71-3ec96a04bf1a	5525e891-c9b2-435b-8eec-eb9927db5f54	\N
ae52728b-af70-4767-a9bf-ab8dc8396d3b	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:08.822	2026-08-26 07:57:08.822	feeff79b-8bd7-47e8-9a71-3ec96a04bf1a	5525e891-c9b2-435b-8eec-eb9927db5f54	\N
bbb17dea-9546-4b47-8d4d-65fcc8542a83	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:08.822	2026-08-26 07:57:08.822	feeff79b-8bd7-47e8-9a71-3ec96a04bf1a	5525e891-c9b2-435b-8eec-eb9927db5f54	\N
162cce5f-bb9c-4a36-9b45-3f59773ad6f2	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:08.85	2026-08-26 07:57:08.85	6771aa27-a245-4518-922c-ec13af079019	44dca150-9f6e-4890-8ad4-c48ff35bcacf	\N
222af0d5-f4dc-4060-95e8-2dc75f43520b	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:08.85	2026-08-26 07:57:08.85	6771aa27-a245-4518-922c-ec13af079019	44dca150-9f6e-4890-8ad4-c48ff35bcacf	\N
bffd1390-6223-40f4-8165-fdb94ba0e753	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:08.85	2026-08-26 07:57:08.85	6771aa27-a245-4518-922c-ec13af079019	44dca150-9f6e-4890-8ad4-c48ff35bcacf	\N
7a88e5e5-4fa6-4193-97ae-626e6fa27ec6	Signature Haircut	Premium stylist haircut with wash	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	400	30	t	2026-08-26 07:57:08.876	2026-08-26 07:57:08.876	e368f043-eaa3-45c6-a39e-9bff79874558	f0c549c4-50cb-47ec-ab2d-032e2a0366d5	\N
aefb8513-db05-45ce-8e93-17ebe4e57b3d	Express Facial	Quick clean-up and hydration	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	600	45	t	2026-08-26 07:57:08.876	2026-08-26 07:57:08.876	e368f043-eaa3-45c6-a39e-9bff79874558	f0c549c4-50cb-47ec-ab2d-032e2a0366d5	\N
ca010587-ad92-4fef-9d11-89c667849cab	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:08.895	2026-08-26 07:57:08.895	6a8374cb-92b4-4ea3-8998-bda6d839c7f9	c6c65ec1-182a-4256-93e7-823d71f0cb41	\N
7da7e54b-d12b-4c16-8dfa-8924a21c6c79	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:08.895	2026-08-26 07:57:08.895	6a8374cb-92b4-4ea3-8998-bda6d839c7f9	c6c65ec1-182a-4256-93e7-823d71f0cb41	\N
d62fecc0-83e4-4e79-914f-37d5e60eae92	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:08.895	2026-08-26 07:57:08.895	6a8374cb-92b4-4ea3-8998-bda6d839c7f9	c6c65ec1-182a-4256-93e7-823d71f0cb41	\N
23c4f77f-61ef-4913-850d-4905f5f3863b	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:08.927	2026-08-26 07:57:08.927	a158f4f2-cb29-45f8-8a0b-9ad38cdf732c	4a36c6da-67be-497d-b083-228d82002415	\N
1fec8e8f-8bea-4529-9b15-6c05388da535	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:08.927	2026-08-26 07:57:08.927	a158f4f2-cb29-45f8-8a0b-9ad38cdf732c	4a36c6da-67be-497d-b083-228d82002415	\N
ed79cad6-0842-4466-8e59-c8bba8cb092d	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:08.927	2026-08-26 07:57:08.927	a158f4f2-cb29-45f8-8a0b-9ad38cdf732c	4a36c6da-67be-497d-b083-228d82002415	\N
94406748-ebc3-405f-91ec-2a86ad407592	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:08.96	2026-08-26 07:57:08.96	07acf6ae-3184-4bb6-9dcf-3e827dc1b27e	9021a2b9-ce6f-4611-a4e1-3ec78d145e74	\N
3ff7c8d5-4415-475e-a48b-26c0f50859b1	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:08.96	2026-08-26 07:57:08.96	07acf6ae-3184-4bb6-9dcf-3e827dc1b27e	9021a2b9-ce6f-4611-a4e1-3ec78d145e74	\N
fdc90bb8-dd4c-4993-92ee-fa0a48ffc285	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:08.96	2026-08-26 07:57:08.96	07acf6ae-3184-4bb6-9dcf-3e827dc1b27e	9021a2b9-ce6f-4611-a4e1-3ec78d145e74	\N
978f6790-ade7-4046-9ebe-964665575ff0	Signature Haircut	Premium stylist haircut with wash	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	400	30	t	2026-08-26 07:57:08.987	2026-08-26 07:57:08.987	e368f043-eaa3-45c6-a39e-9bff79874558	f508ebe0-c046-427e-b638-902b144f0bb9	\N
0b949a2c-be5d-4b7a-b2b1-ec21a669c8ff	Express Facial	Quick clean-up and hydration	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	600	45	t	2026-08-26 07:57:08.987	2026-08-26 07:57:08.987	e368f043-eaa3-45c6-a39e-9bff79874558	f508ebe0-c046-427e-b638-902b144f0bb9	\N
bb9ba736-3737-4889-affe-9e9a5d4d9b79	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:09.009	2026-08-26 07:57:09.009	c99d55cc-8830-40e5-85e1-23374aeb181a	6dd02bde-a7b8-4930-b6f5-28ec60164352	\N
12af57fe-70dc-4110-bea8-4f9185511a45	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:09.009	2026-08-26 07:57:09.009	c99d55cc-8830-40e5-85e1-23374aeb181a	6dd02bde-a7b8-4930-b6f5-28ec60164352	\N
ea81ee01-dfa6-4ed0-bb91-112f9cd4d00c	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:09.009	2026-08-26 07:57:09.009	c99d55cc-8830-40e5-85e1-23374aeb181a	6dd02bde-a7b8-4930-b6f5-28ec60164352	\N
9140ec66-c664-40d4-a7df-3051626f47de	Standard Haircut	Classic clipper or scissor haircut	7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	300	30	t	2026-08-26 07:57:09.041	2026-08-26 07:57:09.041	dcbdc94d-ed2f-4826-a4d3-97ed4248a9bc	d208ba95-a7da-4a40-9610-ffdbe58121de	\N
944b71ff-ab2e-406a-bc5c-9cd7638badd0	Gold Facial	Premium exfoliating and massage facial	dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	1200	60	t	2026-08-26 07:57:09.041	2026-08-26 07:57:09.041	dcbdc94d-ed2f-4826-a4d3-97ed4248a9bc	d208ba95-a7da-4a40-9610-ffdbe58121de	\N
31075231-9818-40b9-96f8-631e11547e11	Deep Tissue Massage	Therapeutic full body massage	71250f6c-2c19-4d10-984e-300822be9f32	1500	60	t	2026-08-26 07:57:09.041	2026-08-26 07:57:09.041	dcbdc94d-ed2f-4826-a4d3-97ed4248a9bc	d208ba95-a7da-4a40-9610-ffdbe58121de	\N
\.


--
-- Data for Name: ServiceCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceCategory" (id, name, "isActive") FROM stdin;
7d9c03c4-7a89-42bc-a4d3-59d7ad4e6c4d	Haircut	t
dd0e52d4-01b9-4c39-b8ef-70d1700cdc62	Facial	t
71250f6c-2c19-4d10-984e-300822be9f32	Massage	t
\.


--
-- Data for Name: ServiceImage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ServiceImage" (id, "serviceId", url) FROM stdin;
\.


--
-- Data for Name: StaffRole; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StaffRole" (id, "salonId", name, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StaffRolePermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."StaffRolePermission" (id, "staffRoleId", "permissionId") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, "firstName", "lastName", email, phone, password, "isActive", "createdAt", "updatedAt", version, dob, gender, "countryCode", source) FROM stdin;
dc3a8c49-f397-4152-80f5-2632047cc0f0	Super	Admin	admin@zippsalon.com	9999999999	$2b$10$X7fighYfYXeUyrt//WceEu2Hp.I1kIEpeXCM4l3RIFOlnRi9KfFoS	t	2026-08-26 07:57:07.932	2026-08-26 07:57:07.932	1	\N	\N	+91	ADMIN
e368f043-eaa3-45c6-a39e-9bff79874558	John	Vendor	vendor@example.com	9876543210	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.642	2026-08-26 07:57:08.642	1	\N	\N	+91	ADMIN
ea7489ab-eb0b-47a1-809f-c8bf5fb23041	Saket	Manager	saket_admin@example.com	9000000002	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.689	2026-08-26 07:57:08.689	1	\N	\N	+91	ADMIN
83e047d9-2df0-4eb5-a481-59b63eeca809	Saket Stylist	Staff	saket_staff@example.com	9000000004	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.712	2026-08-26 07:57:08.712	1	\N	\N	+91	ADMIN
764565c1-2459-4d70-a2ee-6af41763272c	Connaught Place	Manager	cp_admin@example.com	9000000005	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.727	2026-08-26 07:57:08.727	1	\N	\N	+91	ADMIN
abcf6391-2619-4115-95e1-2503ab7acd7e	Connaught Place Stylist	Staff	connaughtplace_staff@example.com	9000000007	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.748	2026-08-26 07:57:08.748	1	\N	\N	+91	ADMIN
c0d5ef6b-cedb-4c13-ae9f-fb1ad2aa909e	Karol Bagh	Manager	kb_admin@example.com	9000000008	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.764	2026-08-26 07:57:08.764	1	\N	\N	+91	ADMIN
c25ab714-9dba-4982-bbe0-7d963900b885	Karol Bagh Stylist	Staff	karolbagh_staff@example.com	9000000010	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.785	2026-08-26 07:57:08.785	1	\N	\N	+91	ADMIN
feeff79b-8bd7-47e8-9a71-3ec96a04bf1a	Vasant Kunj	Manager	vk_admin@example.com	9000000012	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.81	2026-08-26 07:57:08.81	1	\N	\N	+91	ADMIN
6c2ff3b9-9920-461b-ad0d-6bfea5a92120	Vasant Kunj Stylist	Staff	vasantkunj_staff@example.com	9000000014	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.826	2026-08-26 07:57:08.826	1	\N	\N	+91	ADMIN
6771aa27-a245-4518-922c-ec13af079019	Dwarka	Manager	dwarka_admin@example.com	9000000015	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.836	2026-08-26 07:57:08.836	1	\N	\N	+91	ADMIN
5395924c-5fbc-41f4-a15e-5593c284b825	Dwarka Stylist	Staff	dwarka_staff@example.com	9000000017	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.856	2026-08-26 07:57:08.856	1	\N	\N	+91	ADMIN
6a8374cb-92b4-4ea3-8998-bda6d839c7f9	Vaishali Nagar	Manager	vaishali_admin@example.com	9000000019	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.881	2026-08-26 07:57:08.881	1	\N	\N	+91	ADMIN
5c8765bb-6f81-4a80-83d8-9deb2de12f72	Vaishali Nagar Stylist	Staff	vaishalinagar_staff@example.com	9000000021	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.899	2026-08-26 07:57:08.899	1	\N	\N	+91	ADMIN
a158f4f2-cb29-45f8-8a0b-9ad38cdf732c	Malviya Nagar	Manager	malviya_admin@example.com	9000000022	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.912	2026-08-26 07:57:08.912	1	\N	\N	+91	ADMIN
dadd01e6-6845-42f8-a31c-eda11b181149	Malviya Nagar Stylist	Staff	malviyanagar_staff@example.com	9000000024	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.932	2026-08-26 07:57:08.932	1	\N	\N	+91	ADMIN
07acf6ae-3184-4bb6-9dcf-3e827dc1b27e	C-Scheme	Manager	cscheme_admin@example.com	9000000025	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.945	2026-08-26 07:57:08.945	1	\N	\N	+91	ADMIN
a3201440-4384-4666-9018-f46adff5a4f9	C-Scheme Stylist	Staff	c-scheme_staff@example.com	9000000027	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.966	2026-08-26 07:57:08.966	1	\N	\N	+91	ADMIN
c99d55cc-8830-40e5-85e1-23374aeb181a	Mansarovar	Manager	mansarovar_admin@example.com	9000000029	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:08.992	2026-08-26 07:57:08.992	1	\N	\N	+91	ADMIN
f69fbae5-fd94-4bf7-a0c0-c574feea9910	Mansarovar Stylist	Staff	mansarovar_staff@example.com	9000000031	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:09.014	2026-08-26 07:57:09.014	1	\N	\N	+91	ADMIN
dcbdc94d-ed2f-4826-a4d3-97ed4248a9bc	Raja Park	Manager	rajapark_admin@example.com	9000000032	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:09.027	2026-08-26 07:57:09.027	1	\N	\N	+91	ADMIN
bf6508f7-f019-458e-8b94-eedaf0aac191	Raja Park Stylist	Staff	rajapark_staff@example.com	9000000034	$2b$10$MoWf2m97xgiq8wT9jRxkUu.StX8ZtJV67xE0Nu4IpwPJ9qeRTQbHO	t	2026-08-26 07:57:09.046	2026-08-26 07:57:09.046	1	\N	\N	+91	ADMIN
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserRole" (id, "userId", "roleId") FROM stdin;
22d4b30c-f919-4ad6-8c5b-31ddd1ff34e4	dc3a8c49-f397-4152-80f5-2632047cc0f0	20151234-0f5b-4368-9d9a-4b6d94077187
0f921757-4d19-413a-a2ec-eab1f731ace9	e368f043-eaa3-45c6-a39e-9bff79874558	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
7d8ce608-b36e-4f21-8bd3-2525b581171a	ea7489ab-eb0b-47a1-809f-c8bf5fb23041	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
9b6ff96e-ab23-4b89-9821-0093dec341c3	83e047d9-2df0-4eb5-a481-59b63eeca809	e735534f-31b5-4385-b315-19eb6c2fb572
320e6adb-7255-4bb6-b0f5-47baca5041e0	764565c1-2459-4d70-a2ee-6af41763272c	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
72a4b6ce-7095-4217-ac44-94c1bef6c629	abcf6391-2619-4115-95e1-2503ab7acd7e	e735534f-31b5-4385-b315-19eb6c2fb572
69468330-a705-4ae6-b065-28a00213dc08	c0d5ef6b-cedb-4c13-ae9f-fb1ad2aa909e	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
f36b0804-1dd6-4fbb-9480-88b81ad15273	c25ab714-9dba-4982-bbe0-7d963900b885	e735534f-31b5-4385-b315-19eb6c2fb572
538fe7e8-ee76-4970-8bb1-d5890d93a1f1	feeff79b-8bd7-47e8-9a71-3ec96a04bf1a	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
31667c5e-4c49-4505-95e0-895f15a1e0bb	6c2ff3b9-9920-461b-ad0d-6bfea5a92120	e735534f-31b5-4385-b315-19eb6c2fb572
c9ce5fc0-f9d3-4642-9742-83a59ad1e392	6771aa27-a245-4518-922c-ec13af079019	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
e8bef623-183d-48c4-8814-69d9e205baff	5395924c-5fbc-41f4-a15e-5593c284b825	e735534f-31b5-4385-b315-19eb6c2fb572
26c58f07-94f7-4071-9811-ed9fa75c8bd3	6a8374cb-92b4-4ea3-8998-bda6d839c7f9	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
bb1a5ad0-89c8-4463-8c64-d05b101913c6	5c8765bb-6f81-4a80-83d8-9deb2de12f72	e735534f-31b5-4385-b315-19eb6c2fb572
4efced9f-3301-4472-a27b-54faa04471ca	a158f4f2-cb29-45f8-8a0b-9ad38cdf732c	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
47a239ad-e70f-4d38-871c-42f2f335a0fd	dadd01e6-6845-42f8-a31c-eda11b181149	e735534f-31b5-4385-b315-19eb6c2fb572
8727a7d4-fb27-4d3d-b2a0-1d68ea2b95c4	07acf6ae-3184-4bb6-9dcf-3e827dc1b27e	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
e0eed0cd-a263-476f-b15c-aaf2cee69679	a3201440-4384-4666-9018-f46adff5a4f9	e735534f-31b5-4385-b315-19eb6c2fb572
08b5cb20-9c35-4289-97b5-68d2524609bb	c99d55cc-8830-40e5-85e1-23374aeb181a	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
0a8bb62b-f399-4adb-85ca-acd825032f3e	f69fbae5-fd94-4bf7-a0c0-c574feea9910	e735534f-31b5-4385-b315-19eb6c2fb572
da13d67e-93e1-4a4b-b9cc-3af6d01b1d2b	dcbdc94d-ed2f-4826-a4d3-97ed4248a9bc	95b1d303-28f6-4bca-a9a5-97ea3eef06ff
e34bc2be-c5df-4830-9cde-32c4dcfe7c43	bf6508f7-f019-458e-8b94-eedaf0aac191	e735534f-31b5-4385-b315-19eb6c2fb572
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
750dccfa-8474-424d-9596-8d556908bb86	617a07042ce1b0c79a3b3222e3586098356a936716d24c81878d345c918e0fd1	2026-08-26 07:56:26.167326+00	20260505165517_init	\N	\N	2026-08-26 07:56:26.072311+00	1
322dfa9f-089e-4ad1-bd8a-12a585e26acc	6e3998e6dda148727eabd4b54eb194209fefda02abedd270c9abaf2adc809b97	2026-08-26 07:56:26.224125+00	20260505171613_salon_relations_added	\N	\N	2026-08-26 07:56:26.170339+00	1
20ceebb2-eeba-45e4-be62-665cabb74624	1db90b4cf886d6ccc3da75acb319f090d71d8d60a13a8a55db181b3a96eeafaa	2026-08-26 07:56:26.280705+00	20260505182354_enhance_models	\N	\N	2026-08-26 07:56:26.228516+00	1
8295c383-9d7c-4a8d-aa56-82ad53efc08e	4145722d59cd46c6a5fb706b118993bbff318c551de90cfc6711bcaa95a6ec78	2026-08-26 07:56:26.31896+00	20260505182748_add_salon_contacts	\N	\N	2026-08-26 07:56:26.284034+00	1
09319da0-60d8-490f-972e-855b9dbfdc8e	eebaf9c4af672f63cdb9901954543ebac3827129a954f377dfe1ded0a98434f6	2026-08-26 07:56:26.361826+00	20260505190938_add_branches_attendance	\N	\N	2026-08-26 07:56:26.322127+00	1
00c7d7d6-6e0b-4c98-bf15-751f59844e1c	d8c512056b50b0a7a84b0787b128588e926460c6e53ac2b30b9fec7ebf25bb1e	2026-08-26 07:56:26.486522+00	20260506155655_add_salon_services	\N	\N	2026-08-26 07:56:26.367064+00	1
c56c44b0-16d7-4e9f-9022-14cd5ee1f936	163bf1a805f5ce7a5adac1c61893fef555f6c81ceb320bfc264bb7e074110235	2026-08-26 07:56:26.53273+00	20260506161222_add_salon_customer	\N	\N	2026-08-26 07:56:26.491711+00	1
9e4be221-4fb5-45cb-99c5-65600e86ee10	22c9b37c86998e62bb33db60eebe08a4edfe3988fd88c1b0a0247b616640fe9d	2026-08-26 07:56:26.561633+00	20260506171628_add_otp_log	\N	\N	2026-08-26 07:56:26.535899+00	1
\.


--
-- Name: Address Address_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_pkey" PRIMARY KEY (id);


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: BookingService BookingService_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BookingService"
    ADD CONSTRAINT "BookingService_pkey" PRIMARY KEY (id);


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: ComboItem ComboItem_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComboItem"
    ADD CONSTRAINT "ComboItem_pkey" PRIMARY KEY (id);


--
-- Name: Combo Combo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Combo"
    ADD CONSTRAINT "Combo_pkey" PRIMARY KEY (id);


--
-- Name: Lead Lead_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_pkey" PRIMARY KEY (id);


--
-- Name: MenuPermission MenuPermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MenuPermission"
    ADD CONSTRAINT "MenuPermission_pkey" PRIMARY KEY (id);


--
-- Name: Menu Menu_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Menu"
    ADD CONSTRAINT "Menu_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: RoutePermission RoutePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoutePermission"
    ADD CONSTRAINT "RoutePermission_pkey" PRIMARY KEY (id);


--
-- Name: Route Route_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Route"
    ADD CONSTRAINT "Route_pkey" PRIMARY KEY (id);


--
-- Name: SalonContact SalonContact_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonContact"
    ADD CONSTRAINT "SalonContact_pkey" PRIMARY KEY (id);


--
-- Name: SalonCustomer SalonCustomer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonCustomer"
    ADD CONSTRAINT "SalonCustomer_pkey" PRIMARY KEY (id);


--
-- Name: SalonImage SalonImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonImage"
    ADD CONSTRAINT "SalonImage_pkey" PRIMARY KEY (id);


--
-- Name: SalonStaff SalonStaff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonStaff"
    ADD CONSTRAINT "SalonStaff_pkey" PRIMARY KEY (id);


--
-- Name: Salon Salon_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Salon"
    ADD CONSTRAINT "Salon_pkey" PRIMARY KEY (id);


--
-- Name: ServiceCategory ServiceCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceCategory"
    ADD CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY (id);


--
-- Name: ServiceImage ServiceImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceImage"
    ADD CONSTRAINT "ServiceImage_pkey" PRIMARY KEY (id);


--
-- Name: Service Service_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_pkey" PRIMARY KEY (id);


--
-- Name: StaffRolePermission StaffRolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffRolePermission"
    ADD CONSTRAINT "StaffRolePermission_pkey" PRIMARY KEY (id);


--
-- Name: StaffRole StaffRole_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffRole"
    ADD CONSTRAINT "StaffRole_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Address_salonId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Address_salonId_key" ON public."Address" USING btree ("salonId");


--
-- Name: Attendance_staffId_date_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Attendance_staffId_date_key" ON public."Attendance" USING btree ("staffId", date);


--
-- Name: Booking_customerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Booking_customerId_idx" ON public."Booking" USING btree ("customerId");


--
-- Name: Booking_salonId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Booking_salonId_idx" ON public."Booking" USING btree ("salonId");


--
-- Name: ComboItem_comboId_serviceId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ComboItem_comboId_serviceId_key" ON public."ComboItem" USING btree ("comboId", "serviceId");


--
-- Name: MenuPermission_menuId_permissionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "MenuPermission_menuId_permissionId_key" ON public."MenuPermission" USING btree ("menuId", "permissionId");


--
-- Name: PasswordResetToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON public."PasswordResetToken" USING btree (token);


--
-- Name: Permission_action_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Permission_action_key" ON public."Permission" USING btree (action);


--
-- Name: RolePermission_roleId_permissionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON public."RolePermission" USING btree ("roleId", "permissionId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: RoutePermission_routeId_permissionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RoutePermission_routeId_permissionId_key" ON public."RoutePermission" USING btree ("routeId", "permissionId");


--
-- Name: Route_path_method_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Route_path_method_key" ON public."Route" USING btree (path, method);


--
-- Name: SalonContact_salonId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SalonContact_salonId_idx" ON public."SalonContact" USING btree ("salonId");


--
-- Name: SalonCustomer_salonId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SalonCustomer_salonId_userId_key" ON public."SalonCustomer" USING btree ("salonId", "userId");


--
-- Name: SalonStaff_userId_salonId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SalonStaff_userId_salonId_key" ON public."SalonStaff" USING btree ("userId", "salonId");


--
-- Name: ServiceCategory_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ServiceCategory_name_key" ON public."ServiceCategory" USING btree (name);


--
-- Name: Service_salonId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Service_salonId_idx" ON public."Service" USING btree ("salonId");


--
-- Name: StaffRolePermission_staffRoleId_permissionId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StaffRolePermission_staffRoleId_permissionId_key" ON public."StaffRolePermission" USING btree ("staffRoleId", "permissionId");


--
-- Name: StaffRole_salonId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "StaffRole_salonId_name_key" ON public."StaffRole" USING btree ("salonId", name);


--
-- Name: UserRole_userId_roleId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON public."UserRole" USING btree ("userId", "roleId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Address Address_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Address"
    ADD CONSTRAINT "Address_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Attendance Attendance_markedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attendance Attendance_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."SalonStaff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookingService BookingService_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BookingService"
    ADD CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BookingService BookingService_comboId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BookingService"
    ADD CONSTRAINT "BookingService_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public."Combo"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BookingService BookingService_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."BookingService"
    ADD CONSTRAINT "BookingService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Booking Booking_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Booking Booking_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Booking Booking_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."SalonStaff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ComboItem ComboItem_comboId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComboItem"
    ADD CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES public."Combo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ComboItem ComboItem_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ComboItem"
    ADD CONSTRAINT "ComboItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Combo Combo_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Combo"
    ADD CONSTRAINT "Combo_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MenuPermission MenuPermission_menuId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MenuPermission"
    ADD CONSTRAINT "MenuPermission_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES public."Menu"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MenuPermission MenuPermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MenuPermission"
    ADD CONSTRAINT "MenuPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Menu Menu_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Menu"
    ADD CONSTRAINT "Menu_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Menu"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PasswordResetToken PasswordResetToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_bookingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES public."Booking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RolePermission RolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoutePermission RoutePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoutePermission"
    ADD CONSTRAINT "RoutePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RoutePermission RoutePermission_routeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RoutePermission"
    ADD CONSTRAINT "RoutePermission_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES public."Route"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonContact SalonContact_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonContact"
    ADD CONSTRAINT "SalonContact_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonCustomer SalonCustomer_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonCustomer"
    ADD CONSTRAINT "SalonCustomer_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonCustomer SalonCustomer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonCustomer"
    ADD CONSTRAINT "SalonCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonImage SalonImage_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonImage"
    ADD CONSTRAINT "SalonImage_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonStaff SalonStaff_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonStaff"
    ADD CONSTRAINT "SalonStaff_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SalonStaff SalonStaff_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonStaff"
    ADD CONSTRAINT "SalonStaff_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalonStaff SalonStaff_staffRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonStaff"
    ADD CONSTRAINT "SalonStaff_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES public."StaffRole"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SalonStaff SalonStaff_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonStaff"
    ADD CONSTRAINT "SalonStaff_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SalonStaff SalonStaff_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SalonStaff"
    ADD CONSTRAINT "SalonStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Salon Salon_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Salon"
    ADD CONSTRAINT "Salon_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Salon Salon_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Salon"
    ADD CONSTRAINT "Salon_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ServiceImage ServiceImage_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ServiceImage"
    ADD CONSTRAINT "ServiceImage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public."Service"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Service Service_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ServiceCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Service Service_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Service Service_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Service Service_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Service"
    ADD CONSTRAINT "Service_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StaffRolePermission StaffRolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffRolePermission"
    ADD CONSTRAINT "StaffRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffRolePermission StaffRolePermission_staffRoleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffRolePermission"
    ADD CONSTRAINT "StaffRolePermission_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES public."StaffRole"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffRole StaffRole_salonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."StaffRole"
    ADD CONSTRAINT "StaffRole_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES public."Salon"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict OAYrbPbju288nO7aDFjRocaaXxVpl7bnGDFIRE4WLi4woYkDUQYWcgCWaf2jwVA

