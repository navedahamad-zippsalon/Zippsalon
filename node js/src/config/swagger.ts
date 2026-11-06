import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import { openapiSchemas } from "../docs/openapi/schemas";
import { openapiPaths } from "../docs/openapi/paths";
import { additionalOpenapiPaths } from "../docs/openapi/additional-paths";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Zippsalon API",
            version: "1.0.0",
            description: "Production API documentation for Zippsalon backend",
        },
        servers: [
            {
                url: "/",
                description: "Current Server",
            },
            {
                url: "http://localhost:5000",
                description: "Local Development Server",
            },
        ],
        tags: [
            { name: "Auth", description: "Authentication, user login, registration, password management, and JWT tokens" },
            { name: "Users", description: "User profiles, accounts, avatar upload, and salon profile completion" },
            { name: "Feed", description: "Salon social feed, posts, comments, likes, shares, views, and 24-hour stories" },
            { name: "Salons", description: "Salons management, branch outlets, addresses, operating hours, and contacts" },
            { name: "Bookings", description: "Appointment bookings, scheduling, service selection, and status updates" },
            { name: "Booking Finance", description: "Booking commissions, vendor wallet ledger, approval workflows, settlement reporting, and RazorpayX payouts" },
            { name: "Customers", description: "Customer management, search, salon mapping, and profile details" },
            { name: "Staff", description: "Salon staff and stylists management, roles, and attendance tracking" },
            { name: "Services", description: "Salon service catalog, categories, pricing, durations, and combo packages" },
            { name: "GST", description: "GST tax configuration (CGST, SGST, IGST), tax calculations, and printable tax invoices" },
            { name: "Dashboard", description: "Business analytics, revenue summaries, appointments metrics, and attendance overview" },
            { name: "Reports", description: "Vendor, salon, branch, booking, revenue, staff, and review analytics" },
            { name: "Inventory - Vendor", description: "Vendor product listings, SKU catalog, and owned stock management" },
            { name: "Inventory - Catalog", description: "Product categories and brand management" },
            { name: "Inventory - Salon", description: "Salon in-house products and stock management" },
            { name: "Inventory - Admin", description: "Admin product overview, approval workflows, and low-stock alerts" },
            { name: "Upload", description: "File and media upload service for images, avatars, and attachments" },
            { name: "Generative AI", description: "AI hairstyle generation and transformation previews" },
            { name: "Leads", description: "Inquiry leads collection and status tracking pipeline" },
            { name: "RBAC", description: "Role-Based Access Control, navigation menus, and permission management" },
            { name: "WhatsApp", description: "Tenant WhatsApp messaging, contacts, templates, campaigns, and webhook" },
            { name: "WhatsApp Admin", description: "Provider configuration, pricing, system templates, and usage reporting" },
            { name: "Subscriptions", description: "Vendor plans, checkout, payment history, invoices, and entitlements" },
            { name: "Subscription Admin", description: "Plan, feature, subscriber, payment, invoice, and audit management" },
            { name: "Admin", description: "Administrative endpoints for salon approvals, content moderation, and reports" },
            { name: "Master Data", description: "Geographical master reference data for countries, states, and cities" },
            { name: "Settings", description: "Tenant-scoped SMTP and WhatsApp delivery configuration" },
            { name: "Tracking", description: "Admin-only CRM and customer app session, activity, location, and usage analytics" },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: openapiSchemas,
        },
        paths: { ...openapiPaths, ...additionalOpenapiPaths },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./src/modules/**/*.routes.ts", "./dist/modules/**/*.routes.js"], // paths to files containing swagger annotations
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
    app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
    app.use(
        "/api-docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                docExpansion: "list",
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
            },
            customSiteTitle: "Zippsalon API Documentation",
        })
    );
};
