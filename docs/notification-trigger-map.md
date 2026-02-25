# Push Notification Trigger Map

Every place in the codebase that fires a notification (WebSocket + FCM push).

---

## 1. Auth – Buyer & Vendor Registration

| Event | Who receives | Title | Message | Type |
|-------|-------------|-------|---------|------|
| Buyer profile created | Buyer | `Profile created` | Your buyer profile has been created successfully. | `success` |
| Vendor profile created | Vendor | `Profile created` | Your vendor profile has been created successfully. | `success` |

**How to trigger:** `POST /auth/register/buyer` or `POST /auth/register/vendor`  
**File:** `src/auth/auth.service.ts` · lines 158, 258

---

## 2. Auth – KYC Verification (Admin action)

| Event | Who receives | Title | Message | Type |
|-------|-------------|-------|---------|------|
| NID + business docs both verified | Vendor | `KYC approved` | Your vendor KYC verification has been approved. | `success` |
| NID or business doc rejected | Vendor | `KYC rejected` | Your vendor KYC verification was rejected. Please resubmit your documents. | `error` |

**How to trigger:** `PATCH /auth/vendors/:id` (admin) – set `isNidVerify` and/or `isBussinessIdVerified`  
**File:** `src/auth/auth.service.ts` · lines 741, 754

---

## 3. Orders – Order Created

| Event | Who receives | Title | Message | Type |
|-------|-------------|-------|---------|------|
| Order placed by buyer | Buyer | `Order created` | Your order `{orderNumber}` has been placed successfully. | `success` |
| Order placed by buyer | Vendor | `New order received` | You received a new order `{orderNumber}`. | `info` |

**How to trigger:** `POST /orders` (buyer JWT)  
**File:** `src/orders/orders.service.ts` · lines 129, 137

---

## 4. Orders – Status Updated to Delivered or Cancelled

| Event | Who receives | Title | Message | Type |
|-------|-------------|-------|---------|------|
| Order marked delivered | Buyer | `Order delivered` | Your order `{orderNumber}` status is now delivered. | `success` |
| Order marked delivered | Vendor | `Order delivered` | Order `{orderNumber}` status updated to delivered. | `info` |
| Order marked cancelled | Buyer | `Order cancelled` | Your order `{orderNumber}` status is now cancelled. | `warning` |
| Order marked cancelled | Vendor | `Order cancelled` | Order `{orderNumber}` status updated to cancelled. | `info` |

**How to trigger:** `PATCH /orders/:id/status` (vendor JWT) with `{ "status": "delivered" }` or `{ "status": "cancelled" }`  
**File:** `src/orders/orders.service.ts` · lines 599, 613

---

## 5. Payments – Stripe Checkout Completed

| Event | Who receives | Title | Message | Type |
|-------|-------------|-------|---------|------|
| Payment succeeds | Buyer | `Payment succeeded` | Payment received for order `{orderNumber}`. Amount: `$X.XX`. | `success` |
| Payment succeeds | Vendor | `Payment received` | Payment received for order `{orderNumber}`. Payout: `$X.XX`. Admin commission: `$X.XX`. | `success` |

**How to trigger:** Stripe webhook `checkout.session.completed` (fired automatically after payment)  
**File:** `src/payments/payments.service.ts` · lines 386, 396

---

## 6. Vendor-Buyer Connections

| Event | Who receives | Title | Message | Type |
|-------|-------------|-------|---------|------|
| Buyer connects to vendor | Vendor | *(check vendor-buyer-connections.service.ts line 71)* | — | — |
| Connection status changes | Vendor | *(check vendor-buyer-connections.service.ts line 110)* | — | — |

**How to trigger:** `POST /vendor-buyer-connections` (buyer JWT)  
**File:** `src/vendor-buyer-connections/vendor-buyer-connections.service.ts` · lines 71, 110

---

## 7. Manual / Admin-created Notifications

| Endpoint | Description |
|----------|-------------|
| `POST /notifications` | Send to one specific user |
| `POST /notifications/broadcast` | Send to `all`, `buyers`, or `vendors` |

These are the **only two ways to send a push without triggering a business event** — useful for testing.

---

## Testing Checklist

Use this to verify the full push flow end-to-end:

```
[ ] 1. Register FCM token:   POST /notifications/fcm-token
[ ] 2. Fire a manual push:   POST /notifications  (admin)
[ ]    → Check device receives FCM push
[ ]    → Check socket.io event fires (if app is open)
[ ] 3. Broadcast:            POST /notifications/broadcast { target: "all" }
[ ]    → All users with FCM tokens should receive push
[ ] 4. Order flow:           POST /orders  →  PATCH /orders/:id/status  →  Stripe webhook
[ ]    → Buyer + Vendor should both receive pushes
[ ] 5. Remove token:         DELETE /notifications/fcm-token
[ ]    → No more pushes on that device
```
