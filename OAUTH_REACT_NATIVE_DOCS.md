# OAuth Integration Guide for React Native
> **Backend base URL:** configure `API_BASE_URL` in your env/config file.

---

## Table of Contents
1. [Overview & Auth Flow](#overview)
2. [Environment Variables (Backend)](#env-vars)
3. [Google Sign-In](#google)
4. [Apple Sign-In](#apple)
5. [API Response Reference](#api-response)
6. [Token Storage & Usage](#tokens)
7. [Error Handling](#errors)
8. [Post-Login UX Flow](#post-login)

---

## 1. Overview & Auth Flow {#overview}

```
Mobile App                           Backend
   │                                    │
   │  1. Open Google/Apple native UI    │
   │──────────────────────────────────► │
   │  2. Get idToken / identityToken    │
   │◄────────────────────────────────── │
   │                                    │
   │  3. POST /auth/google or /auth/apple│
   │──── { idToken }  ──────────────── ►│
   │                                    │  verify token with
   │                                    │  Google/Apple servers
   │                                    │  find-or-create user
   │  4. { accessToken, refreshToken,   │
   │       isNewUser, user }            │
   │◄────────────────────────────────── │
```

**Key points:**
- The backend verifies the token with Google/Apple — the app never sends passwords.
- If the email was already registered (local account), the social provider gets **linked** to that account automatically.
- `isNewUser: true` means the user was just created → navigate them to profile setup.
- `isNewUser: false` → navigate to home/dashboard.

---

## 2. Environment Variables (Backend) {#env-vars}

Add these to your backend `.env` file:

```env
# Google
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com

# Apple
APPLE_CLIENT_ID=com.yourcompany.yourapp          # Your app's bundle ID
APPLE_TEAM_ID=ABCDE12345                         # Apple Developer team ID
APPLE_KEY_ID=ABCDE12345                          # Key ID from Apple Developer
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----"
```

> **Tip:** For `APPLE_PRIVATE_KEY`, paste the content of your `.p8` file with literal `\n` instead of real newlines.

---

## 3. Google Sign-In {#google}

### 3.1 Install dependencies

```bash
npm install @react-native-google-signin/google-signin
# iOS:
cd ios && pod install
```

### 3.2 Configure (once, at app startup)

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  // ⚠️ This must be your WEB client ID (not iOS/Android client ID)
  // Get it from Google Cloud Console → APIs & Services → Credentials
});
```

### 3.3 Sign-In function

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import axios from 'axios';

export async function signInWithGoogle() {
  // 1. Trigger Google sign-in
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();

  // 2. Get ID token
  const { idToken } = await GoogleSignin.getTokens();

  if (!idToken) throw new Error('Failed to get Google ID token');

  // 3. Send to backend
  const response = await axios.post(`${API_BASE_URL}/auth/google`, {
    idToken,
    // evanAddress: 'optional_evan_wallet_address', // optional
  });

  return response.data; // { accessToken, refreshToken, isNewUser, user }
}
```

### 3.4 Complete example with UI

```typescript
import React, { useState } from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      const { accessToken, refreshToken, isNewUser, user } = result;

      // Store tokens securely
      await saveTokens(accessToken, refreshToken);

      if (isNewUser) {
        // Navigate to profile completion screen
        navigation.navigate('ProfileSetup');
      } else {
        navigation.navigate('Home');
      }
    } catch (error) {
      Alert.alert('Sign In Failed', parseAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={loading}>
      <Text>{loading ? 'Signing in...' : 'Continue with Google'}</Text>
    </TouchableOpacity>
  );
}
```

---

## 4. Apple Sign-In {#apple}

> **Requirements:** Apple Sign In only works on real iOS devices / TestFlight. It requires iOS 13+.

### 4.1 Install dependencies

```bash
npm install react-native-apple-authentication
cd ios && pod install
```

Also enable **Sign In with Apple** capability in Xcode:
- Select your target → Signing & Capabilities → `+` → Sign In with Apple

### 4.2 Sign-In function

```typescript
import appleAuth, {
  AppleAuthRequestOperation,
  AppleAuthRequestScope,
} from '@invertase/react-native-apple-authentication';

export async function signInWithApple() {
  // 1. Trigger Apple sign-in
  const appleAuthRequestResponse = await appleAuth.performRequest({
    requestedOperation: AppleAuthRequestOperation.LOGIN,
    requestedScopes: [
      AppleAuthRequestScope.EMAIL,
      AppleAuthRequestScope.FULL_NAME,
    ],
  });

  const { identityToken, authorizationCode, fullName } = appleAuthRequestResponse;

  if (!identityToken || !authorizationCode) {
    throw new Error('Apple Sign In failed — missing tokens');
  }

  // fullName is ONLY provided on the first sign-in. Store it locally on first use.
  const displayName = fullName?.givenName
    ? `${fullName.givenName} ${fullName.familyName ?? ''}`.trim()
    : undefined;

  // 2. Send to backend
  const response = await axios.post(`${API_BASE_URL}/auth/apple`, {
    identityToken,
    authorizationCode,
    fullName: displayName,   // optional — only present on first sign-in
    // evanAddress: 'optional_evan_wallet_address',
  });

  return response.data; // { accessToken, refreshToken, isNewUser, user }
}
```

### 4.3 Complete example with UI

```typescript
import appleAuth from '@invertase/react-native-apple-authentication';

export function AppleSignInButton() {
  const [loading, setLoading] = useState(false);

  // Don't render on Android or older iOS
  if (!appleAuth.isSupported) return null;

  const handlePress = async () => {
    setLoading(true);
    try {
      const result = await signInWithApple();
      const { accessToken, refreshToken, isNewUser, user } = result;

      await saveTokens(accessToken, refreshToken);

      if (isNewUser) {
        navigation.navigate('ProfileSetup');
      } else {
        navigation.navigate('Home');
      }
    } catch (error) {
      Alert.alert('Sign In Failed', parseAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={loading}>
      <Text>{loading ? 'Signing in...' : 'Continue with Apple'}</Text>
    </TouchableOpacity>
  );
}
```

---

## 5. API Response Reference {#api-response}

### `POST /auth/google`

**Request body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `idToken` | `string` | ✅ | Google ID token from `GoogleSignin.getTokens()` |
| `evanAddress` | `string` | ❌ | Evan wallet address (can be set later) |

---

### `POST /auth/apple`

**Request body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `identityToken` | `string` | ✅ | Apple JWT from `appleAuth.performRequest()` |
| `authorizationCode` | `string` | ✅ | Apple authorization code |
| `fullName` | `string` | ❌ | User's full name (only available on first Apple sign-in) |
| `evanAddress` | `string` | ❌ | Evan wallet address (can be set later) |

---

### Successful Response (both endpoints)

**HTTP 200 OK**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR...",
  "isNewUser": true,
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "userType": "user",
    "displayName": "John Doe",
    "avatarUrl": "https://...",
    "authProvider": "google"
  }
}
```

**Field descriptions:**
| Field | Description |
|---|---|
| `accessToken` | JWT — expires in **15 minutes**. Use as `Authorization: Bearer <token>` header. |
| `refreshToken` | JWT — expires in **7 days**. Store securely, use to get new access tokens via `POST /auth/refresh`. |
| `isNewUser` | `true` if account just created. Use to decide onboarding vs dashboard navigation. |
| `user.userType` | `"user"` for new social users. Changes to `"buyer"` or `"vendor"` after profile completion. |
| `user.authProvider` | `"google"` or `"apple"` |

---

## 6. Token Storage & Usage {#tokens}

### Secure storage (recommended)

```bash
npm install react-native-keychain
```

```typescript
import * as Keychain from 'react-native-keychain';

export async function saveTokens(accessToken: string, refreshToken: string) {
  await Keychain.setGenericPassword(
    'tokens',
    JSON.stringify({ accessToken, refreshToken })
  );
}

export async function getTokens() {
  const credentials = await Keychain.getGenericPassword();
  if (!credentials) return null;
  return JSON.parse(credentials.password) as {
    accessToken: string;
    refreshToken: string;
  };
}

export async function clearTokens() {
  await Keychain.resetGenericPassword();
}
```

> ⚠️ Never store tokens in `AsyncStorage` — it's not encrypted.

### Using the access token in API calls

```typescript
import axios from 'axios';

const api = axios.create({ baseURL: API_BASE_URL });

// Attach token to every request
api.interceptors.request.use(async (config) => {
  const tokens = await getTokens();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const tokens = await getTokens();
      if (tokens?.refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });
          await saveTokens(data.accessToken, data.refreshToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(error.config);
        } catch {
          await clearTokens();
          // Navigate to login screen
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 7. Error Handling {#errors}

### Backend error responses

| HTTP | `message` | Cause |
|---|---|---|
| 400 | `"Google OAuth is not configured..."` | Backend missing `GOOGLE_CLIENT_ID` env var |
| 400 | `"Apple Sign In is not configured..."` | Backend missing Apple env vars |
| 401 | `"Invalid or expired Google token..."` | Token is stale — user must re-sign-in |
| 401 | `"Invalid or expired Apple token..."` | Token is stale — user must re-sign-in |
| 401 | `"Google account email is not verified..."` | User's Google email is unverified |
| 401 | `"This account uses social login..."` | User tries email+password on a social account |

### React Native error parser

```typescript
export function parseAuthError(error: any): string {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.code === 'SIGN_IN_CANCELLED') {
    return 'Sign in was cancelled.';
  }
  if (error?.code === 'IN_PROGRESS') {
    return 'Sign in already in progress.';
  }
  if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
    return 'Google Play Services is not available on this device.';
  }
  return 'Something went wrong. Please try again.';
}
```

---

## 8. Post-Login UX Flow {#post-login}

```
Social Login Success
       │
       ├── isNewUser === true
       │        │
       │        └──► Navigate to ProfileSetup screen
       │                   │
       │                   └──► user fills in details
       │                   └──► they can later register as Buyer: POST /auth/register/buyer
       │                   └──► or as Vendor: POST /auth/register/vendor
       │
       └── isNewUser === false
                │
                ├── user.userType === "user"   → Navigate to role selection / onboarding
                ├── user.userType === "buyer"  → Navigate to Buyer home
                └── user.userType === "vendor" → Navigate to Vendor dashboard
```

### Complete auth screen example

```typescript
export function AuthScreen() {
  return (
    <View>
      <GoogleSignInButton />
      {Platform.OS === 'ios' && appleAuth.isSupported && (
        <AppleSignInButton />
      )}
      <Text>─── or ───</Text>
      <EmailPasswordForm />
    </View>
  );
}
```

---

## Quick Reference Checklist

### Backend setup
- [ ] Add `GOOGLE_CLIENT_ID` to `.env`
- [ ] Add `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` to `.env`
- [ ] Run migration: `npx prisma migrate dev`

### React Native setup
- [ ] Install `@react-native-google-signin/google-signin`
- [ ] Install `react-native-apple-authentication`
- [ ] Install `react-native-keychain` for secure storage
- [ ] Configure Google Web Client ID in app startup
- [ ] Enable "Sign In with Apple" Xcode capability
- [ ] Add bundle ID to Apple Developer Console

### Testing
- [ ] Google: Test on emulator (Android) or device (iOS)
- [ ] Apple: Test on real iOS device or TestFlight only
- [ ] Verify `isNewUser` routing works correctly
- [ ] Verify token refresh flow works on `401` responses
