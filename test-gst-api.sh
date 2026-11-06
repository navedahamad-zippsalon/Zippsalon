#!/bin/bash

# GST API Testing Script
# This script demonstrates all GST endpoints

API_URL="http://localhost:4000/api/v1"
EMAIL="admin@zippsalon.com"
PASSWORD="Admin@123"

echo "========================================="
echo "GST System API Testing"
echo "========================================="

# Step 1: Login
echo ""
echo "Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful!"
echo "Token: ${TOKEN:0:20}..."

# Step 2: Get salons to find a valid salonId
echo ""
echo "Step 2: Fetching salons..."
SALONS_RESPONSE=$(curl -s -X GET "$API_URL/salons" \
  -H "Authorization: Bearer $TOKEN")

SALON_ID=$(echo $SALONS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')

if [ -z "$SALON_ID" ]; then
  echo "❌ Could not find a salon!"
  exit 1
fi

echo "✅ Found salon: $SALON_ID"

# Step 3: Get GST Configuration
echo ""
echo "Step 3: Getting GST Configuration for salon..."
GST_CONFIG=$(curl -s -X GET "$API_URL/gst/config/$SALON_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "GST Config Response:"
echo $GST_CONFIG | jq '.'

# Step 4: Update GST Configuration
echo ""
echo "Step 4: Updating GST Configuration..."
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/gst/config/$SALON_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cgstRate": 9.0,
    "sgstRate": 9.0,
    "igstRate": 18.0,
    "isActive": true
  }')

echo "Update Response:"
echo $UPDATE_RESPONSE | jq '.'

# Step 5: Create a booking (this will automatically calculate GST)
echo ""
echo "Step 5: Creating a booking with automatic GST calculation..."

# First, get a customer
CUSTOMERS_RESPONSE=$(curl -s -X GET "$API_URL/customers" \
  -H "Authorization: Bearer $TOKEN")

CUSTOMER_ID=$(echo $CUSTOMERS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')

if [ -z "$CUSTOMER_ID" ]; then
  echo "Note: No customer found, using new customer data"
  CUSTOMER_ID=""
fi

# Get staff
STAFF_RESPONSE=$(curl -s -X GET "$API_URL/staff/salon/$SALON_ID" \
  -H "Authorization: Bearer $TOKEN")

STAFF_ID=$(echo $STAFF_RESPONSE | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')

if [ -z "$STAFF_ID" ]; then
  echo "❌ Could not find a staff member!"
  exit 1
fi

echo "Found staff: $STAFF_ID"

# Get services
SERVICES_RESPONSE=$(curl -s -X GET "$API_URL/services?salonId=$SALON_ID" \
  -H "Authorization: Bearer $TOKEN")

SERVICE_ID=$(echo $SERVICES_RESPONSE | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')

if [ -z "$SERVICE_ID" ]; then
  echo "❌ Could not find a service!"
  exit 1
fi

echo "Found service: $SERVICE_ID"

# Create booking
BOOKING_RESPONSE=$(curl -s -X POST "$API_URL/bookings/salon/$SALON_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "'$CUSTOMER_ID'",
    "staffId": "'$STAFF_ID'",
    "bookingDate": "2026-08-29T14:30:00Z",
    "discount": 10,
    "items": [
      {
        "serviceId": "'$SERVICE_ID'",
        "name": "Service 1",
        "price": 500
      },
      {
        "serviceId": "'$SERVICE_ID'",
        "name": "Service 2",
        "price": 500
      }
    ],
    "payment": {
      "method": "CASH",
      "amount": 600
    }
  }')

echo "Booking Response:"
echo $BOOKING_RESPONSE | jq '.'

BOOKING_ID=$(echo $BOOKING_RESPONSE | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')

# Step 6: Get Booking with GST Details
if [ ! -z "$BOOKING_ID" ]; then
  echo ""
  echo "Step 6: Getting booking with GST details..."
  GST_BOOKING=$(curl -s -X GET "$API_URL/gst/booking/$BOOKING_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "Booking with GST Details:"
  echo $GST_BOOKING | jq '.data | {
    totalAmount,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTaxAmount,
    finalAmount,
    totalPaid,
    gstSummary
  }'

  # Step 7: Get Printable Invoice
  echo ""
  echo "Step 7: Getting printable invoice..."
  INVOICE=$(curl -s -X GET "$API_URL/gst/print/$BOOKING_ID" \
    -H "Authorization: Bearer $TOKEN")

  echo "Invoice Data:"
  echo $INVOICE | jq '.data | {
    invoiceNumber,
    invoiceDate,
    bookingDate,
    summary,
    payment
  }'
fi

echo ""
echo "========================================="
echo "✅ GST API Testing Complete"
echo "========================================="
