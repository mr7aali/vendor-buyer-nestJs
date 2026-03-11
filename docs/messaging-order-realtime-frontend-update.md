# Messaging + Orders Realtime Update (Frontend)

This document covers only the new/changed integration points.

## 1) Message payload changes (`new_message`)

All chat messages now include extra fields for system/order messages.

### New fields on each message
- `type`: `"TEXT" | "ORDER_PLACED" | "ORDER_UPDATED"`
- `conversationId`: string (UUID)
- `orderId`: string | null
- `metadata`: object | null

### `ORDER_PLACED` metadata
```json
{
  "orderId": "uuid",
  "orderNumber": "ORD-...",
  "productName": "Product A",
  "quantity": 2,
  "price": 150,
  "items": [
    {
      "productName": "Product A",
      "quantity": 2,
      "price": 150
    }
  ],
  "totalAmount": 300
}
```

### `ORDER_UPDATED` metadata
```json
{
  "orderId": "uuid",
  "orderNumber": "ORD-...",
  "status": "shipped"
}
```

## 2) Auto order messages

No frontend request needed. Backend now sends `new_message` automatically when:
- buyer places order (`type = ORDER_PLACED`)
- vendor updates status (`type = ORDER_UPDATED`)

Render these in chat as normal messages with special UI by `type` and `metadata`.

## 3) Pin message (WebSocket)

### Client emit
Event: `pin_message`

Payload:
```json
{
  "conversationId": "conversation-uuid",
  "messageId": "message-uuid"
}
```

Validation rule:
- only `ORDER_PLACED` / `ORDER_UPDATED` messages are pin-eligible
- completed/cancelled order messages cannot be pinned

### Server broadcast
Event: `message_pinned` (sent to both buyer and vendor rooms)

Payload:
```json
{
  "conversationId": "conversation-uuid",
  "pinnedMessageId": "message-uuid",
  "pinnedMessage": {
    "id": "message-uuid",
    "type": "ORDER_PLACED",
    "messageText": "Order ORD-... has been placed.",
    "metadata": {
      "orderId": "uuid"
    }
  }
}
```

### Auto-unpin case
When an order becomes `delivered` or `cancelled`, backend auto-unpins if the pinned message belongs to that order.

`message_pinned` payload in this case:
```json
{
  "conversationId": "conversation-uuid",
  "pinnedMessageId": null,
  "pinnedMessage": null
}
```

## 4) New REST endpoint

### Get current pinned message for a conversation
- `GET /conversations/:id/pinned`
- Auth: existing JWT auth

Response:
- message object if pinned
- `null` if no pinned message

## 5) Existing endpoints/events unchanged

These still work as before:
- `POST /messages`
- `GET /messages/conversations`
- `GET /messages/conversation/:partnerId`
- `PATCH /messages/:id/read`
- socket `send_message` -> `new_message`
- socket `mark_read` -> `message_read`

## 6) Frontend checklist

1. Add rendering logic for `message.type` (`TEXT`, `ORDER_PLACED`, `ORDER_UPDATED`).
2. Use `message.metadata` to show order card/details in chat.
3. Store/use `conversationId` from conversation list and message objects.
4. Add pin action in chat that emits `pin_message`.
5. Listen to `message_pinned` and update pinned banner in real time.
6. On conversation open, call `GET /conversations/:id/pinned` for initial pinned state.
