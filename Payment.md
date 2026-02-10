# Payment API Flow with Stripe Connect

This guide covers the payment flow with Stripe Connect (Destination Charge + Application Fee).

## 1) Vendor Onboarding (Stripe Connect)

### Create Stripe Account

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

### Create Account Onboarding Link

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

Open the `url` in a WebView or browser for the vendor to finish onboarding.

### Check Stripe Account Status

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

## 2) Buyer Payment Flow

### Create Payment Intent (Checkout Session)

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

Open `paymentLink` in a WebView or external browser.

### Success & Cancel URLs

Stripe redirects to:

```
{FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=<order_id>
{FRONTEND_URL}/payment/cancel?order_id=<order_id>
```

## 3) Webhook (Stripe -> Backend)

Stripe will call:

```
POST /payments/webhook
stripe-signature: ...
```

Handled events:
- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `account.updated`
- `account.application.deauthorized`

## 4) Check Payment Status (Optional)

```http
GET /payments/status/:sessionId
Authorization: Bearer <BUYER_JWT>
```

## 5) Get Payment by Order (Optional)

```http
GET /payments/order/:orderId
Authorization: Bearer <BUYER_JWT>
```

## Commission Split

- Commission is calculated on `order.totalAmount` using `ADMIN_COMMISSION_RATE`.
- Stripe Connect Destination Charge is used:
  - Buyer pays on platform
  - Platform fee is collected via `application_fee_amount`
  - Remaining amount transfers to vendor Stripe balance
  - Stripe handles vendor payouts on their schedule
