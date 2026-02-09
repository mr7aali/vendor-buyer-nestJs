# Payment + Stripe Connect Frontend API (React Native)

This document describes the API calls the React Native app should use for Stripe Connect onboarding and buyer payments.

## Base URL
Use your backend URL, for example:

```text
http://localhost:3000
```

## Auth Header
All endpoints below require a JWT token.

```http
Authorization: Bearer <JWT>
```

## Vendor Stripe Connect (Onboarding)

### 1) Create Stripe Account (Vendor)

```http
POST /payments/vendor/stripe/account
Authorization: Bearer <VENDOR_JWT>
```

Response (example):

```json
{
  "stripeAccountId": "acct_123",
  "chargesEnabled": false,
  "payoutsEnabled": false,
  "status": "pending"
}
```

### 2) Create Account Onboarding Link (Vendor)

```http
POST /payments/vendor/stripe/account-link
Authorization: Bearer <VENDOR_JWT>
```

Response (example):

```json
{
  "url": "https://connect.stripe.com/express/onboarding/...",
  "expiresAt": 1730000000
}
```

Frontend action:
- Open `url` in a web view or browser.
- After onboarding, Stripe redirects to `STRIPE_CONNECT_RETURN_URL`.

### 3) Check Stripe Account Status (Vendor)

```http
GET /payments/vendor/stripe/status
Authorization: Bearer <VENDOR_JWT>
```

Response (example):

```json
{
  "stripeAccountId": "acct_123",
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "status": "verified"
}
```

## Buyer Payment Flow (Stripe Checkout)

### 1) Create Payment Intent (Buyer)

```http
POST /payments/create-intent
Authorization: Bearer <BUYER_JWT>
Content-Type: application/json

{
  "orderId": "<order_uuid>"
}
```

Response (example):

```json
{
  "success": true,
  "paymentId": "payment_uuid",
  "sessionId": "cs_test_...",
  "paymentLink": "https://checkout.stripe.com/c/pay/cs_test_...",
  "expiresAt": "2026-02-10T12:00:00.000Z",
  "orderId": "order_uuid",
  "orderNumber": "ORD-1234",
  "amount": 100,
  "adminCommissionAmount": 10,
  "vendorPayoutAmount": 90
}
```

Frontend action:
- Open `paymentLink` in a WebView or external browser.
- Stripe redirects to your `FRONTEND_URL` success or cancel URL.

### 2) Get Payment Status (Buyer)

```http
GET /payments/status/:sessionId
Authorization: Bearer <BUYER_JWT>
```

Response (example):

```json
{
  "sessionStatus": "complete",
  "paymentStatus": "paid",
  "paymentRecord": {
    "id": "payment_uuid",
    "status": "succeeded",
    "amount": "100",
    "adminCommissionAmount": "10",
    "vendorPayoutAmount": "90",
    "order": {
      "id": "order_uuid",
      "orderNumber": "ORD-1234",
      "status": "processing"
    }
  }
}
```

### 3) Get Payment by Order ID (Buyer)

```http
GET /payments/order/:orderId
Authorization: Bearer <BUYER_JWT>
```

## React Native Implementation (Sample)

### Open Stripe Checkout

```ts
import { Linking } from "react-native";

async function openCheckout(paymentLink: string) {
  await Linking.openURL(paymentLink);
}
```

### Handle Success/Cancel Redirect

Use a deep link scheme like `myapp://` in `FRONTEND_URL` (or a universal link). After payment, Stripe redirects to:

```
myapp://payment/success?session_id=cs_test_...&order_id=...
myapp://payment/cancel?order_id=...
```

Example listener:

```ts
import { Linking } from "react-native";

function listenPaymentRedirect(onSuccess: (sessionId: string, orderId?: string) => void) {
  const handler = ({ url }: { url: string }) => {
    const parsed = new URL(url);
    if (parsed.pathname.includes("/payment/success")) {
      const sessionId = parsed.searchParams.get("session_id") || "";
      const orderId = parsed.searchParams.get("order_id") || undefined;
      onSuccess(sessionId, orderId);
    }
  };

  Linking.addEventListener("url", handler);
  return () => Linking.removeEventListener("url", handler);
}
```

### Confirm Payment

```ts
async function getPaymentStatus(sessionId: string, token: string) {
  const res = await fetch(`${API_URL}/payments/status/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
```

## Notes
- Commission is calculated on `order.totalAmount` using `ADMIN_COMMISSION_RATE`.
- Stripe Connect Destination Charge is used:
  - Buyer pays on platform
  - Platform fee is collected via `application_fee_amount`
  - Remaining amount transfers to vendor Stripe balance
  - Stripe handles vendor payouts based on their payout schedule
