# 📚 Inventory Management API Documentation

## Overview
The Inventory Management API provides comprehensive functionality for managing educational institution inventory across a hierarchical system. This API follows RESTful principles and implements role-based access control.

## Base URL
```
https://your-domain.com/api
```

## Authentication
All endpoints require authentication using Laravel Sanctum tokens:
```bash
Authorization: Bearer your-token-here
```

## Rate Limiting
Different endpoints have specific rate limits:
- **Default**: 300 requests/hour
- **Analytics**: 30 requests/hour  
- **Bulk Operations**: 10 requests/hour
- **Export Operations**: 5 requests/hour
- **Maintenance**: 100 requests/hour
- **Transactions**: 200 requests/hour

## Error Responses
All error responses follow this format:
```json
{
    "success": false,
    "message": "Error description",
    "errors": {
        "field": ["Validation error message"]
    }
}
```

## Success Responses
All success responses follow this format:
```json
{
    "success": true,
    "message": "Success message",
    "data": {
        // Response data
    }
}
```

---

# 📦 Core Inventory CRUD Operations

## List Inventory Items
**GET** `/api/inventory`

Retrieve paginated list of inventory items with filtering options.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `institution_id` | integer | No | Filter by institution |
| `category` | string | No | Filter by category (electronics, furniture, etc.) |
| `status` | string | No | Filter by status (available, in_use, etc.) |
| `condition` | string | No | Filter by condition (new, excellent, etc.) |
| `assigned_to` | integer | No | Filter by assigned user ID |
| `room_id` | integer | No | Filter by room ID |
| `is_consumable` | boolean | No | Filter consumable items |
| `low_stock` | boolean | No | Show low stock items only |
| `needs_maintenance` | boolean | No | Show items needing maintenance |
| `warranty_expiring` | boolean | No | Show items with expiring warranty |
| `warranty_expiring_days` | integer | No | Days until warranty expiry (1-365) |
| `search` | string | No | Search in name, description, code |
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Items per page (max: 100) |
| `sort_by` | string | No | Sort field (name, category, status, etc.) |
| `sort_order` | string | No | Sort order (asc, desc) |
| `include` | string | No | Include relationships |

### Example Request
```bash
GET /api/inventory?category=electronics&status=available&per_page=20&page=1
```

### Example Response
```json
{
    "success": true,
    "message": "Inventory items retrieved successfully",
    "data": {
        "current_page": 1,
        "data": [
            {
                "id": 1,
                "name": "Dell Laptop Inspiron 15",
                "code": "ELE-2024-001",
                "category": "electronics",
                "status": "available",
                "condition": "excellent",
                "current_value": 850.00,
                "institution": {
                    "id": 1,
                    "name": "Bakı Şəhər Təhsil İdarəsi"
                },
                "room": {
                    "id": 10,
                    "name": "Computer Lab 1"
                }
            }
        ],
        "total": 150,
        "per_page": 20,
        "current_page": 1,
        "last_page": 8
    }
}
```

## Create Inventory Item
**POST** `/api/inventory`

Create a new inventory item.

### Required Permissions
- `inventory.create`

### Request Body
```json
{
    "name": "Dell Laptop Inspiron 15",
    "description": "High-performance laptop for educational use",
    "category": "electronics",
    "subcategory": "computers",
    "brand": "Dell",
    "model": "Inspiron 15 3000",
    "serial_number": "DLAP123456789",
    "code": "ELE-2024-001",
    "condition": "new",
    "purchase_date": "2024-01-15",
    "purchase_price": 1200.00,
    "current_value": 1200.00,
    "depreciation_rate": 20.0,
    "warranty_expiry": "2026-01-15",
    "supplier": "Dell Technologies",
    "location": "Computer Lab 1",
    "room_id": 10,
    "institution_id": 1,
    "is_consumable": false,
    "notes": "Purchased for computer science classes",
    "specifications": {
        "processor": "Intel Core i5",
        "ram": "8GB",
        "storage": "256GB SSD"
    },
    "maintenance_schedule": "Annual hardware check"
}
```

### Response
```json
{
    "success": true,
    "message": "Inventory item created successfully",
    "data": {
        "id": 1,
        "name": "Dell Laptop Inspiron 15",
        "code": "ELE-2024-001",
        "category": "electronics",
        "status": "available",
        "condition": "new",
        "purchase_price": 1200.00,
        "current_value": 1200.00,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
    }
}
```

## Get Inventory Item
**GET** `/api/inventory/{item}`

Retrieve detailed information about a specific inventory item.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `item` | integer | Yes | Inventory item ID |

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include` | string | No | Include relationships (transactions, maintenance, etc.) |

### Example Response
```json
{
    "success": true,
    "message": "Inventory item retrieved successfully",
    "data": {
        "id": 1,
        "name": "Dell Laptop Inspiron 15",
        "description": "High-performance laptop for educational use",
        "code": "ELE-2024-001",
        "category": "electronics",
        "subcategory": "computers",
        "brand": "Dell",
        "model": "Inspiron 15 3000",
        "serial_number": "DLAP123456789",
        "status": "available",
        "condition": "excellent",
        "purchase_date": "2024-01-15",
        "purchase_price": 1200.00,
        "current_value": 850.00,
        "depreciation_rate": 20.0,
        "warranty_expiry": "2026-01-15",
        "supplier": "Dell Technologies",
        "location": "Computer Lab 1",
        "institution": {
            "id": 1,
            "name": "Bakı Şəhər Təhsil İdarəsi",
            "type": "regional_office"
        },
        "room": {
            "id": 10,
            "name": "Computer Lab 1",
            "building": "Main Building"
        },
        "assigned_user": null,
        "specifications": {
            "processor": "Intel Core i5",
            "ram": "8GB",
            "storage": "256GB SSD"
        },
        "recent_transactions": [],
        "maintenance_records": [],
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T12:45:00Z"
    }
}
```

## Update Inventory Item
**PUT** `/api/inventory/{item}`

Update an existing inventory item.

### Required Permissions
- `inventory.update`

### Request Body
All fields are optional. Only provide fields you want to update:
```json
{
    "name": "Updated Laptop Name",
    "status": "maintenance",
    "current_value": 800.00,
    "location": "Storage Room",
    "notes": "Updated notes"
}
```

### Response
```json
{
    "success": true,
    "message": "Inventory item updated successfully",
    "data": {
        "id": 1,
        "name": "Updated Laptop Name",
        "status": "maintenance",
        "current_value": 800.00,
        "updated_at": "2024-01-15T14:30:00Z"
    }
}
```

## Delete Inventory Item
**DELETE** `/api/inventory/{item}`

Delete an inventory item (soft delete).

### Required Permissions
- `inventory.delete`

### Response
```json
{
    "success": true,
    "message": "Inventory item deleted successfully",
    "data": null
}
```

## Additional CRUD Endpoints

### Get Item for Public View
**GET** `/api/inventory/{item}/public`

Get limited public information about an inventory item.

### Duplicate Item
**POST** `/api/inventory/{item}/duplicate`

Create a duplicate of an existing inventory item.

### Get Categories
**GET** `/api/inventory-categories`

Get all inventory categories with item counts.

### Search Items
**GET** `/api/inventory-search`

Advanced search functionality for inventory items.

---

# 💱 Transaction Management

## Assign Item
**POST** `/api/inventory/transactions/{item}/assign`

Assign an inventory item to a user.

### Required Permissions
- `inventory.transactions`

### Request Body
```json
{
    "user_id": 45,
    "quantity": 1,
    "expected_return_date": "2024-02-15",
    "notes": "Assigned for training session",
    "notify_user": true
}
```

### Response
```json
{
    "success": true,
    "message": "Item assigned successfully",
    "data": {
        "id": 789,
        "type": "assignment",
        "description": "Item assigned to user",
        "quantity": 1,
        "transaction_date": "2024-01-15T10:30:00Z",
        "expected_return_date": "2024-02-15",
        "user": {
            "id": 1,
            "username": "admin",
            "full_name": "System Administrator"
        },
        "assigned_user": {
            "id": 45,
            "username": "teacher1",
            "full_name": "John Teacher"
        },
        "item": {
            "id": 1,
            "name": "Dell Laptop Inspiron 15",
            "code": "ELE-2024-001"
        }
    }
}
```

## Return Item
**POST** `/api/inventory/transactions/{item}/return`

Return an assigned inventory item.

### Request Body
```json
{
    "condition": "excellent",
    "return_notes": "Returned in good condition",
    "damage_report": null
}
```

## Update Stock
**PUT** `/api/inventory/transactions/{item}/stock`

Update stock quantity for consumable items.

### Request Body
```json
{
    "quantity": 50,
    "operation": "add",
    "reason": "New stock received",
    "supplier": "Office Supplies Ltd"
}
```

## Transfer Item
**POST** `/api/inventory/transactions/{item}/transfer`

Transfer item between locations or institutions.

### Request Body
```json
{
    "destination_institution_id": 2,
    "destination_room_id": 15,
    "transfer_reason": "Relocated to new campus",
    "expected_transfer_date": "2024-01-20"
}
```

## Get Transaction History
**GET** `/api/inventory/transactions/{item}/history`

Get complete transaction history for an item.

## Get Transaction Summary
**GET** `/api/inventory/transactions/{item}/summary`

Get transaction summary statistics.

## Bulk Operations

### Bulk Assign Preview
**POST** `/api/inventory/transactions/bulk/assign/preview`

Preview bulk assignment operation.

### Bulk Assign
**POST** `/api/inventory/transactions/bulk/assign`

Perform bulk assignment of multiple items.

### Bulk Return
**POST** `/api/inventory/transactions/bulk/return`

Perform bulk return of multiple items.

## Reporting Endpoints

### User Assignments
**GET** `/api/inventory/transactions/user/{user_id}/assignments`

Get all items assigned to a specific user.

### Overdue Returns
**GET** `/api/inventory/transactions/overdue-returns`

Get list of overdue item returns.

### Transaction Statistics
**GET** `/api/inventory/transactions/statistics`

Get transaction statistics and metrics.

---

# 🔧 Maintenance Management

## Schedule Maintenance
**POST** `/api/inventory/maintenance/{item}/schedule`

Schedule maintenance for an inventory item.

### Required Permissions
- `inventory.maintenance`

### Request Body
```json
{
    "maintenance_type": "repair",
    "description": "Fix broken screen",
    "priority": "high",
    "scheduled_date": "2024-01-20",
    "estimated_cost": 150.00,
    "estimated_duration": 2,
    "assigned_to": 67,
    "parts_needed": ["LCD Screen", "Tools"],
    "notify_assignee": true
}
```

### Response
```json
{
    "success": true,
    "message": "Maintenance scheduled successfully",
    "data": {
        "id": 456,
        "maintenance_type": "repair",
        "description": "Fix broken screen",
        "status": "scheduled",
        "priority": "high",
        "scheduled_date": "2024-01-20",
        "estimated_cost": 150.00,
        "estimated_duration": 2,
        "work_order_number": "WO-2401-1234",
        "item": {
            "id": 123,
            "name": "Laptop Dell Inspiron",
            "code": "ELE-2401-0123"
        },
        "assigned_to": {
            "id": 67,
            "username": "technician1",
            "full_name": "Mike Technician"
        }
    }
}
```

## Get Maintenance Records
**GET** `/api/inventory/maintenance/{item}/records`

Get all maintenance records for an item.

## Maintenance Record Operations

### Start Maintenance
**POST** `/api/inventory/maintenance/{maintenance}/start`

Start a scheduled maintenance task.

### Complete Maintenance
**POST** `/api/inventory/maintenance/{maintenance}/complete`

Mark maintenance as completed.

### Cancel Maintenance
**POST** `/api/inventory/maintenance/{maintenance}/cancel`

Cancel a scheduled maintenance task.

### Update Maintenance Status
**PUT** `/api/inventory/maintenance/{maintenance}/status`

Update maintenance status.

## Schedule and Planning

### Get Maintenance Schedule
**GET** `/api/inventory/maintenance/schedule`

Get maintenance schedule for specified date range.

### Get Upcoming Due Maintenance
**GET** `/api/inventory/maintenance/upcoming-due`

Get maintenance tasks due soon.

### Get Overdue Maintenance
**GET** `/api/inventory/maintenance/overdue`

Get overdue maintenance tasks.

### Get Maintenance Calendar
**GET** `/api/inventory/maintenance/calendar`

Get calendar view of maintenance schedule.

## Bulk Operations

### Bulk Schedule Maintenance
**POST** `/api/inventory/maintenance/bulk/schedule`

Schedule maintenance for multiple items.

## Reporting

### Maintenance Statistics
**GET** `/api/inventory/maintenance/statistics`

Get maintenance statistics and metrics.

### Maintenance Cost Summary
**GET** `/api/inventory/maintenance/cost-summary`

Get maintenance cost analysis.

---

# 📊 Analytics & Reporting

## Get Statistics
**GET** `/api/inventory/analytics/statistics`

Get comprehensive inventory statistics.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `institution_id` | integer | No | Filter by institution |
| `date_from` | date | No | Start date for statistics |
| `date_to` | date | No | End date for statistics |
| `category` | string | No | Filter by category |

### Response
```json
{
    "success": true,
    "message": "Inventory statistics retrieved successfully",
    "data": {
        "overview": {
            "total_items": 1250,
            "total_purchase_value": 750000.00,
            "total_current_value": 425000.00,
            "active_items": 1100,
            "inactive_items": 150,
            "depreciation_rate": 43.3
        },
        "by_category": {
            "electronics": {
                "count": 450,
                "value": 285000.00,
                "percentage": 36.0
            },
            "furniture": {
                "count": 320,
                "value": 96000.00,
                "percentage": 25.6
            }
        },
        "by_status": {
            "available": 800,
            "in_use": 300,
            "maintenance": 50,
            "damaged": 30,
            "retired": 70
        },
        "by_condition": {
            "excellent": 400,
            "good": 600,
            "fair": 200,
            "poor": 50
        },
        "alerts": {
            "low_stock_items": 15,
            "items_needing_maintenance": 25,
            "warranty_expiring_soon": 12,
            "overdue_returns": 8
        },
        "trends": {
            "monthly_purchases": [],
            "depreciation_trend": [],
            "maintenance_frequency": []
        }
    }
}
```

## Get Dashboard Data
**GET** `/api/inventory/analytics/dashboard`

Get dashboard-ready analytics data.

## Financial Reports

### Inventory Valuation
**GET** `/api/inventory/analytics/valuation`

Get current inventory valuation report.

### Depreciation Analysis
**GET** `/api/inventory/analytics/depreciation`

Get depreciation analysis and forecasts.

### Cost Trends
**GET** `/api/inventory/analytics/cost-trends`

Get cost trend analysis over time.

### ROI Analysis
**GET** `/api/inventory/analytics/roi-analysis`

Get return on investment analysis.

## Performance Reports

### Utilization Report
**GET** `/api/inventory/analytics/utilization`

Get asset utilization statistics.

### Category Performance
**GET** `/api/inventory/analytics/category-performance`

Get performance metrics by category.

### Institution Comparison
**GET** `/api/inventory/analytics/institution-comparison`

Compare inventory metrics across institutions.

### Asset Lifecycle Analysis
**GET** `/api/inventory/analytics/asset-lifecycle`

Get asset lifecycle analysis.

## Maintenance Analytics

### Maintenance Costs
**GET** `/api/inventory/analytics/maintenance-costs`

Get maintenance cost analysis.

## Advanced Analytics

### Predictive Analytics
**GET** `/api/inventory/analytics/predictive`

Get predictive analytics and forecasts.

### Compliance Report
**GET** `/api/inventory/analytics/compliance`

Get compliance and audit reports.

### Benchmarks
**GET** `/api/inventory/analytics/benchmarks`

Get performance benchmarks.

## Custom Reports and Export

### Generate Custom Report
**POST** `/api/inventory/analytics/custom-report`

Generate custom analytics reports.

### Export Data
**POST** `/api/inventory/analytics/export`

Export analytics data in various formats.

---

# 🔒 Permissions Required

## Permission Levels
- `inventory.read` - View inventory items
- `inventory.create` - Create inventory items
- `inventory.update` - Update inventory items
- `inventory.delete` - Delete inventory items
- `inventory.transactions` - Manage transactions
- `inventory.maintenance` - Manage maintenance
- `inventory.analytics` - Access analytics
- `inventory.export` - Export data
- `inventory.admin` - Full inventory administration

## Role-Based Access
- **SuperAdmin**: All permissions
- **RegionAdmin**: Full access within region
- **SektorAdmin**: Full access within sector
- **SchoolAdmin**: Full access within school
- **Teachers**: Read access + basic transactions

---

# 📋 HTTP Status Codes

- `200 OK` - Successful GET, PUT requests
- `201 Created` - Successful POST requests
- `204 No Content` - Successful DELETE requests
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

# 🔄 Pagination

All list endpoints support pagination:

### Request Parameters
- `page` - Page number (default: 1)
- `per_page` - Items per page (max: 100, default: 15)

### Response Format
```json
{
    "current_page": 1,
    "data": [...],
    "first_page_url": "https://api.example.com/inventory?page=1",
    "from": 1,
    "last_page": 10,
    "last_page_url": "https://api.example.com/inventory?page=10",
    "next_page_url": "https://api.example.com/inventory?page=2",
    "path": "https://api.example.com/inventory",
    "per_page": 15,
    "prev_page_url": null,
    "to": 15,
    "total": 150
}
```

---

# 🔍 Filtering and Search

## Common Filters
- `institution_id` - Filter by institution
- `category` - Filter by category
- `status` - Filter by status
- `condition` - Filter by condition
- `search` - Full-text search
- `date_from` / `date_to` - Date range filters

## Search Capabilities
- Full-text search in name, description, code
- Category-specific search
- Advanced filtering combinations
- Sort by multiple fields

---

# 📝 Validation Rules

## Common Field Validations
- `name` - Required, max 255 characters
- `category` - Required, must be valid category
- `status` - Must be valid status
- `condition` - Required, must be valid condition
- `purchase_price` - Numeric, minimum 0
- `current_value` - Numeric, minimum 0
- `depreciation_rate` - Numeric, 0-100
- `quantity` - Integer, minimum 0
- `email` - Valid email format
- `date` - Valid date format (YYYY-MM-DD)

---

# 🚀 Rate Limiting Headers

Responses include rate limiting headers:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time (Unix timestamp)
- `Retry-After` - Seconds to wait (when rate limited)

---

This documentation provides comprehensive coverage of the Inventory Management API endpoints, request/response formats, authentication, permissions, and usage examples.