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

