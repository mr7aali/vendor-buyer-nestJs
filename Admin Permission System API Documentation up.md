# Admin Permission System API Documentation

Complete API reference for testing all admin endpoints.

## Base URL

```
http://localhost:3000
```

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Admin Management](#admin-management)
3. [Employee Management](#employee-management)
4. [Permission Management](#permission-management)
5. [Protected Routes (Examples)](#protected-routes-examples)
6. [Postman Collection](#postman-collection)

---

## Authentication

### 1. Create Super Admin (Bootstrap)

**One-time setup - Creates the first super admin**

```http
POST /auth/admin/bootstrap
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePassword123",
  "secret": "INIT_SUPER_ADMIN"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Super admin created successfully",
  "admin": {
    "id": 1,
    "email": "admin@example.com",
    "role": "SUPER_ADMIN"
  }
}
```

**Error Response (409):**

```json
{
  "statusCode": 409,
  "message": "Super admin already exists"
}
```

---

### 2. Admin Login

**Login for both super admin and employees**

```http
POST /auth/admin/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePassword123"
}
```

**Success Response (200):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJ0eXBlIjoiQURNSU4iLCJwZXJtaXNzaW9ucyI6W10sImlhdCI6MTcwNjM4MDAwMCwiZXhwIjoxNzA2NDY2NDAwfQ.xxxxxxxxxxxxx",
  "admin": {
    "id": 1,
    "email": "admin@example.com",
    "role": "SUPER_ADMIN",
    "permissions": []
  }
}
```

**Error Response (401):**

```json
{
  "statusCode": 401,
  "message": "Invalid admin credentials"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123"
  }'
```

---

### 3. Get Current Admin Profile

**Get logged-in admin information**

```http
GET /auth/admin/me
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "id": 1,
  "email": "admin@example.com",
  "role": "SUPER_ADMIN",
  "type": "ADMIN",
  "permissions": []
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/auth/admin/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Admin Management

### 4. Get All Employees

**List all employees (not super admins)**

**Required Permission:** `admin.view`

```http
GET /auth/admin/employees
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
[
  {
    "id": 2,
    "email": "employee1@example.com",
    "role": "EMPLOYEE",
    "createdAt": "2024-01-27T12:00:00.000Z",
    "permissions": [
      {
        "id": 1,
        "key": "dashboard.view",
        "name": "View Dashboard",
        "description": "Access to main dashboard"
      },
      {
        "id": 2,
        "key": "users.view",
        "name": "View Users",
        "description": "View users page and user list"
      }
    ]
  },
  {
    "id": 3,
    "email": "employee2@example.com",
    "role": "EMPLOYEE",
    "createdAt": "2024-01-27T13:00:00.000Z",
    "permissions": [
      {
        "id": 6,
        "key": "products.view",
        "name": "View Products",
        "description": "View products page and product list"
      }
    ]
  }
]
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/auth/admin/employees \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 5. Get Employee by ID

**Get specific employee details**

**Required Permission:** `admin.view`

```http
GET /auth/admin/employee/{employeeId}
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "id": 2,
  "email": "employee1@example.com",
  "role": "EMPLOYEE",
  "createdAt": "2024-01-27T12:00:00.000Z",
  "permissions": [
    {
      "id": 1,
      "key": "dashboard.view",
      "name": "View Dashboard",
      "description": "Access to main dashboard"
    },
    {
      "id": 2,
      "key": "users.view",
      "name": "View Users",
      "description": "View users page and user list"
    }
  ]
}
```

**Error Response (404):**

```json
{
  "statusCode": 404,
  "message": "Employee not found"
}
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/auth/admin/employee/2 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Employee Management

### 6. Create Employee

**Create a new employee with initial permissions**

**Required Permission:** `admin.create`

```http
POST /auth/admin/employee
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "email": "employee1@example.com",
  "password": "Employee123",
  "permissions": [
    "dashboard.view",
    "users.view",
    "products.view"
  ]
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Employee created successfully",
  "employee": {
    "id": 2,
    "email": "employee1@example.com",
    "role": "EMPLOYEE"
  }
}
```

**Error Response (409):**

```json
{
  "statusCode": 409,
  "message": "Employee with this email already exists"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/auth/admin/employee \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee1@example.com",
    "password": "Employee123",
    "permissions": ["dashboard.view", "users.view"]
  }'
```

---

### 7. Update Employee Permissions

**Assign or revoke permissions for an employee**

**Required Permission:** `admin.permission.assign`

```http
PATCH /auth/admin/employee/{employeeId}/permissions
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "permissions": [
    "dashboard.view",
    "users.view",
    "users.create",
    "products.view",
    "orders.view"
  ]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Employee permissions updated successfully",
  "permissions": [
    {
      "key": "dashboard.view",
      "name": "View Dashboard"
    },
    {
      "key": "users.view",
      "name": "View Users"
    },
    {
      "key": "users.create",
      "name": "Create Users"
    },
    {
      "key": "products.view",
      "name": "View Products"
    },
    {
      "key": "orders.view",
      "name": "View Orders"
    }
  ]
}
```

**Error Response (400):**

```json
{
  "statusCode": 400,
  "message": "Invalid permission keys: invalid.permission"
}
```

**cURL Example:**

```bash
curl -X PATCH http://localhost:3000/auth/admin/employee/2/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": ["dashboard.view", "users.view", "users.create"]
  }'
```

---

### 8. Delete Employee

**Delete an employee (cannot delete super admin)**

**Required Permission:** `admin.delete`

```http
DELETE /auth/admin/employee/{employeeId}
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Employee deleted successfully"
}
```

**Error Response (403):**

```json
{
  "statusCode": 403,
  "message": "Cannot delete super admin"
}
```

**cURL Example:**

```bash
curl -X DELETE http://localhost:3000/auth/admin/employee/2 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Permission Management

### 9. Get All Permissions

**List all available permissions**

**Required Permission:** None (authenticated admin)

```http
GET /auth/admin/permissions
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
[
  {
    "id": 1,
    "key": "dashboard.view",
    "name": "View Dashboard",
    "description": "Access to main dashboard",
    "createdAt": "2024-01-27T12:00:00.000Z",
    "updatedAt": "2024-01-27T12:00:00.000Z"
  },
  {
    "id": 2,
    "key": "users.view",
    "name": "View Users",
    "description": "View users page and user list",
    "createdAt": "2024-01-27T12:00:00.000Z",
    "updatedAt": "2024-01-27T12:00:00.000Z"
  },
  {
    "id": 3,
    "key": "users.create",
    "name": "Create Users",
    "description": "Create new users",
    "createdAt": "2024-01-27T12:00:00.000Z",
    "updatedAt": "2024-01-27T12:00:00.000Z"
  }
]
```

**cURL Example:**

```bash
curl -X GET http://localhost:3000/auth/admin/permissions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 10. Seed Permissions

**Create default permissions (18 permissions)**

**Required Permission:** `admin.permission.seed`

```http
POST /auth/admin/permissions/seed
Authorization: Bearer {accessToken}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "18 permissions seeded successfully",
  "permissions": [
    {
      "id": 1,
      "key": "dashboard.view",
      "name": "View Dashboard",
      "description": "Access to main dashboard"
    },
    {
      "id": 2,
      "key": "users.view",
      "name": "View Users",
      "description": "View users page and user list"
    }
    // ... 16 more permissions
  ]
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:3000/auth/admin/permissions/seed \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Protected Routes (Examples)

### 11. Dashboard

**Required Permission:** `dashboard.view`

```http
GET /auth/admin/dashboard
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "message": "Dashboard access granted",
  "success": true
}
```

**Error Response (403):**

```json
{
  "statusCode": 403,
  "message": "You don't have the required permissions: dashboard.view"
}
```

---

### 12. Users Page

**Required Permission:** `users.view`

```http
GET /auth/admin/users
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "message": "Users page access granted",
  "success": true
}
```

---

### 13. Products Page

**Required Permission:** `products.view`

```http
GET /auth/admin/products
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "message": "Products page access granted",
  "success": true
}
```

---

### 14. Orders Page

**Required Permission:** `orders.view`

```http
GET /auth/admin/orders
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "message": "Orders page access granted",
  "success": true
}
```

---

### 15. Reports Page

**Required Permission:** `reports.view`

```http
GET /auth/admin/reports
Authorization: Bearer {accessToken}
```

**Success Response (200):**

```json
{
  "message": "Reports page access granted",
  "success": true
}
```

---

## Postman Collection

### Import this JSON into Postman:

```json
{
  "info": {
    "name": "Admin Permission System",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Bootstrap Super Admin",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@example.com\",\n  \"password\": \"SecurePassword123\",\n  \"secret\": \"INIT_SUPER_ADMIN\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/admin/bootstrap",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "bootstrap"]
            }
          }
        },
        {
          "name": "Admin Login",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "var jsonData = pm.response.json();",
                  "pm.environment.set(\"adminToken\", jsonData.accessToken);"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@example.com\",\n  \"password\": \"SecurePassword123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/admin/login",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "login"]
            }
          }
        },
        {
          "name": "Get Admin Profile",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/me",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "me"]
            }
          }
        }
      ]
    },
    {
      "name": "Permissions",
      "item": [
        {
          "name": "Seed Permissions",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/permissions/seed",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "permissions", "seed"]
            }
          }
        },
        {
          "name": "Get All Permissions",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/permissions",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "permissions"]
            }
          }
        }
      ]
    },
    {
      "name": "Employee Management",
      "item": [
        {
          "name": "Create Employee",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"employee1@example.com\",\n  \"password\": \"Employee123\",\n  \"permissions\": [\n    \"dashboard.view\",\n    \"users.view\"\n  ]\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/admin/employee",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "employee"]
            }
          }
        },
        {
          "name": "Get All Employees",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/employees",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "employees"]
            }
          }
        },
        {
          "name": "Get Employee by ID",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/employee/2",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "employee", "2"]
            }
          }
        },
        {
          "name": "Update Employee Permissions",
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              },
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"permissions\": [\n    \"dashboard.view\",\n    \"users.view\",\n    \"users.create\",\n    \"products.view\"\n  ]\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/auth/admin/employee/2/permissions",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "employee", "2", "permissions"]
            }
          }
        },
        {
          "name": "Delete Employee",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/employee/2",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "employee", "2"]
            }
          }
        }
      ]
    },
    {
      "name": "Protected Routes",
      "item": [
        {
          "name": "Dashboard",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/dashboard",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "dashboard"]
            }
          }
        },
        {
          "name": "Users Page",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/users",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "users"]
            }
          }
        },
        {
          "name": "Products Page",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/products",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "products"]
            }
          }
        },
        {
          "name": "Orders Page",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/orders",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "orders"]
            }
          }
        },
        {
          "name": "Reports Page",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{adminToken}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/auth/admin/reports",
              "host": ["{{baseUrl}}"],
              "path": ["auth", "admin", "reports"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "adminToken",
      "value": ""
    }
  ]
}
```

---

## Testing Workflow

### Step 1: Setup (One-time)

```bash
# 1. Bootstrap super admin
curl -X POST http://localhost:3000/auth/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePassword123","secret":"INIT_SUPER_ADMIN"}'

# 2. Login as super admin
curl -X POST http://localhost:3000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePassword123"}'

# Save the accessToken from response
export ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Seed permissions
curl -X POST http://localhost:3000/auth/admin/permissions/seed \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Step 2: Create Employee

```bash
curl -X POST http://localhost:3000/auth/admin/employee \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee1@example.com",
    "password": "Employee123",
    "permissions": ["dashboard.view", "users.view"]
  }'
```

### Step 3: Test Employee Access

```bash
# Login as employee
curl -X POST http://localhost:3000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee1@example.com","password":"Employee123"}'

# Save employee token
export EMPLOYEE_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Try allowed route (should work)
curl -X GET http://localhost:3000/auth/admin/dashboard \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"

# Try forbidden route (should fail)
curl -X GET http://localhost:3000/auth/admin/reports \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"
```

### Step 4: Update Permissions

```bash
# Add reports permission
curl -X PATCH http://localhost:3000/auth/admin/employee/2/permissions \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissions": ["dashboard.view", "users.view", "reports.view"]}'

# Re-login as employee (to get fresh token)
curl -X POST http://localhost:3000/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee1@example.com","password":"Employee123"}'

# Now reports should work
curl -X GET http://localhost:3000/auth/admin/reports \
  -H "Authorization: Bearer $NEW_EMPLOYEE_TOKEN"
```

---

## Error Codes

| Status Code | Meaning      | Common Causes                        |
| ----------- | ------------ | ------------------------------------ |
| 200         | OK           | Request successful                   |
| 201         | Created      | Resource created successfully        |
| 400         | Bad Request  | Invalid request body, missing fields |
| 401         | Unauthorized | Missing or invalid token             |
| 403         | Forbidden    | Insufficient permissions             |
| 404         | Not Found    | Resource not found                   |
| 409         | Conflict     | Resource already exists              |

---

## Common HTTP Headers

### Request Headers

```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

### Response Headers

```
Content-Type: application/json
```

---

## Available Permissions (18 total)

| Permission Key            | Name               | Description              |
| ------------------------- | ------------------ | ------------------------ |
| `dashboard.view`          | View Dashboard     | Access to main dashboard |
| `users.view`              | View Users         | View users page          |
| `users.create`            | Create Users       | Create new users         |
| `users.edit`              | Edit Users         | Edit existing users      |
| `users.delete`            | Delete Users       | Delete users             |
| `products.view`           | View Products      | View products page       |
| `products.create`         | Create Products    | Create new products      |
| `products.edit`           | Edit Products      | Edit existing products   |
| `products.delete`         | Delete Products    | Delete products          |
| `orders.view`             | View Orders        | View orders page         |
| `orders.edit`             | Edit Orders        | Edit order status        |
| `reports.view`            | View Reports       | Access to reports        |
| `admin.view`              | View Admins        | View admin list          |
| `admin.create`            | Create Admin       | Create employees         |
| `admin.delete`            | Delete Admin       | Delete employees         |
| `admin.permission.assign` | Assign Permissions | Manage permissions       |
| `admin.permission.seed`   | Seed Permissions   | Seed initial permissions |

---

## Tips for Testing

1. **Always login first** to get a fresh token
2. **Check token expiry** - tokens expire after 1 day
3. **Re-login after permission changes** to get updated permissions
4. **Use environment variables** for tokens in scripts
5. **Check response status codes** for debugging
6. **Super admin bypasses all permissions** - use employee to test restrictions

---

This API documentation provides everything you need to test the admin permission system! 🚀
