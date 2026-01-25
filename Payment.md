# Payment API Flow - Simple Step-by-Step Guide

## 🎯 Complete Payment Flow

### Step 1: User Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "buyer@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "buyer@example.com",
    "userType": "buyer"
  }
}
```

**Save:** `access_token` for next requests

---

### Step 2: Create Order

```http
POST /orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "vendorId": "vendor-uuid",
  "items": [
    {
      "productId": "product-uuid",
      "quantity": 2
    }
  ],
  "shippingAddress": "123 Main St"
}
```

**Response:**

```json
{
  "id": "order-uuid-12345",
  "orderNumber": "ORD-12345",
  "totalAmount": 99.99,
  "status": "pending"
}
```

**Save:** `id` (order UUID) for payment

---

### Step 3: Create Payment Session

```http
POST /payments/create-intent
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "orderId": "order-uuid-12345"
}
```

**Response:**

```json
{
  "success": true,
  "paymentId": "payment-uuid",
  "sessionId": "cs_test_a1B2c3D4...",
  "paymentLink": "https://checkout.stripe.com/c/pay/cs_test_...",
  "expiresAt": "2026-01-25T15:30:00.000Z",
  "orderId": "order-uuid-12345",
  "orderNumber": "ORD-12345",
  "amount": 99.99
}
```

**Action:** Redirect user to `paymentLink`

---

### Step 4: User Completes Payment

User is redirected to Stripe Checkout page at `paymentLink`

**Test Card (Use on Stripe page):**

- Card Number: `4242 4242 4242 4242`
- Expiry: `12/34` (any future date)
- CVC: `123` (any 3 digits)
- ZIP: `12345` (any 5 digits)

---

### Step 5: Stripe Sends Webhook (Automatic)

**Stripe automatically calls:**

```http
POST /payments/webhook
stripe-signature: t=1234567890,v1=abc123...
Content-Type: application/json

{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1B2c3D4...",
      "status": "complete",
      "payment_status": "paid",
      "metadata": {
        "orderId": "order-uuid-12345"
      }
    }
  }
}
```

**Backend automatically:**

- Updates Payment status → `"succeeded"`
- Updates Order status → `"processing"`

**User is redirected to:** `success_url` with session_id

---

### Step 6: Check Payment Status (Optional)

```http
GET /payments/status/cs_test_a1B2c3D4...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "sessionStatus": "complete",
  "paymentStatus": "paid",
  "paymentRecord": {
    "id": "payment-uuid",
    "status": "succeeded",
    "amount": "99.99",
    "order": {
      "id": "order-uuid-12345",
      "orderNumber": "ORD-12345",
      "status": "processing"
    }
  }
}
```

---

### Step 7: Get Payment by Order (Optional)

```http
GET /payments/order/order-uuid-12345
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**

```json
{
  "id": "payment-uuid",
  "orderId": "order-uuid-12345",
  "stripePaymentId": "cs_test_a1B2c3D4...",
  "amount": "99.99",
  "status": "succeeded",
  "createdAt": "2026-01-25T14:30:00.000Z",
  "order": {
    "id": "order-uuid-12345",
    "orderNumber": "ORD-12345",
    "totalAmount": "99.99",
    "status": "processing"
  }
}
```

---

## 📊 Flow Diagram

```
1. POST /auth/login
   → Get JWT token
   ↓

2. POST /orders
   → Get orderId
   ↓

3. POST /payments/create-intent
   → Get paymentLink
   ↓

4. User clicks paymentLink
   → Redirected to Stripe Checkout
   → Enters card details
   → Completes payment
   ↓

5. Stripe sends webhook (automatic)
   → POST /payments/webhook
   → Payment status: "succeeded"
   → Order status: "processing"
   ↓

6. User redirected to success page
   ↓

7. GET /payments/status/:sessionId (optional)
   → Verify payment success
```

---

## 🧪 Testing Without Real Payment

### Option 1: Use Test Webhook Endpoint

```http
POST /payments/webhook/test
Content-Type: application/json

{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1B2c3D4...",
      "metadata": {
        "orderId": "order-uuid-12345"
      }
    }
  }
}
```

This simulates Step 5 without going through Stripe.

### Option 2: Use Stripe CLI

```bash
stripe listen --forward-to localhost:4000/payments/webhook
stripe trigger checkout.session.completed
```

---

## 📝 Quick Reference

| Step | Endpoint                      | Method | Auth   | Purpose             |
| ---- | ----------------------------- | ------ | ------ | ------------------- |
| 1    | `/auth/login`                 | POST   | No     | Get JWT token       |
| 2    | `/orders`                     | POST   | Yes    | Create order        |
| 3    | `/payments/create-intent`     | POST   | Yes    | Get payment link    |
| 4    | -                             | -      | -      | User pays on Stripe |
| 5    | `/payments/webhook`           | POST   | Stripe | Auto-update status  |
| 6    | `/payments/status/:sessionId` | GET    | Yes    | Check payment       |
| 7    | `/payments/order/:orderId`    | GET    | Yes    | Get payment info    |

---

## 🎯 Minimal Test Flow

**Just want to test quickly?**

```bash
# 1. Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@test.com","password":"password123"}'

# Save token from response

# 2. Create Order (replace TOKEN)
curl -X POST http://localhost:4000/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vendorId":"vendor-uuid","items":[...]}'

# Save orderId from response

# 3. Create Payment (replace TOKEN and ORDER_ID)
curl -X POST http://localhost:4000/payments/create-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORDER_ID"}'

# Open paymentLink in browser
# Use card: 4242 4242 4242 4242

# 4. Check status (replace TOKEN and SESSION_ID)
curl http://localhost:4000/payments/status/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Success Indicators

**Payment Successful When:**

- Payment status = `"succeeded"`
- Order status = `"processing"`
- Session status = `"complete"`
- Payment status = `"paid"`

**Payment Failed When:**

- Payment status = `"failed"`
- Session status = `"expired"` (after 1 hour)

---

## 🔥 Common Issues

### "Order not found"

- Check orderId is correct
- Make sure order exists in database

### "Forbidden"

- User must own the order
- Check if logged in as correct buyer

### "Order already paid"

- Payment already succeeded
- Check payment status first

### "Missing stripe-signature"

- Use `/payments/webhook/test` for manual testing
- Or use Stripe CLI for real webhooks
