# US-2: Əsas İdarəetmə Sistemi

## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### Epic: İerarxik Struktur İdarəetməsi

**US-HIERARCHY-001: Regional Structure Management**
```
As a SuperAdmin
I want to manage the regional education structure
So that the system accurately reflects our organizational hierarchy

Acceptance Criteria:
✓ Create, update and manage regional educational departments
✓ Define regional boundaries and jurisdictions
✓ Assign RegionAdmin to each regional structure
✓ Configure department types within regions (Maliyyə, İnzibati, Təsərrüfat)
✓ View regional hierarchy and relationships
✓ Generate regional organization charts
✓ Track historical changes to regional structures

API Endpoints:
GET /api/v1/regions
POST /api/v1/regions
GET /api/v1/regions/{id}
PUT /api/v1/regions/{id}
DELETE /api/v1/regions/{id}
GET /api/v1/regions/{id}/departments
POST /api/v1/regions/{id}/departments
GET /api/v1/regions/organizational-chart
```

**US-HIERARCHY-002: Sector Management**
```
As a RegionAdmin
I want to manage the sectors within my region
So that I can organize educational institutions effectively

Acceptance Criteria:
✓ Create and manage sectors within the region
✓ Assign SektorAdmin to each sector
✓ Track sector performance metrics
✓ Configure sector-specific settings and policies
✓ View sector coverage and boundaries
✓ Generate sector performance reports
✓ Manage relationships between sectors

API Endpoints:
GET /api/v1/regions/{regionId}/sectors
POST /api/v1/regions/{regionId}/sectors
GET /api/v1/sectors/{id}
PUT /api/v1/sectors/{id}
DELETE /api/v1/sectors/{id}
GET /api/v1/sectors/{id}/institutions
GET /api/v1/sectors/{id}/performance
```

**US-HIERARCHY-003: Institution Management**
```
As a SektorAdmin
I want to manage educational institutions in my sector
So that all schools and educational facilities are properly represented

Acceptance Criteria:
✓ Add new educational institutions with detailed information
✓ Categorize institutions (məktəb, məktəbəqədər, etc.)
✓ Assign SchoolAdmin to each institution
✓ Track institution status and key metrics
✓ Manage institution details (address, contact information, capacity)
✓ Configure institution-specific settings
✓ Generate institution reports

API Endpoints:
GET /api/v1/sectors/{sectorId}/institutions
POST /api/v1/sectors/{sectorId}/institutions
GET /api/v1/institutions/{id}
PUT /api/v1/institutions/{id}
DELETE /api/v1/institutions/{id}
GET /api/v1/institutions/{id}/staff
GET /api/v1/institutions/{id}/metrics
```

### Epic: Task və İş Prosesi İdarəetməsi

**US-TASK-001: Task Creation and Assignment**
```
As a RegionAdmin or SektorAdmin
I want to create tasks and assign them to subordinate institutions or staff
So that work is properly delegated and tracked

Acceptance Criteria:
✓ Create tasks with detailed descriptions and requirements
✓ Assign tasks to specific institutions, departments, or roles
✓ Set priority levels and deadlines
✓ Track task progress and completion status
✓ Receive notifications on task status changes
✓ Generate task reports and performance metrics
✓ Support file attachments to tasks

API Endpoints:
GET /api/v1/tasks
POST /api/v1/tasks
GET /api/v1/tasks/{id}
PUT /api/v1/tasks/{id}
DELETE /api/v1/tasks/{id}
GET /api/v1/tasks/assigned
GET /api/v1/tasks/created
POST /api/v1/tasks/{id}/attachments
```

**US-TASK-002: Task Response and Workflow**
```
As a SchoolAdmin
I want to manage tasks assigned to my institution
So that I can respond to regional requirements efficiently

Acceptance Criteria:
✓ View all tasks assigned to my institution
✓ Delegate tasks to appropriate staff members
✓ Update task progress and status
✓ Submit task responses with required information
✓ Attach supporting documents to task responses
✓ Request clarification or extensions on tasks
✓ Track historical task performance

API Endpoints:
GET /api/v1/tasks/institution/{institutionId}
PUT /api/v1/tasks/{id}/progress
POST /api/v1/tasks/{id}/responses
GET /api/v1/tasks/{id}/history
POST /api/v1/tasks/{id}/extension-request
GET /api/v1/tasks/performance/institution/{institutionId}
```

**US-TASK-003: Regional Task Oversight**
```
As a RegionAdmin
I want to monitor task progress across all sectors and institutions
So that I can ensure timely completion of important initiatives

Acceptance Criteria:
✓ Dashboard showing task completion rates by sector
✓ Identify overdue tasks and bottlenecks
✓ Filter tasks by priority, status, or type
✓ Batch update or extend multiple tasks
✓ Generate task performance reports by sector or institution
✓ View task audit trail and history
✓ Send reminders for approaching deadlines

API Endpoints:
GET /api/v1/dashboard/region/{regionId}/tasks
GET /api/v1/tasks/overdue
GET /api/v1/tasks/analytics/completion-rate
GET /api/v1/tasks/performance/sector/{sectorId}
POST /api/v1/tasks/batch-update
POST /api/v1/tasks/reminders/send
```

### Epic: Sənəd və Fayl İdarəetməsi

**US-DOC-001: Document Repository Management**
```
As a RegionAdmin or SektorAdmin
I want to manage a centralized document repository
So that important files can be organized and shared appropriately

Acceptance Criteria:
✓ Upload and organize documents in folder structures
✓ Set access permissions by role, region, sector, or institution
✓ Support version control for important documents
✓ Allow document categorization and tagging
✓ Enable document search by metadata and content
✓ Track document views and downloads
✓ Support document expiration and archiving

API Endpoints:
GET /api/v1/documents
POST /api/v1/documents
GET /api/v1/documents/{id}
PUT /api/v1/documents/{id}
DELETE /api/v1/documents/{id}
GET /api/v1/documents/folders
POST /api/v1/documents/folders
GET /api/v1/documents/search
```

**US-DOC-002: Document Sharing and Distribution**
```
As a user with document management permissions
I want to share documents with specific institutions or users
So that information is distributed securely and efficiently

Acceptance Criteria:
✓ Share documents with specific roles or individuals
✓ Generate time-limited sharing links
✓ Set view-only or edit permissions on shared documents
✓ Track who has accessed shared documents
✓ Notify recipients when documents are shared
✓ Revoke access to shared documents
✓ Bulk share documents to multiple recipients

API Endpoints:
POST /api/v1/documents/{id}/share
GET /api/v1/documents/shared-with-me
POST /api/v1/documents/share/bulk
DELETE /api/v1/documents/shares/{shareId}
GET /api/v1/documents/{id}/access-log
POST /api/v1/documents/temporary-links
```

**US-DOC-003: Template Management**
```
As a RegionAdmin
I want to create and manage document templates
So that institutions can use standardized formats

Acceptance Criteria:
✓ Create document templates for common use cases
✓ Categorize templates by purpose and department
✓ Allow template versioning and updates
✓ Track template usage across the system
✓ Support template fields for auto-population
✓ Enable template distribution to specific sectors
✓ Allow sector customization within constraints

API Endpoints:
GET /api/v1/templates
POST /api/v1/templates
GET /api/v1/templates/{id}
PUT /api/v1/templates/{id}
DELETE /api/v1/templates/{id}
GET /api/v1/templates/categories
GET /api/v1/templates/usage-statistics
```
