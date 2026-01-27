# Admin Permission System Documentation

## Overview

The Admin Permission System provides role-based access control (RBAC) for the admin dashboard.

- **Roles:**
  - `SUPER_ADMIN` → Full access to the application. Only one exists.
  - `EMPLOYEE` → Limited access. Permissions are assigned per page or feature by the super admin.

- **Permissions:**
  - Represent access to specific pages, actions, or features (e.g., `dashboard.view`, `orders.manage`).
  - Stored in the `Permission` table in the database.
  - Assigned to employees via the `AdminPermission` join table.

---

## Database Models

### 1. Admin

```prisma
enum AdminRole {
  SUPER_ADMIN
  EMPLOYEE
}

model Admin {
  id           Int               @id @default(autoincrement())
  email        String            @unique
  passwordHash String
  role         AdminRole
  permissions  AdminPermission[]
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
}
```

- `role`: Defines whether the admin is super or employee.
- `permissions`: Links to page/action permissions.

---

### 2. Permission

```prisma
model Permission {
  id          Int               @id @default(autoincrement())
  key         String            @unique
  description String?
  admins      AdminPermission[]
}
```

- `key`: Unique identifier for a page or action, e.g., `dashboard.view`.
- `description`: Optional explanation of the permission.

---

### 3. AdminPermission (Join Table)

```prisma
model AdminPermission {
  adminId      Int
  permissionId Int

  admin       Admin      @relation(fields: [adminId], references: [id], onDelete: Cascade)
  permission  Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([adminId, permissionId])
}
```

- Stores which permissions are assigned to which admin.
- Many-to-many relationship.

---

## Permissions Flow

### 1. Super Admin

- Has role `SUPER_ADMIN`.
- Full access by default.
- Does not require individual permissions.

### 2. Employee

- Has role `EMPLOYEE`.
- Permissions are explicitly assigned by super admin.
- Cannot assign permissions to others.

### 3. Assigning Permissions

- Endpoint: `POST /auth/admin/:adminId/permissions`
- **Headers:** `Authorization: Bearer <JWT>`
- **Body:** `['dashboard.view', 'orders.edit']`

**Example Request:**

```json
POST /auth/admin/2/permissions
{
  "permissions": ["dashboard.view", "orders.edit"]
}
```

- Deletes any previous permissions for the employee.
- Adds the new permissions provided.

---

## Backend Implementation

### 1. Guards

- **`AdminAuthGuard`** → Verifies admin authentication.
- **`PermissionGuard`** → Verifies if an admin has the required permission.
- **`@Permissions()` decorator** → Specifies the required permission for an endpoint.

**Example:**

```ts
@Get("dashboard")
@Permissions("dashboard.view")
@UseGuards(PermissionGuard)
getDashboard() {
  return { message: "Access granted", success: true };
}
```

- SUPER_ADMIN bypass:

```ts
if (admin.role === "SUPER_ADMIN") return true;
```

### 2. Creating Super Admin

- Endpoint: `POST /auth/admin/bootstrap`
- Body: `CreateSuperAdminDto` (email + password)
- Only executed once during app initialization.

```ts
@Post("admin/bootstrap")
@HttpCode(HttpStatus.CREATED)
async bootstrapSuperAdmin(@Body() dto: CreateSuperAdminDto) {
  return this.authService.createSuperAdmin(dto);
}
```

### 3. Creating Employee

- Endpoint: `POST /auth/create-employee`
- Guards: `PermissionGuard` (employee cannot create other employees)
- Assign permissions after creation using `/auth/admin/:adminId/permissions`.

### 4. Assign Permissions Example

```ts
@Post("admin/:adminId/permissions")
@UseGuards(AdminAuthGuard)
@Permissions("admin.permission.assign")
@UseGuards(PermissionGuard)
async assignPermissions(
  @Param("adminId") adminId: number,
  @Body() permissions: string[],
) {
  const permissionRecords = await this.prisma.permission.findMany({
    where: { key: { in: permissions } },
  });

  await this.prisma.adminPermission.deleteMany({ where: { adminId } });

  await this.prisma.adminPermission.createMany({
    data: permissionRecords.map(p => ({ adminId, permissionId: p.id })),
  });

  return { message: "Permissions updated successfully" };
}
```

---

## Frontend Implementation

### 1. Fetch Employee Permissions

```ts
const response = await fetch("/auth/admin/me", {
  headers: { Authorization: `Bearer ${token}` },
});
const admin = await response.json();
const permissions = admin.permissions.map((p) => p.key);
```

### 2. Check Permissions in React / Next.js

```tsx
function ProtectedPage({ permissions }) {
  if (!permissions.includes("dashboard.view")) {
    return <p>No Access</p>;
  }

  return <Dashboard />;
}
```

- Use `permissions.includes("<permission_key>")` to conditionally render pages or buttons.

### 3. Assigning Permissions from Frontend

```ts
async function assignPermissions(adminId, permissionKeys) {
  const response = await fetch(`/auth/admin/${adminId}/permissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(permissionKeys),
  });
  return response.json();
}
```

---

## Example Permission Keys

| Key                       | Description                     |
| ------------------------- | ------------------------------- |
| `dashboard.view`          | Access to dashboard page        |
| `users.manage`            | Create, update, delete users    |
| `orders.view`             | View orders                     |
| `orders.edit`             | Edit order status               |
| `settings.access`         | Access settings page            |
| `admin.permission.assign` | Assign permissions to employees |

---

## Summary

1. `SUPER_ADMIN` → Full access. Only one.
2. `EMPLOYEE` → Access controlled by permissions.
3. Permissions stored in `Permission` table.
4. Assign permissions via `/auth/admin/:adminId/permissions`.
5. Use `@Permissions()` + `PermissionGuard` to protect routes.
6. Frontend checks `permissions.includes()` to control UI.
