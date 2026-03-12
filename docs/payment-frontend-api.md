# Stripe Frontend Playbook

This document explains the full Stripe flow for the frontend team.

It is written for two audiences:

1. A frontend developer implementing the flow manually
2. A Codex agent working inside the frontend repository

The backend behavior described here matches the current code in:

- `src/payments/payments.controller.ts`
- `src/payments/payments.service.ts`

## 1. Read This First

The current backend does not use a frontend Stripe SDK flow.

That means:

- Do not build Stripe Elements
- Do not build PaymentSheet
- Do not call `confirmPayment`
- Do not expect a `client_secret`
- Do not collect card details inside your own UI

What the frontend actually does:

- For vendor onboarding, open a Stripe Connect account link returned by the backend
- For buyer payment, open a Stripe Checkout URL returned by the backend
- After Stripe redirects back, verify status with the backend

In short:

- Frontend opens URLs
- Backend talks to Stripe
- Stripe webhook is the final source of truth

## 2. What Frontend Must Build

### Vendor side

Build these pieces:

- A "Connect Stripe" or "Payout Setup" button
- A vendor payout status section
- A handler for returning from Stripe onboarding
- A retry path when onboarding is still incomplete

### Buyer side

Build these pieces:

- A "Pay now" button on the order screen
- A success route or screen at `/payment/success`
- A cancel route or screen at `/payment/cancel`
- A payment verification step after success redirect
- A retry path when payment is still pending

### What frontend does not need

- No Stripe publishable key for the current flow
- No direct Stripe API calls from frontend
- No webhook handling in frontend
- No embedded card form

## 3. Backend Routes Summary

Base backend URL example:

```text
http://localhost:3000
```

Current backend routes do not use a global `/api` prefix.

Payment routes:

- `POST /payments/vendor/stripe/account`
- `POST /payments/vendor/stripe/account-link`
- `GET /payments/vendor/stripe/status`
- `POST /payments/create-intent`
- `GET /payments/status/:sessionId`
- `GET /payments/order/:orderId`

JWT auth:

- Vendor routes require vendor JWT
- `POST /payments/create-intent` requires buyer JWT
- `GET /payments/status/:sessionId` requires JWT
- `GET /payments/order/:orderId` requires JWT

Important backend caveat:

- The last two read endpoints require JWT, but the current service layer does not verify ownership. Frontend should only call them in logged-in payment screens.

## 3.1 Backend Environment Values That Affect Frontend

These backend env vars change frontend behavior:

- `FRONTEND_URL`
- `STRIPE_CONNECT_RETURN_URL`
- `STRIPE_CONNECT_REFRESH_URL`

How they are used:

- `FRONTEND_URL` is used to build buyer redirect URLs after Checkout
- `STRIPE_CONNECT_RETURN_URL` is used after vendor onboarding returns from Stripe
- `STRIPE_CONNECT_REFRESH_URL` is used when Stripe asks the vendor to restart or resume onboarding

Frontend coordination rule:

- Make sure backend points these values to routes or app links the frontend can actually handle
- Prefer not to use a trailing slash in `FRONTEND_URL`

## 4. The Two Main Flows

There are only two frontend Stripe flows in this backend.

### Flow A: Vendor Stripe Connect onboarding

Use this when a vendor needs to connect Stripe to receive payouts.

### Flow B: Buyer Checkout payment

Use this when a buyer pays for an existing order.

## 5. Flow A: Vendor Stripe Connect Onboarding

This is the full happy-path flow for vendors.

### 5.1 User journey

1. Vendor opens payout settings
2. Frontend calls `POST /payments/vendor/stripe/account`
3. If vendor is already verified, stop there
4. Otherwise frontend calls `POST /payments/vendor/stripe/account-link`
5. Frontend opens the returned Stripe URL
6. Vendor completes or partially completes the Stripe onboarding form
7. Stripe redirects back to the configured return or refresh URL
8. Frontend calls `GET /payments/vendor/stripe/status`
9. Frontend shows one of:
   - verified
   - pending
   - restricted

### 5.2 What each step means

#### Step 1: Create or fetch vendor Stripe account

Request:

```http
POST /payments/vendor/stripe/account
Authorization: Bearer <VENDOR_JWT>
```

Response shape:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "stripeAccountId": "acct_123456789",
    "chargesEnabled": false,
    "payoutsEnabled": false,
    "status": "pending"
  }
}
```

Notes:

- If vendor already has a Stripe account, backend returns the existing one
- This endpoint is safe to call whenever vendor opens payout setup

#### Step 2: Create onboarding link

Request:

```http
POST /payments/vendor/stripe/account-link
Authorization: Bearer <VENDOR_JWT>
```

Response shape:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "url": "https://connect.stripe.com/express/onboarding/...",
    "expiresAt": 1760000000
  }
}
```

Notes:

- `url` must be opened immediately
- `expiresAt` is a Unix timestamp in seconds
- If the vendor closes the flow, you can request a new account link later

#### Step 3: Open Stripe page

Frontend behavior:

- Open `data.url` in the browser or the app flow you already use for external links
- Do not try to recreate the onboarding form in your own UI

#### Step 4: Handle return from Stripe

Stripe uses backend-configured URLs:

- `STRIPE_CONNECT_RETURN_URL`
- `STRIPE_CONNECT_REFRESH_URL`

Frontend should treat both as "resume onboarding" entry points.

When vendor lands back in the app:

1. Show a loader
2. Call `GET /payments/vendor/stripe/status`
3. Update UI from the returned status

#### Step 5: Read final vendor Stripe state

Request:

```http
GET /payments/vendor/stripe/status
Authorization: Bearer <VENDOR_JWT>
```

Response shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "stripeAccountId": "acct_123456789",
    "chargesEnabled": true,
    "payoutsEnabled": true,
    "status": "verified"
  }
}
```

Interpretation:

- `verified`: vendor can receive payments
- `pending`: vendor must finish Stripe onboarding
- `restricted`: Stripe needs action or the app was deauthorized

### 5.3 Vendor UI rules

Show vendor as payout-ready only if all are true:

- `status === "verified"`
- `chargesEnabled === true`
- `payoutsEnabled === true`

Recommended UI copy:

- `pending`: "Finish Stripe setup"
- `verified`: "Stripe connected"
- `restricted`: "Stripe account needs attention"

### 5.4 Vendor errors to handle

Common cases:

- `404 Vendor profile not found`
- `400 Vendor is not onboarded to Stripe`

Frontend behavior:

- If account-link returns `Vendor is not onboarded to Stripe`, call the account creation endpoint first
- If status is still `pending`, allow vendor to reopen onboarding

## 6. Flow B: Buyer Payment With Stripe Checkout

This is the full buyer payment flow.

### 6.1 Important truth before implementing

The route is named `create-intent`, but it does not create a frontend-confirmed Payment Intent flow.

It creates a Stripe Checkout Session and returns a hosted Checkout URL.

So the buyer flow is:

1. Ask backend for Checkout Session
2. Open returned Stripe URL
3. Wait for redirect back
4. Verify with backend

### 6.2 Buyer happy path

1. Buyer opens order details
2. Buyer taps "Pay now"
3. Frontend calls `POST /payments/create-intent` with `orderId`
4. Backend returns `paymentLink`
5. Frontend opens `paymentLink`
6. Buyer completes payment on Stripe-hosted page
7. Stripe redirects back to frontend success route
8. Frontend reads `session_id`
9. Frontend calls `GET /payments/status/:sessionId`
10. If still pending, frontend polls briefly
11. When backend says `paymentRecord.status === "succeeded"`, show success
12. Refresh order details

### 6.3 Preconditions the backend enforces

Before payment can start, backend checks:

- order exists
- order belongs to the logged-in buyer
- order is not cancelled
- vendor has a Stripe account
- vendor has both charges and payouts enabled

If any check fails, payment will not start.

### 6.4 Create Checkout Session

Request:

```http
POST /payments/create-intent
Authorization: Bearer <BUYER_JWT>
Content-Type: application/json

{
  "orderId": "123e4567-e89b-12d3-a456-426614174000"
}
```

Response shape:

```json
{
  "success": true,
  "paymentId": "payment_uuid",
  "sessionId": "cs_test_a1b2c3",
  "paymentLink": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3",
  "expiresAt": "2026-03-13T07:30:00.000Z",
  "orderId": "order_uuid",
  "orderNumber": "ORD-1234",
  "amount": 100,
  "adminCommissionAmount": 10,
  "vendorPayoutAmount": 90
}
```

Important behavior:

- Session expires in 1 hour
- If there is already an open session for this order, backend may return that same session
- If order is already paid, backend returns an error

Possible reused-session response:

```json
{
  "success": true,
  "paymentId": "payment_uuid",
  "sessionId": "cs_test_existing",
  "paymentLink": "https://checkout.stripe.com/c/pay/cs_test_existing",
  "expiresAt": "2026-03-13T07:30:00.000Z",
  "orderId": "order_uuid",
  "orderNumber": "ORD-1234",
  "amount": 100,
  "message": "Using existing payment session"
}
```

Frontend rule:

- If backend returns `paymentLink`, open it
- Do not care whether it is a new or reused session

### 6.5 Open Stripe Checkout

Web example:

```ts
export function openCheckout(paymentLink: string) {
  window.location.assign(paymentLink);
}
```

React Native example:

```ts
import { Linking } from "react-native";

export async function openCheckout(paymentLink: string) {
  await Linking.openURL(paymentLink);
}
```

### 6.6 Success and cancel redirects

Backend builds these URLs from `FRONTEND_URL`:

```text
{FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=<orderId>
{FRONTEND_URL}/payment/cancel?order_id=<orderId>
```

Frontend must provide these screens or routes:

- `/payment/success`
- `/payment/cancel`

On success route:

- read `session_id`
- read `order_id`
- verify payment using `session_id`

On cancel route:

- read `order_id`
- show "Payment canceled" or similar
- allow buyer to return to order screen

### 6.7 Do not trust redirect alone

The redirect to `/payment/success` is not enough to mark payment successful in your UI.

Reason:

- Stripe redirect can happen before webhook processing is fully reflected in your database

The safe rule is:

- Success page must call `GET /payments/status/:sessionId`
- UI becomes fully paid only when `paymentRecord.status === "succeeded"`

### 6.8 Verify payment by session id

Request:

```http
GET /payments/status/:sessionId
Authorization: Bearer <JWT>
```

Response shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "sessionStatus": "complete",
    "paymentStatus": "paid",
    "paymentRecord": {
      "id": "payment_uuid",
      "orderId": "order_uuid",
      "stripePaymentId": "cs_test_a1b2c3",
      "stripeCustomerId": null,
      "amount": "100.00",
      "adminCommissionAmount": "10.00",
      "vendorPayoutAmount": "90.00",
      "status": "succeeded",
      "paymentMethod": null,
      "lastFourDigits": null,
      "cardBrand": null,
      "expiresAt": null,
      "createdAt": "2026-03-13T06:30:00.000Z",
      "updatedAt": "2026-03-13T06:31:00.000Z",
      "order": {
        "id": "order_uuid",
        "orderNumber": "ORD-1234",
        "status": "processing"
      }
    }
  }
}
```

What frontend should use:

- `paymentRecord.status` is the main app-level payment state
- `order.status` should be `processing` after successful payment
- money fields returned from read endpoints are usually strings, so parse them before doing UI math

Common app-level payment states:

- `pending`
- `succeeded`
- `failed`
- `canceled`

### 6.9 Polling strategy after success redirect

Recommended flow:

1. Call status endpoint immediately
2. If `paymentRecord.status === "succeeded"`, stop
3. If `pending`, poll every 1 to 2 seconds
4. Stop after about 8 attempts
5. If still pending, show a neutral state like "Payment submitted, still verifying"

Suggested logic:

```ts
export async function waitForFinalPaymentStatus(
  sessionId: string,
  token: string,
  attempts = 8,
  delayMs = 1500,
) {
  for (let i = 0; i < attempts; i += 1) {
    const result = await getPaymentStatus(sessionId, token);
    const status = result.paymentRecord?.status;

    if (status === "succeeded" || status === "failed" || status === "canceled") {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return getPaymentStatus(sessionId, token);
}
```

### 6.10 Optional: get payment by order id

Use this endpoint only when you already know the order id and want to read the stored payment row.

Request:

```http
GET /payments/order/:orderId
Authorization: Bearer <JWT>
```

Use cases:

- reopening the order details screen later
- showing payment metadata tied to an order
- reading stored payment amounts, which may come back as strings

Preferred verification path:

- use `GET /payments/status/:sessionId` right after Stripe redirect

## 7. Exact Response Shape Rules

The backend has a global response wrapper, but one payment endpoint bypasses it.

### Wrapped endpoints

These return:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {}
}
```

Wrapped payment endpoints:

- `POST /payments/vendor/stripe/account`
- `POST /payments/vendor/stripe/account-link`
- `GET /payments/vendor/stripe/status`
- `GET /payments/status/:sessionId`
- `GET /payments/order/:orderId`

### Unwrapped endpoint

`POST /payments/create-intent` returns a raw object because the service already returns a `success` field.

Example:

```json
{
  "success": true,
  "paymentId": "payment_uuid",
  "sessionId": "cs_test_123",
  "paymentLink": "https://checkout.stripe.com/c/pay/...",
  "expiresAt": "2026-03-13T12:00:00.000Z"
}
```

### Frontend helper for mixed response shapes

```ts
type WrappedResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
};

export function unwrapApiResponse<T>(payload: T | WrappedResponse<T>): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as WrappedResponse<T>).data;
  }
  return payload as T;
}
```

## 8. Error Handling Guide

Backend errors look like this:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Vendor is not onboarded to Stripe",
  "messages": null,
  "timestamp": "2026-03-13T06:30:00.000Z",
  "path": "/payments/vendor/stripe/account-link",
  "method": "POST",
  "hints": {}
}
```

Frontend should rely on:

- `statusCode`
- `message`
- `messages`

Ignore:

- `hints`

### Common vendor errors

- `Vendor profile not found`
- `Vendor is not onboarded to Stripe`

### Common buyer errors

- `Buyer profile not found`
- `Order not found`
- `You do not have access to this order`
- `Cannot pay for a cancelled order`
- `Vendor is not onboarded to Stripe`
- `Vendor Stripe account is not fully enabled`
- `Order has already been paid`
- `Checkout session not found`

## 9. Frontend State Mapping

### Vendor Stripe status

Use these as your frontend state model:

```ts
type VendorStripeStatus = "pending" | "verified" | "restricted";
```

### Payment status

Use these as your frontend state model:

```ts
type PaymentState = "pending" | "succeeded" | "failed" | "canceled";
```

### Order status after payment

Relevant order transition:

```text
pending -> processing
```

## 10. Frontend Service Layer Example

Use one small API layer and keep Stripe logic out of components.

```ts
export async function apiRequest<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || "Request failed");
  }

  return unwrapApiResponse(payload);
}

export function createVendorStripeAccount(token: string) {
  return apiRequest<{
    stripeAccountId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    status: "pending" | "verified" | "restricted";
  }>("/payments/vendor/stripe/account", token, {
    method: "POST",
  });
}

export function createVendorStripeAccountLink(token: string) {
  return apiRequest<{ url: string; expiresAt: number }>(
    "/payments/vendor/stripe/account-link",
    token,
    { method: "POST" },
  );
}

export function getVendorStripeStatus(token: string) {
  return apiRequest<{
    stripeAccountId: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    status: "pending" | "verified" | "restricted";
  }>("/payments/vendor/stripe/status", token);
}

export function createCheckoutSession(orderId: string, token: string) {
  return apiRequest<{
    success: true;
    paymentId: string;
    sessionId: string;
    paymentLink: string;
    expiresAt: string;
    orderId: string;
    orderNumber: string;
    amount: number;
    adminCommissionAmount?: number;
    vendorPayoutAmount?: number;
    message?: string;
  }>("/payments/create-intent", token, {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
}

export function getPaymentStatus(sessionId: string, token: string) {
  return apiRequest<{
    sessionStatus: string;
    paymentStatus: string;
    paymentRecord: {
      id: string;
      status: "pending" | "succeeded" | "failed" | "canceled";
      order?: {
        id?: string;
        orderNumber?: string;
        status?: string;
      };
    } | null;
  }>(`/payments/status/${sessionId}`, token);
}

export function getPaymentByOrder(orderId: string, token: string) {
  return apiRequest(`/payments/order/${orderId}`, token);
}
```

## 11. Recommended Screen Logic

### Vendor payout settings screen

When screen opens:

1. Call `POST /payments/vendor/stripe/account`
2. If result is `verified`, show connected state
3. Otherwise show "Continue Stripe setup" button

When vendor taps continue:

1. Call `POST /payments/vendor/stripe/account-link`
2. Open returned URL

When vendor returns:

1. Call `GET /payments/vendor/stripe/status`
2. Show final state

### Buyer order details screen

When buyer taps pay:

1. Call `POST /payments/create-intent`
2. Open `paymentLink`

### Payment success screen

When route opens:

1. Read `session_id`
2. Call `GET /payments/status/:sessionId`
3. Poll while status is `pending`
4. If succeeded, show success and refresh order
5. If failed or canceled, show proper message

### Payment cancel screen

When route opens:

1. Read `order_id`
2. Show "Payment canceled"
3. Give button to return to order details

## 12. Common Integration Mistakes

These are the mistakes most likely to break the frontend flow.

### Mistake 1: Using Stripe SDK card collection

Do not build your own card form.

Reason:

- Backend already uses hosted Stripe Checkout

### Mistake 2: Marking payment successful on redirect alone

Do not show final success just because user lands on `/payment/success`.

Reason:

- Webhook may still be processing

### Mistake 3: Calling account-link before account creation

Always create or fetch vendor account first.

### Mistake 4: Forgetting mixed response shapes

Remember:

- `create-intent` is unwrapped
- most other payment endpoints are wrapped in `data`

### Mistake 5: Assuming `/api/payments/...`

Current backend routes are `/payments/...` unless your deployment adds a prefix.

### Mistake 6: Ignoring reused checkout sessions

If backend returns `Using existing payment session`, that is fine.

Frontend should still open the returned URL.

## 13. Frontend QA Checklist

Vendor flow:

1. Open payout settings as a vendor with no Stripe account
2. Create account and onboarding link
3. Leave onboarding incomplete
4. Return and confirm UI shows `pending`
5. Reopen onboarding
6. Complete onboarding
7. Confirm UI shows `verified`

Buyer flow:

1. Open an unpaid order
2. Tap pay
3. Confirm Stripe Checkout opens
4. Cancel payment and confirm cancel screen works
5. Pay successfully and confirm success screen polls
6. Confirm payment becomes `succeeded`
7. Confirm order status becomes `processing`
8. Retry pay on already-paid order and confirm frontend handles the error

## 14. Codex Handoff Prompt For Frontend Repo

Paste this into Codex inside the frontend project if you want the agent to implement the flow correctly:

```text
Implement the Stripe flow using the existing backend API. Do not add Stripe Elements, PaymentSheet, confirmPayment, or any client_secret-based flow because this backend uses hosted Stripe URLs only.

Backend routes to integrate:
- POST /payments/vendor/stripe/account
- POST /payments/vendor/stripe/account-link
- GET /payments/vendor/stripe/status
- POST /payments/create-intent
- GET /payments/status/:sessionId
- GET /payments/order/:orderId

Behavior rules:
- Vendor onboarding uses Stripe Connect account links returned by backend.
- Buyer payment uses Stripe Checkout URL returned by backend.
- After checkout success redirect, do not mark payment complete immediately.
- Always call GET /payments/status/:sessionId and poll briefly until paymentRecord.status is succeeded, failed, or canceled.
- Vendor is payout-ready only when status is verified and both chargesEnabled and payoutsEnabled are true.
- create-intent returns an unwrapped response object, but most other payment endpoints return { success, statusCode, message, data }.
- Keep the integration inside a small payment service module and simple screen handlers.

Required frontend pieces:
- vendor payout settings screen with Connect/Continue Stripe button
- payment success screen at /payment/success
- payment cancel screen at /payment/cancel
- pay-now action from order details
- API helpers for all payment routes
- short polling helper for payment verification

Use the backend route paths exactly as written unless the frontend project already adds a base prefix through environment config.
```

## 15. One-Page Implementation Checklist

If the frontend developer only reads one section, use this one.

Vendor:

1. Call `POST /payments/vendor/stripe/account`
2. If verified, show connected state
3. Else call `POST /payments/vendor/stripe/account-link`
4. Open returned URL
5. On return, call `GET /payments/vendor/stripe/status`
6. If pending, let vendor continue setup again

Buyer:

1. Call `POST /payments/create-intent` with `orderId`
2. Open returned `paymentLink`
3. Handle `/payment/success`
4. Handle `/payment/cancel`
5. On success, call `GET /payments/status/:sessionId`
6. Poll briefly while payment is pending
7. Show success only when `paymentRecord.status === "succeeded"`
8. Refresh the order after success

## 16. Scenario-Based API Call Order

This section answers the practical frontend question:

- which API is called first
- which API is called next
- in which scenario

### Scenario 1: Vendor opens Stripe setup for the first time

Use this when the vendor has never connected Stripe before.

Step order:

1. Call `POST /payments/vendor/stripe/account`
2. Read `data.status`
3. If status is not `verified`, call `POST /payments/vendor/stripe/account-link`
4. Open the returned `data.url`
5. After Stripe sends the vendor back, call `GET /payments/vendor/stripe/status`
6. If status becomes `verified`, stop
7. If status is still `pending`, allow the vendor to continue setup again

Why:

- first API creates or fetches the vendor Stripe account
- second API creates the Stripe onboarding link
- third API checks whether onboarding is actually complete

### Scenario 2: Vendor opens payout settings again later

Use this when vendor already has some Stripe state.

Step order:

1. Call `POST /payments/vendor/stripe/account`
2. If returned status is `verified`, do not call anything else
3. If returned status is `pending` or `restricted`, call `POST /payments/vendor/stripe/account-link`
4. Open returned `data.url`
5. After return, call `GET /payments/vendor/stripe/status`

Why:

- this route is safe to call every time payout settings opens
- it tells frontend whether vendor is already connected or still needs onboarding

### Scenario 3: Vendor started onboarding but did not finish

Use this when vendor closed Stripe or came back without completing the full form.

Step order:

1. Call `GET /payments/vendor/stripe/status`
2. If status is `pending`, show "Continue Stripe setup"
3. When vendor taps continue, call `POST /payments/vendor/stripe/account-link`
4. Open returned `data.url`
5. After return, call `GET /payments/vendor/stripe/status` again

Expected result:

- `pending`: still incomplete
- `verified`: finished successfully
- `restricted`: Stripe needs action

### Scenario 4: Buyer pays an unpaid order

Use this on the order details screen when the order is still unpaid.

Step order:

1. Call `POST /payments/create-intent` with `orderId`
2. Read `paymentLink` from response
3. Open `paymentLink`
4. Buyer finishes payment on Stripe Checkout
5. Stripe redirects buyer to `/payment/success?session_id=...&order_id=...`
6. Read `session_id`
7. Call `GET /payments/status/:sessionId`
8. If payment is `pending`, poll `GET /payments/status/:sessionId`
9. When `paymentRecord.status === "succeeded"`, refresh the order screen

Why:

- `create-intent` creates the Checkout Session
- `status/:sessionId` confirms the real backend payment state after webhook processing

### Scenario 5: Buyer cancels from Stripe Checkout

Use this when buyer closes payment or taps cancel on Stripe Checkout.

Step order:

1. Buyer is redirected to `/payment/cancel?order_id=...`
2. Show "Payment canceled"
3. Return buyer to order details
4. If buyer taps pay again later, call `POST /payments/create-intent` again

Important:

- do not mark order as paid
- do not show success

### Scenario 6: Buyer lands on success page but payment is still pending

This is a real scenario because redirect can happen before webhook state is fully visible.

Step order:

1. Success page loads
2. Call `GET /payments/status/:sessionId`
3. If `paymentRecord.status === "pending"`, keep polling
4. If status becomes `succeeded`, show success
5. If status becomes `failed` or `canceled`, show failure or canceled message

Frontend rule:

- success page is not final proof
- backend status endpoint is final proof

### Scenario 7: Buyer tries to pay an order that is already paid

Step order:

1. Call `POST /payments/create-intent`
2. Backend may return `400 Order has already been paid`
3. Frontend should stop the flow
4. Refresh order details and show paid state

### Scenario 8: Buyer tries to pay but vendor Stripe is not ready

Step order:

1. Call `POST /payments/create-intent`
2. Backend may return one of:
   - `Vendor is not onboarded to Stripe`
   - `Vendor Stripe account is not fully enabled`
3. Frontend should stop payment flow
4. Show a clear message that vendor payment setup is incomplete

### Scenario 9: Buyer revisits order later and wants to check payment info

Use this after payment flow is over and you already know the order id.

Step order:

1. Call `GET /payments/order/:orderId`
2. Read stored payment info
3. Use it to show payment status on the order screen

Use this for:

- order history screen
- order details reload
- payment info display after previous payment attempt

### Scenario 10: Exact short version the frontend developer should follow

Vendor connect flow:

1. `POST /payments/vendor/stripe/account`
2. If not verified -> `POST /payments/vendor/stripe/account-link`
3. Open Stripe URL
4. On return -> `GET /payments/vendor/stripe/status`

Buyer payment flow:

1. `POST /payments/create-intent`
2. Open `paymentLink`
3. On success redirect -> `GET /payments/status/:sessionId`
4. Poll if pending
5. Show success only when `paymentRecord.status === "succeeded"`
