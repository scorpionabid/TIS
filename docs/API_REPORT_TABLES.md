# Report Tables API Documentation

## Overview

The Report Tables API provides endpoints for managing dynamic data collection tables, responses, and analytics in the ATİS system.

**Base URL:** `/api/report-tables`

**Authentication:** Required (Bearer Token or Session-based)

---

## Endpoints

### List Report Tables

```http
GET /api/report-tables
```

Retrieve paginated list of report tables with role-based filtering.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by title or description |
| `status` | string | No | Filter by status: `draft`, `published`, `archived`, `deleted` |
| `per_page` | integer | No | Items per page (default: 15) |
| `page` | integer | No | Page number (default: 1) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Məktəb statistikası",
      "description": "İllik məktəb statistikası cədvəli",
      "status": "published",
      "columns": [
        {
          "key": "student_count",
          "label": "Şagird sayı",
          "type": "number",
          "required": true
        }
      ],
      "max_rows": 10,
      "target_institutions": [1, 2, 3],
      "deadline": "2026-12-31",
      "created_at": "2026-03-01T00:00:00Z",
      "updated_at": "2026-03-01T00:00:00Z",
      "creator": {
        "id": 1,
        "name": "Admin User"
      },
      "responses_count": 5
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 25,
    "last_page": 2
  }
}
```

---

### Get My Tables (School Users)

```http
GET /api/report-tables/my
```

Retrieve tables assigned to the authenticated school user.

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Məktəb statistikası",
      "status": "published",
      "deadline": "2026-12-31",
      "my_response_status": "draft",
      "my_response_row_stats": {
        "total": 5,
        "completed": 3
      }
    }
  ]
}
```

---

### Get Single Table

```http
GET /api/report-tables/{id}
```

Retrieve detailed information about a specific table.

**Response:**

```json
{
  "data": {
    "id": 1,
    "title": "Məktəb statistikası",
    "description": "İllik məktəb statistikası cədvəli",
    "status": "published",
    "columns": [...],
    "max_rows": 10,
    "target_institutions": [1, 2, 3],
    "deadline": "2026-12-31",
    "created_at": "2026-03-01T00:00:00Z",
    "updated_at": "2026-03-01T00:00:00Z",
    "creator": {...},
    "can_edit": true,
    "can_edit_columns": false
  }
}
```

---

### Create Report Table

```http
POST /api/report-tables
```

Create a new report table (Admin/Operator only).

**Request Body:**

```json
{
  "title": "Yeni cədvəl",
  "description": "Cədvəl təsviri",
  "columns": [
    {
      "key": "name",
      "label": "Ad",
      "type": "text",
      "required": true
    },
    {
      "key": "score",
      "label": "Bal",
      "type": "number",
      "min": 0,
      "max": 100
    },
    {
      "key": "date",
      "label": "Tarix",
      "type": "date"
    },
    {
      "key": "status",
      "label": "Status",
      "type": "select",
      "options": ["Aktiv", "Passiv"]
    },
    {
      "key": "total",
      "label": "Cəm",
      "type": "calculated",
      "formula": "=A1+B1",
      "format": "number",
      "decimals": 2
    }
  ],
  "max_rows": 50,
  "target_institutions": [1, 2, 3],
  "deadline": "2026-12-31"
}
```

**Column Types:**

| Type | Description | Additional Properties |
|------|-------------|----------------------|
| `text` | Text input | `min_length`, `max_length` |
| `number` | Numeric input | `min`, `max`, `decimals` |
| `date` | Date picker | - |
| `select` | Dropdown | `options` (array) |
| `boolean` | Checkbox | - |
| `calculated` | Formula-based | `formula`, `format`, `decimals` |
| `file` | File upload | `accepted_types`, `max_file_size` |
| `signature` | Digital signature | `signature_width`, `signature_height` |
| `gps` | GPS coordinates | `gps_precision`, `gps_radius` |

**Response:** `201 Created`

---

### Update Report Table

```http
PUT /api/report-tables/{id}
```

Update an existing table (only draft tables can be fully edited).

**Request Body:** Same as create (all fields optional)

**Response:** `200 OK`

---

### Delete Report Table

```http
DELETE /api/report-tables/{id}
```

Soft-delete a report table.

**Response:** `204 No Content`

---

### Publish Table

```http
POST /api/report-tables/{id}/publish
```

Publish a draft table to make it available for responses.

**Requirements:**
- Table must be in `draft` status
- Must have at least 1 column
- Must have at least 1 target institution

**Response:** `200 OK`

---

### Archive Table

```http
POST /api/report-tables/{id}/archive
```

Archive a published table (stops accepting new responses).

**Response:** `200 OK`

---

### Unarchive Table

```http
POST /api/report-tables/{id}/unarchive
```

Restore an archived table to published status.

**Response:** `200 OK`

---

## Response Management

### Get My Response

```http
GET /api/report-tables/{id}/my-response
```

Retrieve the current user's response for a table.

**Response:**

```json
{
  "data": {
    "id": 1,
    "report_table_id": 1,
    "institution_id": 1,
    "respondent_id": 1,
    "rows": [
      {
        "name": "John Doe",
        "score": 95,
        "date": "2026-03-01"
      }
    ],
    "status": "draft",
    "submitted_at": null,
    "row_statuses": {
      "0": {
        "status": "draft"
      }
    },
    "created_at": "2026-03-01T00:00:00Z",
    "updated_at": "2026-03-01T00:00:00Z"
  }
}
```

---

### Save Draft Response

```http
POST /api/report-tables/{id}/save-response
```

Save response as draft (can be edited later).

**Request Body:**

```json
{
  "rows": [
    {
      "name": "John Doe",
      "score": 95,
      "date": "2026-03-01"
    },
    {
      "name": "Jane Smith",
      "score": 87,
      "date": "2026-03-02"
    }
  ]
}
```

**Validation:**
- Row count must not exceed `max_rows`
- Required fields must be filled
- Data types must match column definitions

**Response:** `200 OK`

---

### Submit Response

```http
POST /api/report-tables/{id}/submit-response
```

Submit final response (locks for editing, awaits approval).

**Request Body:** Same as save-response

**Constraints:**
- Cannot submit after deadline
- All required fields must be filled
- Cannot edit after submission

**Response:** `200 OK`

---

### Get All Responses (Admin)

```http
GET /api/report-tables/{id}/responses
```

Retrieve all responses for a table (admin/operator only).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter: `draft`, `submitted`, `approved` |
| `institution_id` | integer | No | Filter by institution |
| `per_page` | integer | No | Items per page |
| `page` | integer | No | Page number |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "institution_id": 1,
      "institution": {
        "id": 1,
        "name": "Məktəb 1",
        "parent": {
          "id": 2,
          "name": "Sektor 1"
        }
      },
      "rows": [...],
      "status": "submitted",
      "submitted_at": "2026-03-01T12:00:00Z",
      "respondent": {
        "id": 1,
        "name": "User Name"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 10
  }
}
```

---

### Approve Response

```http
POST /api/report-tables/{id}/responses/{responseId}/approve
```

Approve a submitted response.

**Response:** `200 OK`

---

### Reject Response

```http
POST /api/report-tables/{id}/responses/{responseId}/reject
```

Reject a submitted response with reason.

**Request Body:**

```json
{
  "reason": "Incomplete data provided"
}
```

**Response:** `200 OK`

---

### Bulk Row Actions

```http
POST /api/report-tables/{id}/bulk-row-action
```

Perform bulk actions on specific rows across multiple responses.

**Request Body:**

```json
{
  "row_specs": [
    {
      "response_id": 1,
      "row_indices": [0, 1, 2]
    },
    {
      "response_id": 2,
      "row_indices": [0]
    }
  ],
  "action": "approve",
  "reason": "Batch approval"
}
```

**Actions:** `approve`, `reject`, `return`

**Response:**

```json
{
  "message": "Bulk action completed",
  "successful": 3,
  "failed": 1,
  "errors": [
    {
      "response_id": 2,
      "row_index": 0,
      "error": "Row already approved"
    }
  ]
}
```

---

## Templates

### Save as Template

```http
POST /api/report-tables/{id}/save-as-template
```

Save a table as a reusable template.

**Request Body:**

```json
{
  "category": "statistics"
}
```

**Response:** `200 OK`

---

### Clone from Template

```http
POST /api/report-tables/{id}/clone-from-template
```

Create a new table by cloning a template.

**Request Body:**

```json
{
  "title": "Yeni cədvəl (kopya)"
}
```

**Response:** `201 Created`

---

### Get Templates

```http
GET /api/report-table-templates
```

Retrieve available templates.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "title": "Statistika şablonu",
      "template_category": "statistics",
      "columns": [...],
      "cloned_from_id": null
    }
  ]
}
```

---

## Analytics & Export

### Get Table Analytics

```http
GET /api/report-tables/{id}/analytics
```

Retrieve analytics data for a table.

**Response:**

```json
{
  "data": {
    "submitted": 15,
    "draft": 5,
    "total_rows": 150,
    "institution_count": 20,
    "target_count": 25,
    "participation_rate": 80.0,
    "column_stats": [
      {
        "column": {
          "key": "score",
          "label": "Bal",
          "type": "number"
        },
        "count": 150,
        "sum": 12500,
        "avg": 83.33,
        "min": 45,
        "max": 100
      }
    ],
    "status_distribution": [
      { "label": "Göndərilib", "value": 15, "color": "#10b981" },
      { "label": "Qaralama", "value": 5, "color": "#6b7280" }
    ]
  }
}
```

---

### Export Responses

```http
GET /api/report-tables/{id}/export
```

Export table responses as Excel file.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | No | `xlsx` or `csv` (default: xlsx) |
| `status` | string | No | Filter by response status |

**Response:** Binary file download

---

## Error Responses

### 401 Unauthorized

```json
{
  "message": "Unauthorized",
  "error": "Token has expired"
}
```

### 403 Forbidden

```json
{
  "message": "Forbidden",
  "error": "Bu əməliyyat üçün icazəniz yoxdur"
}
```

### 422 Validation Error

```json
{
  "message": "Validation failed",
  "errors": {
    "title": ["Başlıq boş ola bilməz"],
    "columns": ["Ən azı bir sütun əlavə edilməlidir"]
  }
}
```

### 404 Not Found

```json
{
  "message": "Not found",
  "error": "Report table not found"
}
```

---

## Rate Limits

- **Authenticated:** 1000 requests per hour
- **Export endpoints:** 60 requests per hour

---

## Status Codes

| Status | Description |
|--------|-------------|
| `draft` | Table being created/edited |
| `published` | Available for responses |
| `archived` | Closed for new responses |
| `deleted` | Soft-deleted (recoverable) |

---

## Response Statuses

| Status | Description |
|--------|-------------|
| `draft` | Saved but not submitted |
| `submitted` | Submitted, awaiting approval |
| `approved` | Approved by admin |
| `rejected` | Rejected with reason |
