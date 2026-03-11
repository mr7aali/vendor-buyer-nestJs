# Switch Profile API (React Native)

This endpoint lets a logged-in user switch active role between `buyer` and `vendor`.

## Endpoint

```http
POST /auth/switch-profile
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

Request body:

```json
{
  "targetRole": "vendor"
}
```

Allowed `targetRole` values:
- `buyer`
- `vendor`

## Success response

Note: this project uses a global response wrapper.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "accessToken": "<NEW_ACCESS_TOKEN>",
    "refreshToken": "<NEW_REFRESH_TOKEN>",
    "user": {
      "id": "<buyer_or_vendor_profile_id>",
      "email": "user@example.com",
      "userType": "vendor"
    },
    "availableProfiles": {
      "buyer": true,
      "vendor": true
    }
  }
}
```

## Error cases

### Missing target profile

If user tries to switch to a role that is not created yet:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Vendor profile is not available. Please complete vendor registration first.",
  "messages": null
}
```

### Unauthorized token

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Recommended frontend flow

1. Keep storing `accessToken`, `refreshToken`, and `user` from login response.
2. Also store `availableProfiles` from login/switch response.
3. Show profile-switch UI only when `availableProfiles.buyer && availableProfiles.vendor` is `true`.
4. On switch action:
   - call `POST /auth/switch-profile` with current access token
   - replace stored `accessToken`, `refreshToken`, `user`, and `availableProfiles` with returned values
   - refresh user-specific data (cart, products, dashboards) for the new role
5. If API returns `400` profile-not-available, route user to profile registration.

## React Native example

```ts
type SwitchRole = "buyer" | "vendor";

async function switchProfile(targetRole: SwitchRole, accessToken: string) {
  const res = await fetch(`${API_URL}/auth/switch-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ targetRole }),
  });

  const json = await res.json();

  if (!res.ok || !json?.success) {
    throw new Error(json?.message || "Failed to switch profile");
  }

  const payload = json.data;

  // Persist latest auth state
  await saveAuthState({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: payload.user,
    availableProfiles: payload.availableProfiles,
  });

  return payload;
}
```
