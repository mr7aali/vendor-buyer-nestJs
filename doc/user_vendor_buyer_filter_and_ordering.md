## Example API Calls

### 1. Get all users with default pagination:

```
GET /auth/user?page=1&limit=10
```

### 2. Get only buyers:

```
GET /auth/user?userType=buyer&page=1&limit=20
```

### 3. Get only vendors:

```
GET /auth/user?userType=vendor&page=1&limit=15
```

### 4. Search users by email or name:

```
GET /auth/user?search=john&page=1&limit=10
```

### 5. Get active vendors only:

```
GET /auth/user?userType=vendor&isActive=true&page=1&limit=10
```

### 6. Search by vendor code:

```
GET /auth/user?vendorCode=VEN-A1B2&page=1&limit=10
```

### 7. Filter by gender:

```
GET /auth/user?gender=male&page=1&limit=10
```

### 8. Sort by email ascending:

```
GET /auth/user?sortBy=email&sortOrder=asc&page=1&limit=10
```

### 9. Include messages and notifications:

```
GET /auth/user?includeMessages=true&includeNotifications=true&page=1&limit=10
```

### 10. Combine multiple filters:

```
GET /auth/user?userType=vendor&isActive=true&search=electronics&sortBy=createdAt&sortOrder=desc&page=1&limit=20
```
