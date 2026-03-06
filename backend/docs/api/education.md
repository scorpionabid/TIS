## 🎓 Educational & Academic Management

> `routes/api/educational.php` faylındakı bütün marşrutlar `auth:sanctum` altında işləyir və əsasən `attendance.*`, `schedules.*`, `students.*`, `grades.*`, `rooms.*`, `events.*`, `assessments.*` icazələrini və bəzən rol məhdudiyyətlərini tələb edir.

### Dərs davamiyyəti

| Method | Route | Permission | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/class-attendance` | `attendance.read` | Legacy davamiyyət siyahısı |
| POST | `/api/class-attendance` | `attendance.write` | Legacy qeydiyyat |
| GET | `/api/class-attendance/{attendance}` | `attendance.read` | Legacy detal |
| PUT | `/api/class-attendance/{attendance}` | `attendance.write` | Legacy yeniləmə |
| GET | `/api/attendance-records` | `attendance.read` | Yeni AttendanceRecord API |
| POST | `/api/attendance-records` | `attendance.write` | Yeni qeyd |
| GET | `/api/attendance-records/{record}` | `attendance.read` | Detal |
| PUT | `/api/attendance-records/{record}` | `attendance.write` | Yeniləmə |
| DELETE | `/api/attendance-records/{record}` | `attendance.write` | Silmə |
| POST | `/api/attendance-records/bulk` | `attendance.bulk` | Kütləvi əlavə |
| GET | `/api/attendance-records/statistics/class` | `attendance.read` | Sinif statistikası |

### Tədris yükü (Teaching Loads)

| Method | Route | Role | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/teaching-loads` | `superadmin|regionadmin|sektoradmin|schooladmin` | Tədris yükü siyahısı |
| POST | `/api/teaching-loads` | eyni | Yüklərin yaradılması |
| GET | `/api/teaching-loads/statistics` | eyni | Analitika |
| GET | `/api/teaching-loads/teacher/{teacher}` | eyni | Müəllimə görə |
| GET | `/api/teaching-loads/institution/{institution}` | eyni | Qurum üzrə |
| POST | `/api/teaching-loads/bulk-assign` | eyni | Kütləvi təyinat |
| GET | `/api/teaching-loads/{load}` | eyni | Detal |
| PUT | `/api/teaching-loads/{load}` | eyni | Yeniləmə |
| DELETE | `/api/teaching-loads/{load}` | eyni | Silmə |

### Cədvəl (Schedule) idarəetməsi

| Method | Route | Permission | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/schedules` | `schedules.read` | Ümumi cədvəl siyahısı |
| GET | `/api/schedules/dashboard` | `schedules.read` | Dashboard göstəriciləri |
| POST | `/api/schedules/generate` | `schedules.write` | Avtomatik generasiya |
| POST | `/api/schedules/generate/preview` | `schedules.write` | Preview |
| GET | `/api/schedules/teacher/{teacher}` | `schedules.read` | Müəllim cədvəli |
| GET | `/api/schedules/class/{class}` | `schedules.read` | Sinif cədvəli |
| POST | `/api/schedules/bulk-create` | `schedules.bulk` | Kütləvi yaradılma |
| POST | `/api/schedules/templates` | `schedules.write` | Şablon saxlanması |
| POST | `/api/schedules/conflicts/check` | `schedules.read` | Ziddiyyət yoxlaması |
| POST | `/api/schedules` | `schedules.write` | Manual cədvəl |
| GET | `/api/schedules/{schedule}` | `schedules.read` | Detal |
| PUT | `/api/schedules/{schedule}` | `schedules.write` | Yeniləmə |
| DELETE | `/api/schedules/{schedule}` | `schedules.write` | Silmə |

### Otaqlar (`RoomController`)

| Method | Route | Permission | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/rooms` | `rooms.read` | Otaq siyahısı |
| POST | `/api/rooms` | `rooms.write` | Yeni otaq |
| GET | `/api/rooms/availability` | `rooms.read` | Mövcudluq yoxlaması |
| GET | `/api/rooms/{room}` | `rooms.read` | Otaq detalı |
| PUT | `/api/rooms/{room}` | `rooms.write` | Yeniləmə |
| DELETE | `/api/rooms/{room}` | `rooms.write` | Silmə |

### Şagird idarəetməsi (`SchoolStudentController`)

| Method | Route | Permission | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/students` | `auth:sanctum` | Şagird siyahısı (rol əsaslı filtr) |
| POST | `/api/students` | `auth:sanctum` | Şagird yaradılması |
| GET | `/api/students/{student}` | `auth:sanctum` | Şagird detalı |
| PUT | `/api/students/{student}` | `auth:sanctum` | Yeniləmə |
| DELETE | `/api/students/{student}` | `auth:sanctum` | Silmə |
| GET | `/api/students/{student}/grades` | `students.grades` | Qiymətlər |
| GET | `/api/students/{student}/attendance` | `students.attendance` | Davamiyyət |
| GET | `/api/students/{student}/schedule` | `students.schedule` | Cədvəl |
| POST | `/api/students/{student}/enroll` | `students.enroll` | Qəbul |
| POST | `/api/students/{student}/transfer` | `students.transfer` | Köçürmə |
| POST | `/api/students/{student}/graduate` | `students.graduate` | Məzun statusu |
| GET | `/api/students/search/{query}` | `students.read` | Axtarış |
| POST | `/api/students/bulk-create` | `students.bulk` | Kütləvi əlavə |
| POST | `/api/students/bulk-update` | `students.bulk` | Kütləvi yeniləmə |
| POST | `/api/students/bulk-delete` | `students.bulk` | Kütləvi silmə |
| GET | `/api/students/analytics/overview` | `students.analytics` | Analitika |
| GET | `/api/students/reports/performance` | `students.reports` | Hesabat |

### Qiymətlər və fənn etiketi

| Method | Route | Permission | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/grades` | `grades.read` | Qiymət siyahısı |
| POST | `/api/grades` | `grades.write` | Yeni qiymət |
| GET | `/api/grades/{grade}` | `grades.read` | Qiymət detalı |
| PUT | `/api/grades/{grade}` | `grades.write` | Yeniləmə |
| DELETE | `/api/grades/{grade}` | `grades.write` | Silmə |
| GET | `/api/grade-tags` | `grades.read` | Qiymət tag-ları |
| POST | `/api/grade-tags` | `grades.write` | Tag yaradılması |
| GET | `/api/grade-subjects` | `grades.read` | Fənnə görə qiymət göstəriciləri |
| GET | `/api/grade-subjects/report` | `grades.read` | Hesabat |

### Tədbirlər və müəllim performansı

| Method | Route | Permission/Role | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/school-events` | `events.read` | Tədbirlər |
| POST | `/api/school-events` | `events.write` | Tədbir yaradılması |
| GET | `/api/school-events/{event}` | `events.read` | Tədbir detalları |
| PUT | `/api/school-events/{event}` | `events.write` | Yeniləmə |
| DELETE | `/api/school-events/{event}` | `events.write` | Silmə |
| GET | `/api/teacher-performance` | `teacher_performance.read` | Müəllim performansı |
| GET | `/api/teacher-performance/analytics` | `teacher_performance.read` | Analitik göstəricilər |

### Qiymətləndirmə (Assessments)

| Method | Route | Permission | Qeyd |
| --- | --- | --- | --- |
| GET | `/api/assessments` | `assessments.read` | Qiymətləndirmə siyahısı |
| POST | `/api/assessments` | `assessments.write` | Yeni qiymətləndirmə |
| GET | `/api/unified-assessments` | `assessments.read` | Unified siyahı |
| POST | `/api/unified-assessments` | `assessments.write` | Unified əlavə |
| GET | `/api/region-assessments` | `assessments.read` | Regional qiymətləndirmələr |
| POST | `/api/region-assessments` | `assessments.write` | Regional əlavə |

---

