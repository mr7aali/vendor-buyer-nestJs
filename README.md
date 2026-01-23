# E-commerce Admin Dashboard Backend

A comprehensive NestJS backend application for an e-commerce platform with vendor-buyer connections, product management, shopping cart, orders, Stripe payments, coupons, messaging, and notifications.
#cloudinary documentation

```
https://cloudinary.com/blog/guest_post/signed-image-uploading-to-cloudinary-with-angular-and-nestjs
```

## Features

- **User Management**: Separate registration for vendors and buyers
- **Vendor-Buyer Connections**: Buyers connect to vendors using vendor codes
- **Category Management**: Vendors can create and manage their own categories
- **Product Management**: Vendors can add products under specific categories
- **Shopping Cart**: Buyers can add products to cart (only from connected vendors)
- **Order Management**: Place orders with coupon support
- **Stripe Payments**: Integrated payment processing with Stripe
- **Coupon System**: Vendors can create coupons and assign them to specific buyers
- **Messaging**: Vendor-buyer messaging system
- **Notifications**: User notification system

## Tech Stack

- **Framework**: NestJS 11
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (Passport)
- **Payment**: Stripe
- **Validation**: class-validator, class-transformer
- **Password Hashing**: bcrypt

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- Stripe account (for payments)
- Yarn or npm

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd dashboard-backend
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:
   Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/your_db?schema=public"
JWT_ACCESS_SECRET=your-super-secret-jwt-key-change-this-in-production
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PORT=3000
```

4. Generate Prisma Client:

```bash
yarn prisma:generate
```

5. Run database migrations:

```bash
yarn prisma:migrate
```

## Running the Application

Development mode:

```bash
yarn start:dev
```

Production mode:

```bash
yarn build
yarn start:prod
```

The API will be available at `http://localhost:3000/api`

## Database Schema

The application uses Prisma with PostgreSQL. Key entities include:

- **Users**: Base user accounts (vendors/buyers)
- **Vendors**: Vendor profiles with vendor codes
- **Buyers**: Buyer profiles
- **VendorBuyerConnections**: Connection relationships
- **Categories**: Vendor-specific categories
- **Products**: Products under categories
- **Carts**: Shopping carts
- **CartItems**: Cart items
- **Orders**: Order management
- **OrderItems**: Order line items
- **Payments**: Stripe payment records
- **Coupons**: Discount coupons
- **CouponBuyerAssignments**: Coupon assignments to buyers
- **Messages**: Vendor-buyer messages
- **Notifications**: User notifications

## API Endpoints

### Authentication

- `POST /api/auth/register/vendor` - Register as vendor
- `POST /api/auth/register/buyer` - Register as buyer
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (protected)

### Connections

- `POST /api/connections/connect` - Connect to vendor using code (buyer only)
- `GET /api/connections/my-connections` - Get all connections
- `DELETE /api/connections/disconnect/:vendorId` - Disconnect from vendor (buyer only)

### Categories

- `POST /api/categories` - Create category (vendor only)
- `GET /api/categories/vendor/:vendorId` - Get categories for vendor
- `GET /api/categories/:id` - Get category by ID
- `PATCH /api/categories/:id` - Update category (vendor only)
- `DELETE /api/categories/:id` - Delete category (vendor only)

### Products

- `POST /api/products` - Create product (vendor only)
- `GET /api/products/vendor/:vendorId` - Get products for vendor
- `GET /api/products/:id` - Get product by ID
- `PATCH /api/products/:id` - Update product (vendor only)
- `DELETE /api/products/:id` - Delete product (vendor only)

### Cart

- `GET /api/cart` - Get cart (buyer only)
- `POST /api/cart/add` - Add item to cart (buyer only)
- `PATCH /api/cart/items/:itemId` - Update cart item (buyer only)
- `DELETE /api/cart/items/:itemId` - Remove cart item (buyer only)
- `DELETE /api/cart/clear` - Clear cart (buyer only)

### Orders

- `POST /api/orders` - Create order (buyer only)
- `GET /api/orders` - Get all orders (buyer/vendor)
- `GET /api/orders/:id` - Get order by ID
- `PATCH /api/orders/:id/status` - Update order status (vendor only)

### Payments

- `POST /api/payments/create-intent` - Create payment intent (buyer only)
- `GET /api/payments/order/:orderId` - Get payment by order ID
- `POST /api/payments/webhook` - Stripe webhook endpoint

### Coupons

- `POST /api/coupons` - Create coupon (vendor only)
- `GET /api/coupons` - Get coupons (vendor/buyer)
- `GET /api/coupons/:id` - Get coupon by ID (vendor only)
- `POST /api/coupons/:id/assign` - Assign coupon to buyer (vendor only)
- `PATCH /api/coupons/:id/deactivate` - Deactivate coupon (vendor only)

### Messages

- `POST /api/messages` - Send message
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/conversation/:partnerId` - Get messages with partner
- `PATCH /api/messages/:id/read` - Mark message as read

### Notifications

- `POST /api/notifications` - Create notification
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread` - Get unread notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

## Authentication

All endpoints except registration and login require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Role-Based Access Control

Some endpoints are restricted to specific user types:

- **Vendor only**: Creating/updating categories, products, coupons, order status updates
- **Buyer only**: Cart operations, order creation, connecting to vendors

## Stripe Integration

The payment system uses Stripe Payment Intents. To handle webhooks:

1. Set up a webhook endpoint in your Stripe dashboard
2. Point it to `https://your-domain.com/api/payments/webhook`
3. Configure `STRIPE_WEBHOOK_SECRET` in your `.env` file

## Database Migrations

After making changes to the Prisma schema:

```bash
yarn prisma:migrate
```

To open Prisma Studio (database GUI):

```bash
yarn prisma:studio
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── dto/                # Data transfer objects
│   ├── guards/             # JWT and role guards
│   ├── strategies/         # Passport strategies
│   └── decorators/         # Custom decorators
├── prisma/                 # Prisma service and module
├── vendor-buyer-connections/  # Connection management
├── categories/             # Category management
├── products/               # Product management
├── cart/                   # Shopping cart
├── orders/                 # Order management
├── payments/               # Stripe payment integration
├── coupons/                # Coupon system
├── messages/               # Messaging system
├── notifications/          # Notification system
└── main.ts                 # Application entry point
```

## Development

Run in development mode with hot-reload:

```bash
yarn start:dev
```

Run tests:

```bash
yarn test
```

Lint code:

```bash
yarn lint
```

## License

UNLICENSED
