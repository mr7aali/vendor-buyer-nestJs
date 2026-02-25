# Push Notification – Frontend Integration Guide

## Overview

This app supports **two real-time notification channels** running in parallel:

| Channel | Transport | Works when |
|---------|-----------|------------|
| **WebSocket** | Socket.IO | App is open in foreground |
| **FCM Push** | Firebase Cloud Messaging | App is in background / closed |

Both channels fire for every notification event. Your frontend needs to:
1. Get an FCM device token from Firebase
2. Register it with the backend (`POST /notifications/fcm-token`)
3. Handle incoming socket events while the app is open

---

## Base URL

```
https://<your-backend-domain>
```

All routes below are relative to this base.

---

## Step 1 – Add Firebase to Your Frontend

### React / Next.js Web

```bash
npm install firebase
```

Create `src/lib/firebase.ts`:

```ts
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            "<YOUR_WEB_API_KEY>",
  authDomain:        "youjjitance.firebaseapp.com",
  projectId:         "youjjitance",
  storageBucket:     "youjjitance.appspot.com",
  messagingSenderId: "<YOUR_SENDER_ID>",
  appId:             "<YOUR_APP_ID>",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
```

> **Note:** Get `apiKey`, `messagingSenderId`, and `appId` from your Firebase Console → Project Settings → General → Your apps → Web app.

Create the Service Worker file at `public/firebase-messaging-sw.js`:

```js
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "<YOUR_WEB_API_KEY>",
  authDomain:        "youjjitance.firebaseapp.com",
  projectId:         "youjjitance",
  messagingSenderId: "<YOUR_SENDER_ID>",
  appId:             "<YOUR_APP_ID>",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, { body, icon: '/icon.png' });
});
```

---

### React Native (Expo / bare)

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

Follow the [React Native Firebase setup guide](https://rnfirebase.io/) to place `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) in your project.

---

## Step 2 – Get the FCM Device Token

### Web (React / Next.js)

```ts
// src/hooks/usePushNotifications.ts
import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';

const VAPID_KEY = '<YOUR_VAPID_KEY>'; // Firebase Console → Cloud Messaging → Web Push Certificates

export function usePushNotifications(userJwt: string | null) {
  useEffect(() => {
    if (!userJwt || !messaging) return;

    async function init() {
      // 1. Ask permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // 2. Get FCM token
      const token = await getToken(messaging!, { vapidKey: VAPID_KEY });
      if (!token) return;

      // 3. Register with backend
      await registerFcmToken(token, userJwt!);

      // 4. Handle foreground messages
      onMessage(messaging!, (payload) => {
        const { title, body } = payload.notification!;
        // Show a toast / in-app banner
        console.log('Foreground push:', title, body);
      });
    }

    init();
  }, [userJwt]);
}

async function registerFcmToken(token: string, jwt: string) {
  await fetch('/notifications/fcm-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ token }),
  });
}
```

Use the hook in your root layout / auth component:

```tsx
// app/layout.tsx or wherever you have the JWT
const { accessToken } = useAuth();
usePushNotifications(accessToken);
```

---

### React Native

```ts
// src/hooks/usePushNotifications.ts
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { api } from '../lib/api'; // your axios/fetch wrapper

export function usePushNotifications(userJwt: string | null) {
  useEffect(() => {
    if (!userJwt) return;

    async function init() {
      // 1. Request permission (iOS)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) return;

      // 2. Get FCM token
      const token = await messaging().getToken();
      if (!token) return;

      // 3. Register with backend
      await api.post('/notifications/fcm-token', { token });

      // 4. Refresh token listener
      messaging().onTokenRefresh(async (newToken) => {
        await api.post('/notifications/fcm-token', { token: newToken });
      });
    }

    init();

    // Foreground handler
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground push:', remoteMessage.notification);
      // Show an in-app toast
    });

    return unsubscribe;
  }, [userJwt]);
}
```

---

## Step 3 – Remove Token on Logout

Always delete the token from the backend on logout so the user stops receiving pushes on that device.

```ts
async function logout() {
  const token = await getFcmToken(); // your stored token

  if (token) {
    await fetch('/notifications/fcm-token', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
  }

  // ... rest of logout logic
}
```

---

## Step 4 – WebSocket Real-Time Notifications

While the app is open, notifications are also delivered via Socket.IO:

```ts
// src/lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(jwt: string): Socket {
  if (socket?.connected) return socket;

  socket = io('<YOUR_BACKEND_URL>', {
    auth: { token: jwt },
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));

  // Handle incoming notifications
  socket.on('notification', (payload) => {
    console.log('New notification:', payload);
    // payload shape:
    // {
    //   id: string,
    //   title: string,
    //   message: string,
    //   type: 'info' | 'success' | 'warning' | 'error',
    //   category: 'system' | 'buyer' | 'vendor' | 'broadcast',
    //   isRead: false,
    //   createdAt: string,
    // }
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

Call `connectSocket(jwt)` after login and `disconnectSocket()` on logout.

---

## API Reference

### Register FCM Token

```http
POST /notifications/fcm-token
Authorization: Bearer <user-jwt>
Content-Type: application/json

{ "token": "<fcm-device-token>" }
```

**Response `201`:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "token": "<fcm-device-token>",
  "createdAt": "2026-02-25T00:00:00.000Z"
}
```

---

### Remove FCM Token

```http
DELETE /notifications/fcm-token
Authorization: Bearer <user-jwt>
Content-Type: application/json

{ "token": "<fcm-device-token>" }
```

**Response `200`:**
```json
{ "success": true }
```

---

### Get My Notifications

```http
GET /notifications/me
Authorization: Bearer <user-jwt>
```

**Response `200`:** Array of notification objects.

---

### Get My Unread Notifications

```http
GET /notifications/me/unread
Authorization: Bearer <user-jwt>
```

---

### Mark a Notification as Read

```http
PATCH /notifications/me/:id/read
Authorization: Bearer <user-jwt>
```

---

### Mark All as Read

```http
PATCH /notifications/me/read-all
Authorization: Bearer <user-jwt>
```

---

### Delete a Notification

```http
DELETE /notifications/me/:id
Authorization: Bearer <user-jwt>
```

---

## Notification Object Shape

```ts
interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'system' | 'buyer' | 'vendor' | 'broadcast';
  broadcastId: string | null;
  isRead: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}
```

---

## Full Flow Diagram

```
User opens app
      │
      ▼
  Login → get JWT
      │
      ├──► connectSocket(jwt)          ← real-time while app is open
      │
      └──► getFcmToken()
              │
              ▼
        POST /notifications/fcm-token  ← backend stores token
              │
              ▼
          Token stored in DB

  (Backend fires a notification)
      │
      ├──► socket.emit('notification', payload)    ← app is open
      └──► FCM push to all user's tokens           ← app is closed / background

  User logs out
      │
      └──► DELETE /notifications/fcm-token         ← stop pushes on this device
              disconnectSocket()
```

---

## FAQ

**Q: What if the user has multiple devices?**
Each device registers its own token. The backend stores all of them and sends a push to every registered device simultaneously.

**Q: What happens with expired / invalid tokens?**
The backend automatically detects and removes stale tokens from the database after each send attempt — no action needed on the frontend.

**Q: Do I need to request notification permission again on every app start?**
No. Check `Notification.permission` (web) or `messaging().hasPermission()` (RN) first. Only call `requestPermission()` if the status is `'default'` / `NOT_DETERMINED`.

**Q: Where do I get the VAPID key (web only)?**
Firebase Console → Project Settings → Cloud Messaging tab → **Web Push Certificates** → Generate key pair.
