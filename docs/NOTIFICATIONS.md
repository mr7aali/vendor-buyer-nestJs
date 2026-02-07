# Notifications: API + WebSocket Guide

This document explains how notifications work, the events that generate them, and how frontend apps (admin + mobile) should integrate via REST and WebSocket.

---

## Overview

There are two notification flows:

1. **User notifications** (buyers/vendors/mobile apps)
   - Each user has their own notification inbox.
   - REST endpoints are under `GET /notifications/me`.
   - Realtime delivery via Socket.IO (`notification` event).

2. **Admin notifications** (dashboard/admin)
   - Admin can see all notifications.
   - Broadcasts are grouped in a dedicated endpoint.

---

## Data Model

Notification fields (DB):

- `id` (uuid)
- `userId` (recipient user id)
- `title`
- `message`
- `type`: `info | success | warning | error`
- `category`: `system | buyer | vendor | broadcast`
- `broadcastId` (nullable, used for grouped broadcasts)
- `isRead`
- `createdAt`, `updatedAt`

---

## Auto‑Generated Events

These events create notifications automatically:

1. **Order created**
   - Buyer: `Order created`
   - Vendor: `New order received`

2. **Payment succeeded**
   - Buyer: `Payment succeeded`
   - Vendor: `Payment received`

3. **Order delivered**
   - Buyer: `Order delivered`
   - Vendor: `Order delivered`

4. **Order cancelled**
   - Buyer: `Order cancelled`
   - Vendor: `Order cancelled`

5. **Vendor KYC approved / rejected**
   - Vendor: `KYC approved` or `KYC rejected`

6. **Profile created**
   - Buyer: `Profile created`
   - Vendor: `Profile created`

7. **Buyer connected to vendor**
   - Vendor: `New buyer connection`

These are wired in:

- `OrdersService` (order created, delivered/cancelled)
- `PaymentsService` (payment succeeded)
- `AuthService` (profile created, KYC status)
- `VendorBuyerConnectionsService` (buyer connects)

---

## REST API

### Admin Endpoints (AdminAuthGuard)

- `GET /notifications`  
  All notifications (admin view).

- `GET /notifications/unread`  
  All unread notifications (admin view).

- `GET /notifications/broadcasts`  
  Grouped broadcasts (one row per broadcast).

- `GET /notifications/broadcasts/:broadcastId/recipients`  
  Recipients for a broadcast.

- `POST /notifications`  
  Create a single notification.

- `POST /notifications/broadcast`  
  Broadcast to all/buyers/vendors.

- `PATCH /notifications/:id/read`  
  Mark a notification read (admin view).

- `PATCH /notifications/read-all`  
  Mark all as read (admin view).

- `DELETE /notifications/:id`  
  Delete a notification.

### User Endpoints (JwtAuthGuard)

- `GET /notifications/me`  
  Current user notifications.

- `GET /notifications/me/unread`  
  Current user unread notifications.

- `PATCH /notifications/me/:id/read`  
  Mark one as read (user).

- `PATCH /notifications/me/read-all`  
  Mark all as read (user).

- `DELETE /notifications/me/:id`  
  Delete one notification (user).

---

## Broadcasts: Idempotency

Broadcast requests accept an optional `idempotencyKey`.  
If the same key is reused, duplicates are prevented.

Backend uses:
- `broadcastId`
- DB unique constraint `(broadcastId, userId)`
- `createMany({ skipDuplicates: true })`

---

## WebSocket (Realtime)

### Server
Gateway: `NotificationsGateway`  
Event emitted: `notification`

Each connected user joins a room:

- `user:{userId}`

Notifications are emitted to that room.

### Frontend Socket.IO Example

```ts
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: localStorage.getItem("accessToken"),
  },
});

socket.on("connect", () => {
  console.log("connected", socket.id);
});

socket.on("notification", (payload) => {
  // Update UI state or show toast
  console.log("new notification", payload);
});
```

**Token requirement:** same JWT access token used for REST calls.

---

## Suggested Frontend Flow

1. On login, open Socket.IO connection.
2. Load notifications via REST:
   - Admin: `GET /notifications` or `GET /notifications/broadcasts`
   - User: `GET /notifications/me`
3. When `notification` event arrives:
   - Prepend new item to list
   - Show toast badge
4. Mark read and delete via REST.

---

## Notes for Future Extension

- Add new event types by calling:
  - `notificationsService.notifyBuyer(...)`
  - `notificationsService.notifyVendor(...)`
  - `notificationsService.notifySystem(...)`
- Admin notifications can be split into their own model later if needed.

