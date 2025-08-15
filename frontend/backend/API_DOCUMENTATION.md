# 🚀 ATİS Backend API Documentation

**Version**: v1.0  
**Base URL**: `/api`  
**Authentication**: Bearer Token (Laravel Sanctum)  
**Total Endpoints**: 435+ routes

## 📋 Table of Contents

1. [Authentication & Session Management](#authentication--session-management)
2. [User Management](#user-management)
3. [Institution & Hierarchy Management](#institution--hierarchy-management)
4. [Survey & Response Management](#survey--response-management)
5. [Task Management](#task-management)
6. [Document Management](#document-management)
7. [Notification Management](#notification-management)
8. [Academic Management](#academic-management)
9. [Psychology Support](#psychology-support)
10. [Teacher Performance](#teacher-performance)
11. [Inventory Management](#inventory-management)
12. [Regional Administration](#regional-administration)
13. [Analytics & Reporting](#analytics--reporting)

---

## 🔐 Authentication & Session Management

### Authentication Endpoints

#### **POST** `/api/auth/login`
User authentication with credentials

**Request Body:**
```json
{
  "email": "admin@edu.az",
  "password": "admin123",
  "remember": true,
  "device_name": "Desktop Chrome"
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@edu.az",
      "role": "SuperAdmin",
      "institution": {
        "id": 1,
        "name": "Bakı Şəhər Təhsil İdarəsi"
      }
    },
    "token": "1|abc123...",
    "expires_at": "2024-08-06T12:00:00Z"
  }
}
```

#### **POST** `/api/auth/logout`
Logout and revoke current token

#### **POST** `/api/auth/logout-all`
Logout from all devices

#### **GET** `/api/auth/me`
Get current authenticated user information

### Session Management

#### **GET** `/api/auth/sessions`
List active sessions for current user

#### **DELETE** `/api/auth/sessions/{session}`
Revoke specific session

#### **POST** `/api/auth/refresh`
Refresh authentication token

### Device Management

#### **GET** `/api/auth/devices`
List user's registered devices

#### **POST** `/api/auth/devices/register`
Register new device

#### **DELETE** `/api/auth/devices/{device}`
Unregister device

### Password Management

#### **POST** `/api/auth/password/reset`
Reset password

#### **POST** `/api/auth/password/change`
Change current password

---

## 👥 User Management

### Core User Operations

#### **GET** `/api/users`
List users with filtering and pagination

**Query Parameters:**
- `role` - Filter by role name
- `institution_id` - Filter by institution
- `status` - active/inactive
- `search` - Search by name/email
- `page` - Page number
- `per_page` - Items per page (max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "username": "john.teacher",
      "email": "john@school.edu.az",
      "role": {
        "id": 5,
        "name": "Müəllim",
        "display_name": "Müəllim"
      },
      "institution": {
        "id": 3,
        "name": "1 nömrəli məktəb",
        "type": "school"
      },
      "department": {
        "id": 10,
        "name": "Riyaziyyat departamenti"
      },
      "is_active": true,
      "last_login_at": "2024-08-05T10:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1247
  }
}
```

#### **POST** `/api/users`
Create new user

**Request Body:**
```json
{
  "username": "new.teacher",
  "email": "new.teacher@school.edu.az",
  "password": "SecurePass123",
  "role_id": 5,
  "institution_id": 3,
  "department_id": 10,
  "first_name": "Əli",
  "last_name": "Məmmədov",
  "phone": "+994501234567"
}
```

**Required Permissions:** `users.create`

#### **GET** `/api/users/{id}`
Get specific user details

#### **PUT** `/api/users/{id}`
Update user information

#### **DELETE** `/api/users/{id}`
Soft delete user

**Required Permissions:** `users.delete`

### Bulk Operations

#### **POST** `/api/users/bulk/create`
Bulk create users from CSV

#### **PUT** `/api/users/bulk/update`
Bulk update multiple users

#### **POST** `/api/users/bulk/export`
Export users data

### User Preferences

#### **GET** `/api/preferences`
Get current user preferences

#### **PUT** `/api/preferences`
Update user preferences

#### **POST** `/api/preferences/reset`
Reset preferences to default

#### **PUT** `/api/preferences/theme`
Update UI theme preference

#### **PUT** `/api/preferences/language`
Change language preference

#### **PUT** `/api/preferences/layout`
Update layout preferences

#### **GET** `/api/preferences/ui-settings`
Get UI-specific settings

---

## 🏢 Institution & Hierarchy Management

### Institution Operations

#### **GET** `/api/institutions`
List institutions in hierarchy

**Query Parameters:**
- `type` - ministry/regional_office/sector/school
- `parent_id` - Filter by parent institution
- `level` - Hierarchy level (1-4)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Təhsil Nazirliyi",
      "type": "ministry",
      "level": 1,
      "parent_id": null,
      "children_count": 4,
      "users_count": 15,
      "metadata": {
        "contact_person": "Nazir müavini",
        "phone": "+994125551234"
      }
    }
  ]
}
```

#### **POST** `/api/institutions`
Create new institution

#### **GET** `/api/institutions/{id}`
Get institution details with relationships

#### **PUT** `/api/institutions/{id}`
Update institution

#### **DELETE** `/api/institutions/{id}`
Delete institution

### Hierarchy Management

#### **GET** `/api/institutions/hierarchy`
Get complete institutional hierarchy tree

#### **GET** `/api/institutions/{id}/children`
Get child institutions

#### **GET** `/api/institutions/{id}/path`
Get institution path to root

#### **POST** `/api/institutions/{id}/move`
Move institution in hierarchy

### Department Management

#### **GET** `/api/departments`
List departments

#### **POST** `/api/departments`
Create department

#### **GET** `/api/departments/{id}`
Get department details

#### **PUT** `/api/departments/{id}`
Update department

#### **DELETE** `/api/departments/{id}`
Delete department

---

## 📊 Survey & Response Management

### Survey Operations

#### **GET** `/api/surveys`
List surveys with filtering

**Query Parameters:**
- `status` - draft/active/completed/archived
- `creator_id` - Filter by creator
- `target_role` - Filter by target role
- `category` - Survey category

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Məktəb İqlimi Sorğusu",
      "description": "Məktəb mühitinin qiymətləndirilməsi",
      "status": "active",
      "category": "school_climate",
      "start_date": "2024-08-01T00:00:00Z",
      "end_date": "2024-08-31T23:59:59Z",
      "target_roles": ["Müəllim", "Şagird"],
      "questions_count": 25,
      "responses_count": 145,
      "target_count": 200,
      "completion_rate": 72.5,
      "creator": {
        "id": 2,
        "username": "survey.admin"
      }
    }
  ]
}
```

#### **POST** `/api/surveys`
Create new survey

**Request Body:**
```json
{
  "title": "Yeni Sorğu",
  "description": "Sorğu təsviri",
  "category": "educational_quality",
  "start_date": "2024-08-10T00:00:00Z",
  "end_date": "2024-08-24T23:59:59Z",
  "questions": [
    {
      "text": "Məktəb mühiti necədir?",
      "type": "multiple_choice",
      "required": true,
      "options": ["Çox yaxşı", "Yaxşı", "Orta", "Pis"],
      "metadata": {
        "category": "environment"
      }
    }
  ],
  "targeting": {
    "target_roles": ["Müəllim"],
    "target_institutions": [3, 4, 5],
    "target_departments": [10, 11]
  }
}
```

**Required Permissions:** `surveys.create`

#### **GET** `/api/surveys/{id}`
Get survey details with questions

#### **PUT** `/api/surveys/{id}`
Update survey

#### **DELETE** `/api/surveys/{id}`
Delete survey

#### **POST** `/api/surveys/{id}/activate`
Activate survey

#### **POST** `/api/surveys/{id}/archive`
Archive survey

### Survey Responses

#### **GET** `/api/surveys/{id}/responses`
Get survey responses

#### **POST** `/api/surveys/{id}/respond`
Submit survey response

**Request Body:**
```json
{
  "responses": [
    {
      "question_id": 1,
      "answer": "Yaxşı"
    },
    {
      "question_id": 2,
      "answer": ["Seçim 1", "Seçim 2"]
    }
  ]
}
```

#### **GET** `/api/surveys/{id}/analytics`
Get survey analytics and statistics

#### **POST** `/api/surveys/{id}/export`
Export survey responses

### Survey Targeting

#### **GET** `/api/surveys/{id}/targeting`
Get survey targeting information

#### **PUT** `/api/surveys/{id}/targeting`
Update survey targeting

#### **POST** `/api/surveys/{id}/notify-targets`
Send notifications to target audience

---

## 📝 Task Management

### Task Operations

#### **GET** `/api/tasks`
List tasks with filtering

**Query Parameters:**
- `status` - pending/in_progress/completed/cancelled
- `priority` - low/medium/high/urgent
- `assignee_id` - Filter by assignee
- `creator_id` - Filter by creator
- `category` - Task category
- `due_date_from` / `due_date_to` - Date range

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Aylıq hesabat hazırla",
      "description": "Avqust ayı üçün akademik hesabat",
      "priority": "high",
      "status": "in_progress",
      "category": "reporting",
      "due_date": "2024-08-10T17:00:00Z",
      "estimated_hours": 8,
      "creator": {
        "id": 2,
        "username": "admin"
      },
      "assignees": [
        {
          "id": 5,
          "username": "teacher1",
          "assignment_status": "in_progress",
          "progress_note": "50% tamamlandı"
        }
      ],
      "comments_count": 3,
      "progress_logs_count": 5
    }
  ]
}
```

#### **POST** `/api/tasks`
Create new task

**Request Body:**
```json
{
  "title": "Yeni tapşırıq",
  "description": "Tapşırıq təsviri",
  "priority": "medium",
  "category": "administrative",
  "due_date": "2024-08-15T17:00:00Z",
  "estimated_hours": 4,
  "assignee_ids": [5, 6, 7],
  "requires_approval": false,
  "tags": ["monthly", "report"]
}
```

**Required Permissions:** `tasks.create`

#### **GET** `/api/tasks/{id}`
Get task details with relationships

#### **PUT** `/api/tasks/{id}`
Update task

#### **DELETE** `/api/tasks/{id}`
Delete task

#### **PUT** `/api/tasks/{id}/status`
Update task status

**Request Body:**
```json
{
  "status": "completed",
  "progress_note": "Tapşırıq uğurla tamamlandı"
}
```

### Task Comments & Progress

#### **GET** `/api/tasks/{id}/comments`
Get task comments

#### **POST** `/api/tasks/{id}/comments`
Add comment to task

#### **GET** `/api/tasks/{id}/progress`
Get task progress history

### My Tasks

#### **GET** `/api/tasks/my-tasks`
Get tasks assigned to current user

#### **GET** `/api/tasks/created-by-me`
Get tasks created by current user

### Bulk Operations

#### **POST** `/api/tasks/bulk/assign`
Bulk assign tasks

#### **PUT** `/api/tasks/bulk/status`
Bulk update task status

### Task Statistics

#### **GET** `/api/tasks/statistics`
Get task statistics

**Response:**
```json
{
  "data": {
    "total_tasks": 156,
    "completed_tasks": 89,
    "in_progress_tasks": 45,
    "pending_tasks": 22,
    "overdue_tasks": 8,
    "completion_rate": 57.1,
    "average_completion_time": 3.2,
    "priority_distribution": {
      "high": 23,
      "medium": 78,
      "low": 45,
      "urgent": 10
    }
  }
}
```

---

## 📄 Document Management

### Document Operations

#### **GET** `/api/documents`
List documents with filtering

**Query Parameters:**
- `category` - Document category
- `type` - file type filter
- `shared_with_me` - Show shared documents
- `my_documents` - Show owned documents
- `access_level` - public/private/restricted

#### **POST** `/api/documents`
Upload new document

**Request:** `multipart/form-data`
```
file: document.pdf
title: "Həftəlik hesabat"
description: "7 avqust həftəsi hesabatı"
category: "reports"
access_level: "private"
tags: ["weekly", "report", "august"]
```

**Required Permissions:** `documents.create`

#### **GET** `/api/documents/{id}`
Get document details

#### **GET** `/api/documents/{id}/download`
Download document file

#### **PUT** `/api/documents/{id}`
Update document metadata

#### **DELETE** `/api/documents/{id}`
Delete document

### Document Sharing

#### **POST** `/api/documents/{id}/share`
Share document with users/roles

**Request Body:**
```json
{
  "share_with_users": [5, 6, 7],
  "share_with_roles": ["Müəllim"],
  "share_with_institutions": [3, 4],
  "access_level": "read",
  "expires_at": "2024-08-31T23:59:59Z",
  "message": "Müəllim hesabatı"
}
```

#### **GET** `/api/documents/{id}/shares`
Get document sharing information

#### **DELETE** `/api/documents/{id}/shares/{shareId}`
Revoke document sharing

### Document Analytics

#### **GET** `/api/documents/analytics`
Get document usage analytics

#### **POST** `/api/documents/bulk/export`
Bulk export documents

---

## 🔔 Notification Management

### Notification Operations

#### **GET** `/api/notifications`
List user notifications

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Yeni tapşırıq təyin edildi",
      "message": "Sizə yeni tapşırıq təyin edildi: Aylıq hesabat",
      "type": "task_assignment",
      "priority": "medium",
      "is_read": false,
      "sender": {
        "id": 2,
        "name": "Admin İstifadəçi"
      },
      "created_at": "2024-08-05T14:30:00Z",
      "read_at": null
    }
  ]
}
```

#### **GET** `/api/notifications/unread`
Get unread notifications

#### **PUT** `/api/notifications/{id}/read`
Mark notification as read

#### **PUT** `/api/notifications/mark-all-read`
Mark all notifications as read

#### **DELETE** `/api/notifications/{id}`
Delete notification

### Sending Notifications

#### **POST** `/api/notifications/send`
Send notification to specific users

**Request Body:**
```json
{
  "title": "Toplantı xatırlatması",
  "message": "Sabah saat 14:00-da müəllim toplantısı",
  "type": "meeting",
  "priority": "high",
  "recipient_ids": [5, 6, 7],
  "scheduled_at": "2024-08-06T08:00:00Z",
  "expires_at": "2024-08-07T14:00:00Z"
}
```

**Required Permissions:** `notifications.send`

#### **POST** `/api/notifications/bulk-send`
Send bulk notifications by role/institution

**Request Body:**
```json
{
  "title": "Sistem baxımı",
  "message": "Sistem bazar günü 2 saat ərzində baxım altında olacaq",
  "type": "system",
  "priority": "medium",
  "target_roles": ["Müəllim", "SchoolAdmin"],
  "target_institutions": [3, 4, 5]
}
```

### Notification Templates

#### **GET** `/api/notifications/templates`
List notification templates

#### **POST** `/api/notifications/templates`
Create notification template

#### **POST** `/api/notifications/send-from-template`
Send notification using template

### Notification Statistics

#### **GET** `/api/notifications/statistics`
Get notification statistics

---

## 🎓 Academic Management

### Class & Student Management

#### **GET** `/api/classes`
List classes

#### **POST** `/api/classes`
Create new class

#### **GET** `/api/classes/{id}/students`
Get students in class

#### **POST** `/api/classes/{id}/attendance`
Record class attendance

### Grade Management

#### **GET** `/api/grades`
List grades with filtering

**Query Parameters:**
- `student_id` - Specific student
- `class_id` - Specific class  
- `subject_id` - Specific subject
- `term` - Academic term
- `grade_type` - exam/quiz/homework/project

#### **POST** `/api/grades`
Create grade entry

**Request Body:**
```json
{
  "student_id": 15,
  "subject_id": 3,
  "class_id": 10,
  "grade_value": 85,
  "max_grade": 100,
  "grade_type": "exam",
  "term": 1,
  "assessment_date": "2024-08-05",
  "description": "Rüb yekun imtahanı"
}
```

**Required Permissions:** `grades.create`

#### **PUT** `/api/grades/{id}`
Update grade

#### **DELETE** `/api/grades/{id}`
Delete grade

### Schedule Management

#### **GET** `/api/schedules`
Get class schedules

#### **POST** `/api/schedules`
Create schedule entry

#### **GET** `/api/schedules/teacher/{teacherId}`
Get teacher's schedule

#### **GET** `/api/schedules/class/{classId}`
Get class schedule

### Room Management

#### **GET** `/api/rooms`
List rooms

#### **POST** `/api/rooms`
Create room

#### **GET** `/api/rooms/availability`
Check room availability

**Query Parameters:**
- `date` - Check date
- `time_start` - Start time
- `time_end` - End time

### School Events

#### **GET** `/api/events`
List school events

#### **POST** `/api/events`
Create event (UBR role required)

**Request Body:**
```json
{
  "title": "Elm yarışması",
  "description": "Məktəblərarası elm yarışması",
  "event_type": "academic",
  "start_date": "2024-08-15T09:00:00Z",
  "end_date": "2024-08-15T16:00:00Z",
  "location": "Məktəb aula",
  "max_participants": 100,
  "registration_required": true,
  "target_audience": ["students", "teachers"]
}
```

**Required Role:** `UBR`

---

## 🧠 Psychology Support

### Psychology Sessions

#### **GET** `/api/psychology/sessions`
List psychology sessions (Psixoloq role)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "student_name": "Əli Məmmədov",
      "student_class": "10-A",
      "session_date": "2024-08-05T14:00:00Z",
      "session_type": "individual",  
      "duration_minutes": 45,
      "status": "completed",
      "reason": "Academic stress support",
      "psychologist": {
        "id": 8,
        "name": "Dr. Günel Hüseynova"
      }
    }
  ]
}
```

#### **POST** `/api/psychology/sessions`
Create psychology session

**Required Role:** `Psixoloq`

#### **GET** `/api/psychology/sessions/{id}`
Get session details

#### **PUT** `/api/psychology/sessions/{id}`
Update session

### Psychology Assessments

#### **POST** `/api/psychology/sessions/{id}/assessments`
Create assessment for session

#### **GET** `/api/psychology/assessments`
List assessments

### Psychology Statistics

#### **GET** `/api/psychology/statistics`
Get psychology support statistics

---

## 📈 Teacher Performance

### Performance Evaluations

#### **GET** `/api/teacher-performance/evaluations`
List teacher evaluations

#### **POST** `/api/teacher-performance/evaluations`
Create teacher evaluation

**Request Body:**
```json
{
  "teacher_id": 15,
  "evaluation_period": "2024-Q1",
  "teaching_quality": 85,
  "student_engagement": 90,
  "professional_development": 80,
  "collaboration": 88,
  "innovation": 82,
  "strengths": ["Excellent classroom management", "Student rapport"],
  "areas_for_improvement": ["Technology integration"],
  "goals": ["Implement more interactive teaching methods"]
}
```

**Required Permissions:** `teacher_performance.create`

#### **GET** `/api/teacher-performance/evaluations/{id}`
Get evaluation details

#### **PUT** `/api/teacher-performance/evaluations/{id}`
Update evaluation

### Performance Analytics

#### **GET** `/api/teacher-performance/dashboard`
Get performance dashboard data

#### **GET** `/api/teacher-performance/teacher/{id}/metrics`
Get specific teacher metrics

#### **POST** `/api/teacher-performance/reports/generate`
Generate performance report

### Professional Development

#### **POST** `/api/teacher-performance/professional-development`
Record professional development activity

**Request Body:**
```json
{
  "teacher_id": 15,
  "activity_type": "workshop",
  "title": "Digital Teaching Methods",
  "provider": "EDU Institute",
  "start_date": "2024-08-10",
  "end_date": "2024-08-12",
  "hours": 20,
  "certificate_earned": true,
  "skills_gained": ["Digital tools", "Online assessment"]
}
```

---

## 📦 Inventory Management

### Inventory Items

#### **GET** `/api/inventory`
List inventory items

**Query Parameters:**
- `category` - electronics/furniture/books/supplies
- `status` - available/in_use/maintenance/damaged
- `condition` - new/excellent/good/fair/poor
- `assigned_to` - Filter by assigned user
- `location` - Filter by location
- `low_stock` - Show low stock items

#### **POST** `/api/inventory`
Create inventory item

#### **GET** `/api/inventory/{id}`
Get item details

#### **PUT** `/api/inventory/{id}`
Update item

#### **DELETE** `/api/inventory/{id}`
Delete item

### Inventory Transactions

#### **POST** `/api/inventory/transactions/{item}/assign`
Assign item to user

#### **POST** `/api/inventory/transactions/{item}/return`
Return assigned item

#### **POST** `/api/inventory/transactions/{item}/transfer`
Transfer item between locations

#### **GET** `/api/inventory/transactions/{item}/history`
Get transaction history

### Inventory Maintenance

#### **POST** `/api/inventory/maintenance/{item}/schedule`
Schedule maintenance

#### **GET** `/api/inventory/maintenance/records`
List maintenance records

#### **POST** `/api/inventory/maintenance/{id}/complete`
Complete maintenance task

### Inventory Analytics

#### **GET** `/api/inventory/analytics/statistics`
Get inventory statistics

#### **GET** `/api/inventory/analytics/valuation`
Get inventory valuation report

---

## 🌍 Regional Administration

### RegionAdmin Dashboards

#### **GET** `/api/region-admin/dashboard`
Get regional admin dashboard

#### **GET** `/api/region-admin/institutions`
List institutions in region

#### **GET** `/api/region-admin/users`
List users in region

#### **GET** `/api/region-admin/surveys`
List surveys in region

#### **GET** `/api/region-admin/reports`
Get regional reports

### SektorAdmin Operations

#### **GET** `/api/sektor-admin/dashboard`
Get sector admin dashboard

### MektebAdmin Operations

#### **GET** `/api/mekteb-admin/dashboard`
Get school admin dashboard

---

## 📊 Analytics & Reporting

### Dashboard Analytics

#### **GET** `/api/analytics/dashboard`
Get main dashboard analytics

#### **GET** `/api/analytics/institution/{id}/overview`
Get institution overview

### Custom Reports

#### **POST** `/api/analytics/reports/generate`
Generate custom report

#### **GET** `/api/analytics/reports/{id}`
Get generated report

#### **POST** `/api/analytics/reports/{id}/export`
Export report

### System Statistics

#### **GET** `/api/analytics/system-stats`
Get system-wide statistics

#### **GET** `/api/analytics/usage-metrics`
Get usage metrics

---

## 🔒 Authentication & Permissions

### Required Headers
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### Permission Levels
- `*.read` - View operations
- `*.create` - Create operations  
- `*.update` - Update operations
- `*.delete` - Delete operations
- `*.manage` - Full management access

### Role-Based Access
- **SuperAdmin**: All permissions system-wide
- **RegionAdmin**: Full access within assigned region
- **SektorAdmin**: Full access within assigned sector  
- **SchoolAdmin**: Full access within assigned school
- **Müəllim**: Limited access for teaching operations
- **UBR**: Event management and specific UBR functions
- **Psixoloq**: Psychology support operations

### Regional Data Isolation
All data queries are automatically filtered by user's institutional hierarchy to ensure data isolation between regions/sectors/schools.

---

## 📋 HTTP Status Codes

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

## 🔄 Standard Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2024-08-05T12:00:00Z",
    "version": "v1.0"
  }
}
```

### Error Response  
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Email field is required"],
    "password": ["Password must be at least 8 characters"]
  },
  "meta": {
    "error_code": "VALIDATION_FAILED",
    "timestamp": "2024-08-05T12:00:00Z"
  }
}
```

### Pagination Format
```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 150,
    "last_page": 8,
    "from": 1,
    "to": 20
  },
  "links": {
    "first": "/api/users?page=1",
    "last": "/api/users?page=8", 
    "next": "/api/users?page=2",
    "prev": null
  }
}
```

---

## 🚀 Rate Limiting

- **Authentication**: 60 requests/minute
- **Standard operations**: 300 requests/hour
- **Bulk operations**: 10 requests/hour
- **File uploads**: 30 requests/hour
- **Analytics queries**: 100 requests/hour
- **Export operations**: 5 requests/hour

Rate limiting headers included in responses:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time (Unix timestamp)

---

**This documentation covers the complete ATİS Backend API with 435+ endpoints across all major functional areas. The API is designed for scalability, security, and ease of integration with the React frontend.**