import { prisma } from "../../infrastructure/database/prisma";
import { BookingSource } from "@prisma/client";

const gstService = {
  /**
   * Get or create GST configuration for a salon
   */
  async getOrCreateGSTConfig(salonId: string) {
    let config = await prisma.gSTConfiguration.findUnique({
      where: { salonId },
    });

    if (!config) {
      config = await prisma.gSTConfiguration.create({
        data: {
          salonId,
          cgstRate: 9.0,
          sgstRate: 9.0,
          igstRate: 18.0,
          isActive: true,
        },
      });
    }

    return config;
  },

  /**
   * Get GST configuration for a salon
   */
  async getGSTConfig(salonId: string) {
    return prisma.gSTConfiguration.findUnique({
      where: { salonId },
    });
  },

  /**
   * Update GST configuration
   */
  async updateGSTConfig(salonId: string, payload: any) {
    const { cgstRate, sgstRate, igstRate, isActive } = payload;

    if (cgstRate && cgstRate < 0 || cgstRate > 100) {
      throw { status: 400, message: "CGST rate must be between 0 and 100" };
    }

    if (sgstRate && sgstRate < 0 || sgstRate > 100) {
      throw { status: 400, message: "SGST rate must be between 0 and 100" };
    }

    if (igstRate && igstRate < 0 || igstRate > 100) {
      throw { status: 400, message: "IGST rate must be between 0 and 100" };
    }

    const config = await prisma.gSTConfiguration.upsert({
      where: { salonId },
      create: {
        salonId,
        cgstRate: cgstRate || 9.0,
        sgstRate: sgstRate || 9.0,
        igstRate: igstRate || 18.0,
        isActive: isActive !== undefined ? isActive : true,
      },
      update: {
        ...(cgstRate !== undefined && { cgstRate }),
        ...(sgstRate !== undefined && { sgstRate }),
        ...(igstRate !== undefined && { igstRate }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return config;
  },

  /**
   * Calculate GST for a booking
   */
  calculateGST(
    amount: number,
    cgstRate: number,
    sgstRate: number,
    igstRate: number,
    taxType: "CGST_SGST" | "IGST" = "CGST_SGST"
  ) {
    const cgstAmount = taxType === "CGST_SGST" ? (amount * cgstRate) / 100 : 0;
    const sgstAmount = taxType === "CGST_SGST" ? (amount * sgstRate) / 100 : 0;
    const igstAmount = taxType === "IGST" ? (amount * igstRate) / 100 : 0;

    return {
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: Math.round(igstAmount * 100) / 100,
      totalTax: Math.round((cgstAmount + sgstAmount + igstAmount) * 100) / 100,
    };
  },

  /**
   * Apply GST to booking amount
   */
  applyGSTToBooking(
    totalAmount: number,
    discount: number,
    cgstRate: number,
    sgstRate: number,
    igstRate: number,
    taxType: "CGST_SGST" | "IGST" = "CGST_SGST",
    isActive = true
  ) {
    const discountAmount = (totalAmount * discount) / 100;
    const taxableAmount = totalAmount - discountAmount;

    const gstCalculation = isActive ? gstService.calculateGST(
      taxableAmount,
      cgstRate,
      sgstRate,
      igstRate,
      taxType
    ) : { cgstAmount: 0, sgstAmount: 0, igstAmount: 0, totalTax: 0 };

    return {
      taxableAmount,
      discountAmount,
      cgstAmount: gstCalculation.cgstAmount,
      sgstAmount: gstCalculation.sgstAmount,
      igstAmount: gstCalculation.igstAmount,
      totalTaxAmount: gstCalculation.totalTax,
      finalAmount: taxableAmount + gstCalculation.totalTax,
    };
  },

  /**
   * Get booking with GST details
   */
  async getBookingWithGST(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            countryCode: true,
          },
        },
        staff: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        services: {
          include: {
            service: true,
            combo: true,
          },
        },
        payments: true,
        salon: {
          select: {
            id: true,
            name: true,
            address: true,
            contacts: true,
          },
        },
        gstConfig: true,
      },
    });

    if (!booking) {
      throw { status: 404, message: "Booking not found" };
    }

    return {
      ...booking,
      gstSummary: {
        baseAmount: booking.totalAmount,
        discount: booking.discountAmount,
        taxableAmount: booking.taxableAmount,
        cgst: {
          rate: booking.gstConfig?.cgstRate || 0,
          amount: booking.cgstAmount,
        },
        sgst: {
          rate: booking.gstConfig?.sgstRate || 0,
          amount: booking.sgstAmount,
        },
        igst: {
          rate: booking.gstConfig?.igstRate || 0,
          amount: booking.igstAmount,
        },
        totalTax: booking.totalTaxAmount,
        finalAmount: booking.finalAmount,
        amountPaid: booking.totalPaid,
        amountDue: booking.finalAmount - booking.totalPaid,
      },
    };
  },

  async getBookingInvoice(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingDate: true,
        status: true,
        bookingSource: true,
        medium: true,
        totalAmount: true,
        discount: true,
        discountAmount: true,
        taxableAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        totalTaxAmount: true,
        finalAmount: true,
        totalPaid: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true, email: true, phone: true, countryCode: true },
        },
        staff: {
          select: { user: { select: { firstName: true, lastName: true } } },
        },
        services: {
          select: {
            name: true,
            price: true,
            quantity: true,
            service: { select: { category: { select: { name: true } } } },
            combo: { select: { name: true } },
          },
        },
        payments: {
          select: {
            amount: true,
            method: true,
            status: true,
            transactionId: true,
            completedAt: true,
            createdAt: true,
            refunds: { select: { amount: true, currency: true, status: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        salon: {
          select: {
            name: true,
            address: {
              select: { line1: true, line2: true, city: true, state: true, country: true, pincode: true },
            },
            contacts: {
              select: { phone: true, countryCode: true, email: true },
              orderBy: { isPrimary: "desc" },
              take: 1,
            },
            images: { select: { url: true }, take: 1 },
          },
        },
        branch: { select: { name: true } },
        coupon: { select: { code: true, title: true } },
        couponRedemptions: { select: { amount: true } },
        gstConfig: { select: { cgstRate: true, sgstRate: true, igstRate: true } },
      },
    });

    if (!booking) throw { status: 404, message: "Booking not found" };

    const invoiceNumber = `INV-${booking.id.slice(0, 8).toUpperCase()}`;
    const contact = booking.salon.contacts[0];
    const staffName = booking.staff
      ? `${booking.staff.user.firstName} ${booking.staff.user.lastName ?? ""}`.trim()
      : null;
    const services = booking.services.map((item) => ({
      name: item.name,
      category: item.service?.category?.name ?? null,
      itemType: item.combo ? "COMBO" : "SERVICE",
      staffName,
      quantity: item.quantity,
      unitPrice: item.price,
      discount: 0,
      tax: 0,
      amount: item.price * item.quantity,
    }));
    const paymentDetails = booking.payments.map((payment) => ({
      method: payment.method,
      amount: payment.amount,
      status: payment.status,
      transactionId: payment.transactionId,
      date: payment.completedAt ?? payment.createdAt,
      refunds: payment.refunds
        .filter((refund) => refund.status === "PROCESSED")
        .map((refund) => ({ amount: Number(refund.amount), currency: refund.currency })),
    }));
    const refundAmount = paymentDetails.reduce(
      (total, payment) => total + payment.refunds.reduce((sum, refund) => sum + refund.amount, 0),
      0,
    );
    const couponDiscount = booking.coupon
      ? booking.couponRedemptions.reduce((total, redemption) => total + redemption.amount, 0) || booking.discountAmount
      : 0;
    const hasRefundedPayment = booking.payments.some((payment) => payment.status === "REFUNDED");
    const hasCompletedPayment = booking.payments.some((payment) => payment.status === "COMPLETED");
    const address = booking.salon.address;

    return {
      invoiceNumber,
      bookingReference: invoiceNumber.replace(/^INV-/, "BK-"),
      invoiceDate: booking.createdAt,
      bookingDate: booking.bookingDate,
      bookingTime: booking.bookingDate,
      invoiceStatus: booking.status,
      bookingSource: booking.bookingSource ?? (booking.medium === "APP" ? BookingSource.APP : null),
      salon: {
        name: booking.salon.name,
        logo: booking.salon.images[0]?.url ?? null,
        address,
        contacts: booking.salon.contacts,
        phone: contact ? `${contact.countryCode}${contact.phone}` : null,
        email: contact?.email ?? null,
      },
      branch: booking.branch?.name ?? null,
      customer: {
        name: `${booking.customer.firstName} ${booking.customer.lastName ?? ""}`.trim(),
        firstName: booking.customer.firstName,
        lastName: booking.customer.lastName,
        email: booking.customer.email,
        phone: `${booking.customer.countryCode}${booking.customer.phone}`,
        address: null,
      },
      staff: staffName ? { name: staffName } : null,
      services,
      summary: {
        subtotal: booking.totalAmount,
        discount: booking.discountAmount,
        discountPercent: booking.discount,
        manualDiscount: Math.max(booking.discountAmount - couponDiscount, 0),
        manualDiscountPercent: couponDiscount ? 0 : booking.discount,
        couponDiscount,
        coupon: booking.coupon ? { code: booking.coupon.code, title: booking.coupon.title } : null,
        taxableAmount: booking.taxableAmount,
        cgst: { rate: booking.gstConfig?.cgstRate ?? 0, amount: booking.cgstAmount },
        sgst: { rate: booking.gstConfig?.sgstRate ?? 0, amount: booking.sgstAmount },
        igst: { rate: booking.gstConfig?.igstRate ?? 0, amount: booking.igstAmount },
        totalTax: booking.totalTaxAmount,
        otherCharges: 0,
        finalAmount: booking.finalAmount,
        amountPaid: booking.totalPaid,
        amountDue: Math.max(booking.finalAmount - booking.totalPaid, 0),
        refundAmount,
      },
      payment: {
        status: hasRefundedPayment
          ? hasCompletedPayment ? "PARTIALLY_REFUNDED" : "REFUNDED"
          : hasCompletedPayment
            ? booking.totalPaid >= booking.finalAmount ? "PAID" : "PARTIALLY_PAID"
            : booking.payments[0]?.status ?? "PENDING",
        method: booking.payments.map((payment) => payment.method).filter((method, index, values) => values.indexOf(method) === index).join(", ") || null,
        transactionId: booking.payments.find((payment) => payment.transactionId)?.transactionId ?? null,
        paymentDetails,
        amountPaid: booking.totalPaid,
        amountDue: Math.max(booking.finalAmount - booking.totalPaid, 0),
      },
    };
  },
};

export { gstService };
