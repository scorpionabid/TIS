# US-4: Məktəb İdarəetmə Modulu

## Azərbaycan Təhsil İdarəetmə Sistemi (ATİS)

### Epic: Dərs Cədvəli İdarəetməsi

**US-SCHEDULE-001: Schedule Template Creation**
```
As a School Deputy (Müavin)
I want to create schedule templates for different classes
So that I can efficiently manage the school timetable

Acceptance Criteria:
✓ Define weekly schedule patterns with time slots
✓ Create different templates for different grade levels
✓ Configure number of lessons per subject based on curriculum
✓ Set break times between lessons
✓ Account for special classes (lab, gym)
✓ Define schedule periods (terms, semesters)
✓ Support multiple schedule versions for planning

API Endpoints:
GET /api/v1/schedules/templates
POST /api/v1/schedules/templates
GET /api/v1/schedules/templates/{id}
PUT /api/v1/schedules/templates/{id}
DELETE /api/v1/schedules/templates/{id}
GET /api/v1/schedules/time-slots
PUT /api/v1/schedules/time-slots
```

**US-SCHEDULE-002: Teacher Assignment and Workload**
```
As a School Deputy (Müavin)
I want to assign teachers to classes and track their workload
So that teaching resources are distributed efficiently

Acceptance Criteria:
✓ Assign teachers to specific subjects and classes
✓ Track teacher workload hours
✓ Identify scheduling conflicts (teacher double-booking)
✓ View teacher availability for specific time slots
✓ Set maximum and minimum teaching hours per teacher
✓ Generate teacher schedule exports
✓ Handle teacher preferences and constraints

API Endpoints:
GET /api/v1/teachers/workload
POST /api/v1/schedules/teacher-assignments
GET /api/v1/schedules/teacher-assignments/{teacherId}
PUT /api/v1/schedules/teacher-assignments/{id}
GET /api/v1/schedules/conflicts
GET /api/v1/teachers/{id}/availability
GET /api/v1/teachers/{id}/schedule/export
```

**US-SCHEDULE-003: Room and Resource Management**
```
As a School Deputy (Müavin)
I want to manage classroom and resource allocation
So that physical spaces and resources are used efficiently

Acceptance Criteria:
✓ Define available rooms and their capacities
✓ Specify special rooms (laboratories, gyms, etc.)
✓ Assign rooms for specific classes and subjects
✓ Identify room conflicts and double-bookings
✓ Track room utilization rates
✓ Schedule maintenance or unavailability periods
✓ Generate room utilization reports

API Endpoints:
GET /api/v1/rooms
POST /api/v1/rooms
GET /api/v1/rooms/{id}
PUT /api/v1/rooms/{id}
DELETE /api/v1/rooms/{id}
GET /api/v1/rooms/conflicts
GET /api/v1/rooms/utilization
POST /api/v1/rooms/{id}/maintenance
```

**US-SCHEDULE-004: Schedule Publication and Access**
```
As a RegionAdmin and SektorAdmin
I want to view and monitor school schedules
So that I can ensure all schools have functional timetables

Acceptance Criteria:
✓ Review and approve school schedules
✓ Access view-only schedules from all schools
✓ Generate reports on schedule compliance
✓ Compare schedules across different schools
✓ Monitor changes to published schedules
✓ View class and teacher load distribution
✓ Identify scheduling issues or anomalies

API Endpoints:
GET /api/v1/schedules/schools/{schoolId}
POST /api/v1/schedules/{id}/approve
GET /api/v1/schedules/compliance-report
GET /api/v1/schedules/comparison
GET /api/v1/schedules/{id}/change-history
GET /api/v1/schedules/load-distribution
GET /api/v1/schedules/issues
```

### Epic: Qiymətləndirmə və Akademik Məlumatlar

**US-ASSESS-001: Grade Entry and Management**
```
As a Teacher
I want to record student grades for different assessments
So that I can track academic progress and generate reports

Acceptance Criteria:
✓ Enter grades for different types of assessments (KSQ, BSQ, etc.)
✓ Record grades for individual students or bulk entry
✓ Support different grading scales as needed
✓ Add comments and feedback for specific grades
✓ View grade history for individual students
✓ Calculate average grades and class statistics
✓ Flag students with concerning grade patterns

API Endpoints:
GET /api/v1/grades/classes/{classId}
POST /api/v1/grades
GET /api/v1/grades/students/{studentId}
PUT /api/v1/grades/{id}
DELETE /api/v1/grades/{id}
GET /api/v1/grades/statistics/class/{classId}
GET /api/v1/grades/history/student/{studentId}
```

**US-ASSESS-002: Academic Report Generation**
```
As a School Administrator
I want to generate academic reports for classes and students
So that I can share progress information with stakeholders

Acceptance Criteria:
✓ Generate individual student performance reports
✓ Create class-level summary reports
✓ Export reports in different formats (PDF, Excel)
✓ Compare current term results with previous terms
✓ Include teacher comments and recommendations
✓ Support customized report templates
✓ Schedule automated report generation

API Endpoints:
GET /api/v1/reports/academic/student/{studentId}
GET /api/v1/reports/academic/class/{classId}
GET /api/v1/reports/academic/export/{reportId}
GET /api/v1/reports/academic/comparison/{classId}
POST /api/v1/reports/academic/comments
GET /api/v1/reports/academic/templates
POST /api/v1/reports/academic/schedule
```

**US-ASSESS-003: Assessment Analytics and Insights**
```
As a RegionAdmin or SektorAdmin
I want to analyze assessment data across schools
So that I can identify trends and make data-driven decisions

Acceptance Criteria:
✓ Compare assessment results across different schools
✓ Identify high-performing and struggling schools
✓ Analyze trend data over multiple years
✓ Generate performance benchmarks by subject
✓ View subject-specific analytics
✓ Create interactive dashboards with filters
✓ Export analytics for presentations

API Endpoints:
GET /api/v1/analytics/academic/schools-comparison
GET /api/v1/analytics/academic/performance-ranking
GET /api/v1/analytics/academic/trend-analysis
GET /api/v1/analytics/academic/benchmarks
GET /api/v1/analytics/academic/subjects/{subjectId}
GET /api/v1/analytics/academic/dashboard
GET /api/v1/analytics/academic/export
```

### Epic: Davamiyyət İdarəetməsi

**US-ATTEND-001: Daily Attendance Tracking**
```
As a Teacher
I want to record daily student attendance
So that absence patterns can be monitored and addressed

Acceptance Criteria:
✓ Record present/absent status for each student
✓ Mark different absence types (excused, unexcused)
✓ Record partial attendance (late arrivals, early departures)
✓ Enter reason for absence when available
✓ View attendance records for a class or specific student
✓ Enable bulk attendance entry for efficiency
✓ Support backdated attendance entry with justification

API Endpoints:
GET /api/v1/attendance/class/{classId}/date/{date}
POST /api/v1/attendance/record
POST /api/v1/attendance/bulk-record
GET /api/v1/attendance/student/{studentId}
PUT /api/v1/attendance/{id}
POST /api/v1/attendance/backdated
GET /api/v1/attendance/reasons
```

**US-ATTEND-002: Attendance Reporting and Analysis**
```
As a School Administrator
I want to analyze attendance patterns and generate reports
So that I can address attendance issues and improve student participation

Acceptance Criteria:
✓ Generate individual student attendance reports
✓ Create class and school attendance summaries
✓ Calculate attendance rate statistics
✓ Identify students with concerning attendance patterns
✓ Compare attendance across different classes
✓ Track attendance trends over time
✓ Export attendance data for reporting

API Endpoints:
GET /api/v1/attendance/reports/student/{studentId}
GET /api/v1/attendance/reports/class/{classId}
GET /api/v1/attendance/reports/school/{schoolId}
GET /api/v1/attendance/reports/statistics
GET /api/v1/attendance/reports/concerns
GET /api/v1/attendance/reports/comparison
GET /api/v1/attendance/reports/trends
```

**US-ATTEND-003: Regional Attendance Monitoring**
```
As a RegionAdmin or SektorAdmin
I want to monitor attendance rates across schools
So that I can identify and address systematic attendance issues

Acceptance Criteria:
✓ View attendance statistics across all schools
✓ Compare attendance rates between schools
✓ Identify schools with attendance challenges
✓ Track regional attendance trends over time
✓ Generate regional attendance reports
✓ Set attendance rate targets and monitor progress
✓ Receive alerts for significant attendance drops

API Endpoints:
GET /api/v1/attendance/region/{regionId}/statistics
GET /api/v1/attendance/comparison/schools
GET /api/v1/attendance/concerns/region/{regionId}
GET /api/v1/attendance/trends/region/{regionId}
GET /api/v1/attendance/reports/region/{regionId}
POST /api/v1/attendance/targets
GET /api/v1/attendance/alerts
```

### Epic: Resurs və İnventar İdarəetməsi

**US-RESOURCE-001: Inventory Management**
```
As a School Economic Affairs Manager (Təsərrüfat Müdiri)
I want to track school inventory and assets
So that resources are properly maintained and accounted for

Acceptance Criteria:
✓ Record and categorize all physical school assets
✓ Track asset condition and maintenance history
✓ Generate inventory reports by category or location
✓ Record asset assignments to staff or departments
✓ Process new asset acquisitions
✓ Handle asset retirement or disposal
✓ Support periodic inventory audits

API Endpoints:
GET /api/v1/inventory/assets
POST /api/v1/inventory/assets
GET /api/v1/inventory/assets/{id}
PUT /api/v1/inventory/assets/{id}
DELETE /api/v1/inventory/assets/{id}
GET /api/v1/inventory/reports
POST /api/v1/inventory/audit
```

**US-RESOURCE-002: Maintenance and Repair Tracking**
```
As a School Economic Affairs Manager
I want to track maintenance requests and repairs
So that school facilities remain in good working condition

Acceptance Criteria:
✓ Create maintenance requests with priority levels
✓ Assign maintenance tasks to responsible parties
✓ Track maintenance status and resolution
✓ Schedule recurring maintenance activities
✓ Document maintenance history for facilities
✓ Generate maintenance cost reports
✓ Upload before/after photos of repairs

API Endpoints:
GET /api/v1/maintenance/requests
POST /api/v1/maintenance/requests
GET /api/v1/maintenance/requests/{id}
PUT /api/v1/maintenance/requests/{id}
POST /api/v1/maintenance/requests/{id}/assign
GET /api/v1/maintenance/schedule
GET /api/v1/maintenance/history
```
