/**
 * Comprehensive OpenAPI 3.0 Schemas for Zippsalon Backend
 */

export const openapiSchemas = {
  // 1. Error Schemas
  Error: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Resource not found" },
    },
    required: ["success", "message"],
  },
  RbacMenuPermission: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      menuId: { type: "string", format: "uuid" },
      permissionId: { type: "string", format: "uuid" },
      permission: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          action: { type: "string", example: "booking-finance.view" },
          description: { type: "string", nullable: true },
        },
        required: ["id", "action"],
      },
    },
    required: ["id", "menuId", "permissionId", "permission"],
  },
  RbacMenuNode: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      label: { type: "string", example: "Payment & Wallet" },
      icon: { type: "string", nullable: true, example: "WalletCards" },
      path: { type: "string", nullable: true, example: "/booking-finance" },
      parentId: { type: "string", format: "uuid", nullable: true },
      order: { type: "integer", example: 17 },
      showInSidebar: { type: "boolean", example: true },
      menuPermissions: {
        type: "array",
        items: { $ref: "#/components/schemas/RbacMenuPermission" },
      },
      children: {
        type: "array",
        items: { $ref: "#/components/schemas/RbacMenuNode" },
      },
    },
    required: ["id", "label", "path", "order", "showInSidebar", "menuPermissions"],
  },
  RbacMenusResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Menus fetched successfully" },
      data: {
        type: "array",
        items: { $ref: "#/components/schemas/RbacMenuNode" },
      },
    },
    required: ["success", "message", "data"],
  },
  ValidationError: {
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: "Validation Error" },
      errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string", example: "email" },
            message: { type: "string", example: "Invalid email format" },
          },
          required: ["field", "message"],
        },
      },
    },
    required: ["success", "message", "errors"],
  },

  // 2. Pagination Schema
  Pagination: {
    type: "object",
    properties: {
      total: { type: "integer", example: 42 },
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 10 },
      pages: { type: "integer", example: 5 },
    },
    required: ["total", "page", "limit", "pages"],
  },

  // 3. User Schema
  User: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid", example: "123e4567-e89b-12d3-a456-426614174000" },
      firstName: { type: "string", example: "John" },
      lastName: { type: "string", nullable: true, example: "Doe" },
      email: { type: "string", format: "email", example: "john.doe@example.com" },
      phone: { type: "string", nullable: true, example: "+919876543210" },
      countryCode: { type: "string", default: "+91", example: "+91" },
      role: { type: "string", enum: ["ADMIN", "SUPER_ADMIN", "SALON_OWNER", "STAFF", "USER"], example: "SALON_OWNER" },
      avatar: { type: "string", nullable: true, example: "/uploads/avatars/avatar.jpg" },
      timings: { type: "object", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "firstName", "email", "createdAt", "updatedAt"],
  },

  // 4. Role Schema
  Role: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "SALON_OWNER" },
      description: { type: "string", nullable: true, example: "Salon owner administrator" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name"],
  },

  // 5. Salon Schema
  Salon: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Luxe Glow Salon" },
      description: { type: "string", nullable: true, example: "Premium hair and beauty lounge" },
      ownerId: { type: "string", format: "uuid" },
      avgPrice: { type: "number", example: 450.0 },
      avgWaitTime: { type: "integer", example: 15 },
      timings: { type: "object", nullable: true },
      isActive: { type: "boolean", default: true },
      address: {
        type: "object",
        properties: {
          line1: { type: "string", example: "Shop 12, Main Street" },
          line2: { type: "string", example: "Sector 4" },
          city: { type: "string", example: "Mumbai" },
          state: { type: "string", example: "Maharashtra" },
          pincode: { type: "string", example: "400001" },
          country: { type: "string", example: "India" },
        },
      },
      contacts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            phone: { type: "string", example: "+919876543210" },
            countryCode: { type: "string", example: "+91" },
            email: { type: "string", example: "contact@luxeglow.com" },
            isPrimary: { type: "boolean" },
            isWhatsapp: { type: "boolean" },
          },
        },
      },
      images: {
        type: "array",
        items: { type: "string", example: "/uploads/salon/photo1.jpg" },
      },
      parentId: { type: "string", format: "uuid", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "ownerId"],
  },

  // 6. Staff Schema
  Staff: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      userId: { type: "string", format: "uuid" },
      salonId: { type: "string", format: "uuid" },
      staffRoleId: { type: "string", format: "uuid", nullable: true },
      user: { $ref: "#/components/schemas/User" },
      role: { type: "string", example: "Senior Stylist" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "userId", "salonId"],
  },

  // 7. Customer Schema
  Customer: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      firstName: { type: "string", example: "Alice" },
      lastName: { type: "string", nullable: true, example: "Smith" },
      email: { type: "string", format: "email", example: "alice@example.com" },
      phone: { type: "string", example: "+919123456789" },
      countryCode: { type: "string", example: "+91" },
      salons: {
        type: "array",
        items: { type: "string", format: "uuid" },
      },
      totalBookings: { type: "integer", example: 3 },
      totalSpent: { type: "number", example: 1250.0 },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "firstName", "phone"],
  },

  // 8. Service Schema
  Service: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      salonId: { type: "string", format: "uuid" },
      categoryId: { type: "string", format: "uuid", nullable: true },
      name: { type: "string", example: "Signature Haircut & Wash" },
      description: { type: "string", nullable: true, example: "Classic cut including shampoo and blow dry" },
      duration: { type: "integer", description: "Duration in minutes", example: 45 },
      price: { type: "number", example: 500.0 },
      isActive: { type: "boolean", default: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "salonId", "name", "duration", "price"],
  },

  // 9. Booking Schema
  Booking: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      salonId: { type: "string", format: "uuid" },
      customerId: { type: "string", format: "uuid" },
      staffId: { type: "string", format: "uuid" },
      bookingDate: { type: "string", format: "date-time" },
      status: {
        type: "string",
        enum: ["PENDING", "CONFIRMED", "IN_PROGRESS", "CHECKED_IN", "DONE", "CANCELLED", "NO_SHOW"],
        example: "CONFIRMED",
      },
      totalAmount: { type: "number", example: 1000.0 },
      discount: { type: "number", example: 10.0 },
      discountAmount: { type: "number", example: 100.0 },
      taxableAmount: { type: "number", example: 900.0 },
      cgstAmount: { type: "number", example: 81.0 },
      sgstAmount: { type: "number", example: 81.0 },
      igstAmount: { type: "number", example: 0.0 },
      totalTaxAmount: { type: "number", example: 162.0 },
      finalAmount: { type: "number", example: 1062.0 },
      totalPaid: { type: "number", example: 1062.0 },
      notes: { type: "string", nullable: true, example: "Prefers organic shampoo" },
      services: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string", example: "Haircut" },
            price: { type: "number", example: 500.0 },
          },
        },
      },
      payments: {
        type: "array",
        items: { $ref: "#/components/schemas/Payment" },
      },
      customer: { $ref: "#/components/schemas/Customer" },
      staff: { $ref: "#/components/schemas/Staff" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "salonId", "customerId", "staffId", "bookingDate", "status", "finalAmount"],
  },

  // 10. Payment Schema
  Payment: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      bookingId: { type: "string", format: "uuid" },
      amount: { type: "number", example: 1062.0 },
      method: {
        type: "string",
        enum: ["CASH", "CARD", "UPI", "WALLET", "NET_BANKING", "OTHER"],
        example: "UPI",
      },
      status: {
        type: "string",
        enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
        example: "COMPLETED",
      },
      transactionId: { type: "string", nullable: true, example: "UPI12345678" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "bookingId", "amount", "method", "status"],
  },

  // 11. Lead Schema
  Lead: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Rajesh Sharma" },
      email: { type: "string", format: "email", example: "rajesh@example.com" },
      phone: { type: "string", example: "+919876543210" },
      countryCode: { type: "string", default: "+1", example: "+91" },
      status: {
        type: "string",
        enum: ["PENDING", "CONTACTED", "QUALIFIED", "CONVERTED", "LOST"],
        example: "PENDING",
      },
      message: { type: "string", nullable: true, example: "Interested in onboarding a 5-chair salon" },
      metadata: { type: "object", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "email", "phone", "status"],
  },

  // 12. GST Configuration Schema
  GSTConfiguration: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      salonId: { type: "string", format: "uuid" },
      cgstRate: { type: "number", example: 9.0 },
      sgstRate: { type: "number", example: 9.0 },
      igstRate: { type: "number", example: 18.0 },
      isActive: { type: "boolean", default: true },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "salonId", "cgstRate", "sgstRate", "igstRate", "isActive"],
  },

  // 13. Menu Schema
  Menu: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Appointments" },
      path: { type: "string", example: "/appointments" },
      icon: { type: "string", nullable: true, example: "calendar" },
      order: { type: "integer", example: 1 },
      parentId: { type: "string", format: "uuid", nullable: true },
      roles: {
        type: "array",
        items: { type: "string", example: "SALON_OWNER" },
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "path"],
  },

  // 14. Permission Schema
  Permission: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      action: { type: "string", example: "booking.create" },
      description: { type: "string", nullable: true, example: "Create customer bookings" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "action"],
  },

  // 15. StaffRole Schema
  StaffRole: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Hair Specialist" },
      description: { type: "string", nullable: true, example: "Staff member specializing in haircuts and coloring" },
      salonId: { type: "string", format: "uuid" },
      permissions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            permissionId: { type: "string", format: "uuid" },
            permission: { $ref: "#/components/schemas/Permission" },
          },
        },
      },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "name", "salonId"],
  },

  // 16. Dashboard Schema
  Dashboard: {
    type: "object",
    properties: {
      summary: {
        type: "object",
        properties: {
          appointments: { type: "integer", example: 14 },
          revenue: { type: "number", example: 18500.0 },
          customers: { type: "integer", example: 8 },
          services: { type: "integer", example: 22 },
        },
        required: ["appointments", "revenue", "customers", "services"],
      },
      upcoming: {
        type: "array",
        items: { $ref: "#/components/schemas/Booking" },
      },
      attendance: {
        type: "object",
        properties: {
          present: { type: "integer", example: 4 },
          absent: { type: "integer", example: 1 },
          half_day: { type: "integer", example: 0 },
        },
        required: ["present", "absent", "half_day"],
      },
    },
    required: ["summary", "upcoming", "attendance"],
  },

  // 17. Feed Schemas
  FeedMedia: {
    type: "object",
    properties: {
      url: { type: "string", example: "/uploads/feed/media-123.jpg" },
      type: { type: "string", enum: ["IMAGE", "VIDEO"], example: "IMAGE" },
      thumbnailUrl: { type: "string", nullable: true, example: "/uploads/feed/thumb-123.jpg" },
      fileName: { type: "string", example: "media-123.jpg" },
      mimeType: { type: "string", example: "image/jpeg" },
      fileSize: { type: "integer", example: 1048576 },
      width: { type: "integer", example: 1080 },
      height: { type: "integer", example: 1350 },
      durationSeconds: { type: "integer", nullable: true, example: 0 },
      sortOrder: { type: "integer", example: 0 },
    },
    required: ["url", "type"],
  },

  FeedPost: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid", example: "b3f6789a-12d3-4567-89ab-cdef01234567" },
      authorId: { type: "string", format: "uuid" },
      author: { $ref: "#/components/schemas/User" },
      salonId: { type: "string", format: "uuid" },
      branchId: { type: "string", format: "uuid", nullable: true },
      caption: { type: "string", example: "Fresh bridal transformation today! Book your slot now ✨" },
      visibility: { type: "string", enum: ["PUBLIC", "SALON", "BRANCH", "PRIVATE"], example: "PUBLIC" },
      status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], example: "PUBLISHED" },
      media: {
        type: "array",
        items: { $ref: "#/components/schemas/FeedMedia" },
      },
      likeCount: { type: "integer", example: 24 },
      commentCount: { type: "integer", example: 5 },
      viewCount: { type: "integer", example: 150 },
      shareCount: { type: "integer", example: 8 },
      isLiked: { type: "boolean", example: false },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "authorId", "salonId", "visibility", "status"],
  },

  CreatePostDto: {
    type: "object",
    properties: {
      salonId: { type: "string", format: "uuid", description: "Salon UUID", example: "00000000-0000-4000-8000-000000000001" },
      branchId: { type: "string", format: "uuid", nullable: true, description: "Branch UUID if applicable" },
      caption: { type: "string", maxLength: 2200, example: "Gorgeous Balayage & Blowout for the weekend! ✨" },
      visibility: { type: "string", enum: ["PUBLIC", "SALON", "BRANCH", "PRIVATE"], default: "PUBLIC", example: "PUBLIC" },
      status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "PUBLISHED", example: "PUBLISHED" },
      media: {
        type: "array",
        items: { $ref: "#/components/schemas/FeedMedia" },
      },
    },
    required: ["salonId"],
  },

  FeedStory: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      authorId: { type: "string", format: "uuid" },
      author: { $ref: "#/components/schemas/User" },
      salonId: { type: "string", format: "uuid" },
      branchId: { type: "string", format: "uuid", nullable: true },
      caption: { type: "string", nullable: true, example: "Behind the scenes at Luxe Salon!" },
      media: {
        type: "array",
        items: { $ref: "#/components/schemas/FeedMedia" },
      },
      viewCount: { type: "integer", example: 42 },
      expiresAt: { type: "string", format: "date-time" },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "authorId", "salonId", "media", "expiresAt", "createdAt"],
  },

  CreateStoryDto: {
    type: "object",
    properties: {
      salonId: { type: "string", format: "uuid", example: "00000000-0000-4000-8000-000000000001" },
      branchId: { type: "string", format: "uuid", nullable: true },
      caption: { type: "string", maxLength: 2200, example: "Morning styling session in progress!" },
      media: {
        type: "array",
        description: "Exactly one media item",
        items: { $ref: "#/components/schemas/FeedMedia" },
      },
    },
    required: ["salonId", "media"],
  },

  FeedComment: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      postId: { type: "string", format: "uuid" },
      userId: { type: "string", format: "uuid" },
      user: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          firstName: { type: "string", example: "Priya" },
          lastName: { type: "string", example: "Sharma" },
          avatar: { type: "string", nullable: true },
        },
      },
      message: { type: "string", example: "Loved this hairstyle! How long does it take?" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    required: ["id", "postId", "userId", "message", "createdAt"],
  },

  CreateCommentDto: {
    type: "object",
    properties: {
      message: { type: "string", minLength: 1, maxLength: 500, example: "Stunning haircut! How can I book this?" },
    },
    required: ["message"],
  },

  ReportPostDto: {
    type: "object",
    properties: {
      reason: { type: "string", enum: ["SPAM", "INAPPROPRIATE", "COPYRIGHT", "HARASSMENT", "OTHER"], example: "SPAM" },
      description: { type: "string", maxLength: 2000, example: "Repetitive promotional content" },
    },
    required: ["reason"],
  },

  SharePostDto: {
    type: "object",
    properties: {
      platform: {
        type: "string",
        enum: ["NATIVE", "COPY_LINK", "WHATSAPP", "FACEBOOK", "X", "LINKEDIN", "INSTAGRAM", "OTHER"],
        default: "COPY_LINK",
        example: "WHATSAPP",
      },
    },
  },

  AuthResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: {
        type: "object",
        properties: {
          token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
          user: { $ref: "#/components/schemas/User" },
        },
      },
    },
  },

  LoginDto: {
    type: "object",
    properties: {
      email: { type: "string", format: "email", example: "" },
      password: { type: "string", example: "Admin@12345" },
    },
    required: ["email", "password"],
  },

  RegisterDto: {
    type: "object",
    properties: {
      firstName: { type: "string", example: "Ananya" },
      lastName: { type: "string", example: "Patel" },
      email: { type: "string", format: "email", example: "ananya@example.com" },
      password: { type: "string", minLength: 6, example: "Secret@1234" },
      phone: { type: "string", example: "+919876543210" },
      countryCode: { type: "string", default: "+91", example: "+91" },
      role: { type: "string", enum: ["USER", "SALON_OWNER", "STAFF"], default: "USER" },
    },
    required: ["firstName", "email", "password"],
  },

  FinancePaginationResponse: {
    type: "object",
    properties: {
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 20 },
      total: { type: "integer", example: 146 },
      totalPages: { type: "integer", example: 8 },
      hasNextPage: { type: "boolean", example: true },
      hasPreviousPage: { type: "boolean", example: false },
    },
    required: ["page", "limit", "total", "totalPages", "hasNextPage", "hasPreviousPage"],
  },
  FinancialDashboardResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: {
        type: "object",
        properties: {
          summary: { type: "object", description: "All-time wallet and booking totals; money is serialized as decimal strings.", additionalProperties: true },
          today: { $ref: "#/components/schemas/FinancialPeriodTotals" },
          week: { $ref: "#/components/schemas/FinancialPeriodTotals" },
          month: { $ref: "#/components/schemas/FinancialPeriodTotals" },
          year: { $ref: "#/components/schemas/FinancialPeriodTotals" },
          settlement: {
            type: "object",
            properties: {
              readyToSendToday: { type: "string", example: "125000.00" },
              pendingApproval: { type: "string", example: "35000.00" },
              processing: { type: "string", example: "20000.00" },
              settledToday: { type: "string", example: "80000.00" },
              eligibleVendorCount: { type: "integer", example: 28 },
              eligibleTransactionCount: { type: "integer", example: 146 },
            },
          },
          series: { type: "array", items: { $ref: "#/components/schemas/FinancialTrendPoint" } },
        },
      },
    },
  },
  FinancialPeriodTotals: {
    type: "object",
    properties: {
      bookingAmount: { type: "string", example: "50000.00" },
      commission: { type: "string", example: "15000.00" },
      vendorPayable: { type: "string", example: "35000.00" },
      pending: { type: "string", example: "5000.00" },
      settled: { type: "string", example: "20000.00" },
    },
  },
  FinancialSummaryResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: {
        allOf: [
          { $ref: "#/components/schemas/FinancialPeriodTotals" },
          { type: "object", properties: { period: { type: "object", properties: { from: { type: "string", format: "date-time" }, to: { type: "string", format: "date-time" } } }, approved: { type: "string" }, processing: { type: "string" }, failed: { type: "string" } } },
        ],
      },
    },
  },
  FinancialTrendPoint: {
    type: "object",
    properties: {
      period: { type: "string", format: "date-time", example: "2026-10-01T00:00:00.000Z" },
      bookingAmount: { type: "string", example: "50000.00" },
      commission: { type: "string", example: "15000.00" },
      vendorPayable: { type: "string", example: "35000.00" },
      pending: { type: "string", example: "5000.00" },
      approved: { type: "string", example: "10000.00" },
      processing: { type: "string", example: "5000.00" },
      settled: { type: "string", example: "20000.00" },
      failed: { type: "string", example: "0.00" },
    },
  },
  FinancialTrendsResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: { type: "object", properties: { period: { type: "object" }, groupBy: { type: "string", enum: ["day", "week", "month", "year"] }, data: { type: "array", items: { $ref: "#/components/schemas/FinancialTrendPoint" } } } },
    },
  },
  FinancialTransactionResponse: {
    type: "object",
    properties: {
      transactionId: { type: "string", format: "uuid" },
      bookingId: { type: "string", format: "uuid" },
      customer: { type: "object", additionalProperties: true },
      vendor: { type: "object", additionalProperties: true },
      salon: { type: "object", additionalProperties: true },
      branch: { type: "object", nullable: true, additionalProperties: true },
      bookingAmount: { type: "string", example: "1000.00" },
      commissionRate: { type: "string", example: "30.00" },
      commissionAmount: { type: "string", example: "300.00" },
      vendorGrossAmount: { type: "string", example: "1000.00" },
      vendorPayableAmount: { type: "string", example: "700.00" },
      transactionType: { type: "string" },
      paymentStatus: { type: "string" },
      approvalStatus: { type: "string" },
      settlementStatus: { type: "string" },
      razorpayReference: { type: "string", nullable: true },
      createdAt: { type: "string", format: "date-time" },
      approvedAt: { type: "string", format: "date-time", nullable: true },
      settledAt: { type: "string", format: "date-time", nullable: true },
    },
    additionalProperties: true,
  },
  FinancialTransactionDetailResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: {
        allOf: [
          { $ref: "#/components/schemas/FinancialTransactionResponse" },
          { type: "object", properties: {
            booking: { type: "object", description: "Booking details, selected services, and payment records", additionalProperties: true },
            walletEntries: { type: "array", items: { type: "object", additionalProperties: true } },
            settlements: { type: "array", items: { type: "object", additionalProperties: true } },
            auditLogs: { type: "array", items: { type: "object", additionalProperties: true } },
          } },
        ],
      },
    },
  },
  PaginatedFinancialTransactionResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: {
        type: "object",
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/FinancialTransactionResponse" } },
          items: { type: "array", items: { $ref: "#/components/schemas/FinancialTransactionResponse" }, description: "Backward-compatible alias of data" },
          pagination: { $ref: "#/components/schemas/FinancePaginationResponse" },
        },
      },
    },
  },
  PendingSettlementResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: {
        type: "object",
        properties: {
          totalEligibleAmount: { type: "string", example: "125000.00" },
          todaySettlementAmount: { type: "string", example: "125000.00" },
          pendingApprovalAmount: { type: "string", example: "35000.00" },
          processingAmount: { type: "string", example: "20000.00" },
          failedAmount: { type: "string", example: "0.00" },
          eligibleVendorCount: { type: "integer", example: 28 },
          eligibleTransactionCount: { type: "integer", example: 146 },
          nextSettlementAt: { type: "string", format: "date-time", nullable: true },
          data: { type: "array", items: { $ref: "#/components/schemas/FinancialTransactionResponse" } },
          pagination: { $ref: "#/components/schemas/FinancePaginationResponse" },
        },
      },
    },
  },
  CommissionSettingsResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: { type: "object", properties: { commissionType: { type: "string", enum: ["PERCENTAGE", "FIXED"] }, commissionValue: { type: "number", example: 30 }, currency: { type: "string", example: "INR" }, status: { type: "string", enum: ["ACTIVE", "INACTIVE"] }, effectiveFrom: { type: "string", format: "date-time" } } },
    },
  },
  SettlementSettingsResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: { type: "object", properties: { settlementMode: { type: "string", enum: ["MANUAL", "AUTOMATIC"] }, intervalValue: { type: "integer", example: 1 }, intervalUnit: { type: "string", enum: ["SECONDS", "MINUTES", "HOURS", "DAYS", "WEEKS", "MONTHS"] }, minimumSettlementAmount: { type: "string", example: "0.00" }, autoSettlementEnabled: { type: "boolean" }, nextSettlementAt: { type: "string", format: "date-time", nullable: true }, sourceAccountNumber: { type: "string", nullable: true, example: "********1234" }, sourceAccountConfigured: { type: "boolean" } } },
    },
  },
  SettlementResponse: {
    type: "object",
    properties: {
      settlementId: { type: "string", format: "uuid" },
      vendor: { type: "object", additionalProperties: true },
      salon: { type: "object", nullable: true, additionalProperties: true },
      branch: { type: "object", nullable: true, additionalProperties: true },
      amount: { type: "string", example: "700.00" },
      status: { type: "string", enum: ["PROCESSING", "PENDING", "QUEUED", "PAID", "FAILED", "REVERSED", "MANUAL_REVIEW"] },
      razorpayReference: { type: "string", nullable: true },
      initiatedAt: { type: "string", format: "date-time" },
      completedAt: { type: "string", format: "date-time", nullable: true },
      failureReason: { type: "string", nullable: true },
    },
    additionalProperties: true,
  },
  PaginatedSettlementResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/SettlementResponse" } }, items: { type: "array", items: { $ref: "#/components/schemas/SettlementResponse" } }, pagination: { $ref: "#/components/schemas/FinancePaginationResponse" } } },
    },
  },
  VendorWalletSummaryResponse: {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: { type: "object", properties: { wallet: { type: "object", properties: { pendingBalance: { type: "string" }, availableBalance: { type: "string" }, processingBalance: { type: "string" }, paidBalance: { type: "string" }, currency: { type: "string" } } }, totals: { type: "object", properties: { totalBookingValue: { type: "string" }, totalCommission: { type: "string" }, totalVendorPayable: { type: "string" } } } } },
    },
  },
};
