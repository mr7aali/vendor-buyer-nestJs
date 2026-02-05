# Vendor Listing API Documentation

## Endpoint

`GET /vendors`

## Description

Retrieves a paginated list of vendors with comprehensive filtering, searching, and sorting capabilities.

## Query Parameters

| Parameter    | Type    | Default   | Description                                                                           |
| ------------ | ------- | --------- | ------------------------------------------------------------------------------------- |
| page         | number  | 1         | Page number for pagination                                                            |
| limit        | number  | 10        | Number of items per page                                                              |
| search       | string  | -         | Search across vendor name, store name, business name, phone, address                  |
| vendorCode   | string  | -         | Filter by vendor code (partial match)                                                 |
| gender       | string  | -         | Filter by gender                                                                      |
| isActive     | boolean | -         | Filter by active status                                                               |
| businessName | string  | -         | Filter by business name (partial match)                                               |
| minRevenue   | number  | -         | Minimum revenue filter                                                                |
| maxRevenue   | number  | -         | Maximum revenue filter                                                                |
| minRating    | number  | -         | Minimum rating filter (0-5)                                                           |
| maxRating    | number  | -         | Maximum rating filter (0-5)                                                           |
| sortBy       | enum    | createdAt | Sort field: `createdAt`, `fulllName`, `storename`, `revenue`, `rating`, `totalOrders` |
| sortOrder    | string  | desc      | Sort order: `asc` or `desc`                                                           |

## Response Structure

```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "vendorCode": "VEN-ABC123",
      "fulllName": "John Doe",
      "phone": "+1234567890",
      "address": "123 Main St",
      "storename": "John's Store",
      "storeDescription": "Best store in town",
      "gender": "male",
      "businessName": "John's Business LLC",
      "businessDescription": "Premium products",
      "logoUrl": "https://example.com/logo.png",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "revenue": 15000.5,
      "rating": 4.5,
      "totalOrders": 150,
      "orderStats": {
        "totalCount": 150,
        "byStatus": {
          "pending": 5,
          "processing": 10,
          "shipped": 15,
          "out_for_delivered": 8,
          "delivered": 110,
          "cancelled": 2
        }
      },
      "counts": {
        "orders": 150,
        "products": 50,
        "categories": 10,
        "coupons": 5,
        "messages": 200,
        "connections": 100
      }
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Usage Examples

### 1. Basic List (First Page)

```bash
GET /vendors?page=1&limit=10
```

### 2. Search for Vendors

```bash
GET /vendors?search=john&page=1&limit=10
```

### 3. Filter by Active Status

```bash
GET /vendors?isActive=true&page=1&limit=10
```

### 4. Filter by Revenue Range

```bash
GET /vendors?minRevenue=10000&maxRevenue=50000&page=1&limit=10
```

### 5. Filter by Rating

```bash
GET /vendors?minRating=4&page=1&limit=10
```

### 6. Sort by Revenue (Highest First)

```bash
GET /vendors?sortBy=revenue&sortOrder=desc&page=1&limit=10
```

### 7. Sort by Rating (Best Rated)

```bash
GET /vendors?sortBy=rating&sortOrder=desc&page=1&limit=10
```

### 8. Sort by Total Orders

```bash
GET /vendors?sortBy=totalOrders&sortOrder=desc&page=1&limit=10
```

### 9. Complex Query (Search + Filters + Sort)

```bash
GET /vendors?search=electronics&isActive=true&minRevenue=5000&minRating=4&sortBy=revenue&sortOrder=desc&page=1&limit=20
```

### 10. Find Vendor by Code

```bash
GET /vendors?vendorCode=VEN-ABC&page=1&limit=10
```

### 11. Filter by Gender and Business Name

```bash
GET /vendors?gender=male&businessName=tech&page=1&limit=10
```

## Response Fields Explained

### Core Vendor Information

- `id`: Unique vendor identifier
- `userId`: Associated user account ID
- `vendorCode`: Unique vendor code (e.g., VEN-ABC123)
- `fulllName`: Vendor's full name
- `phone`: Contact phone number
- `address`: Physical address
- `storename`: Store/shop name
- `storeDescription`: Store description
- `gender`: Vendor's gender
- `businessName`: Registered business name
- `businessDescription`: Business description
- `logoUrl`: Store logo URL
- `isActive`: Whether vendor account is active
- `createdAt`: Account creation timestamp
- `updatedAt`: Last update timestamp

### Calculated Metrics

- `revenue`: Total revenue from delivered orders
- `rating`: Average customer rating (0-5) - _requires Review model implementation_
- `totalOrders`: Total number of orders

### Order Statistics

- `orderStats.totalCount`: Total orders count
- `orderStats.byStatus`: Breakdown of orders by status

### Relationship Counts

- `counts.orders`: Total orders
- `counts.products`: Total products
- `counts.categories`: Total categories
- `counts.coupons`: Total coupons
- `counts.messages`: Total messages
- `counts.connections`: Total buyer connections

## Notes

1. **Revenue Calculation**: Only includes orders with status "delivered"
2. **Rating**: Currently returns 0 (placeholder). Implement the Review model to get actual ratings
3. **Search**: Searches across multiple fields (name, store name, business name, phone, address)
4. **Filtering**: Revenue and rating filters are applied after initial database query
5. **Sorting**: Supports sorting by multiple fields including calculated metrics

## Implementation Steps

1. Copy the DTO file to your DTOs folder
2. Copy the service method to your VendorService
3. Add the controller endpoint
4. (Optional) Implement the Review model for actual ratings
5. Update imports and paths as needed

## Testing with cURL

```bash
# Basic request
curl -X GET "http://localhost:3000/vendors?page=1&limit=10"

# With filters
curl -X GET "http://localhost:3000/vendors?isActive=true&minRevenue=10000&sortBy=revenue&sortOrder=desc"

# Search query
curl -X GET "http://localhost:3000/vendors?search=electronics&page=1&limit=20"
```

## Testing with Postman/Insomnia

Create a GET request to:

```
{{baseUrl}}/vendors
```

Add query parameters as needed from the table above.
