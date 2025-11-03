## 🧠 Psychology & Wellbeing

> `routes/api/specialized.php` → `Route::prefix('psychology')`

| Method | Route | Permission | Təsvir |
| --- | --- | --- | --- |
| GET | `/api/psychology` | `psychology.read` | Psixoloji qiymətləndirmələrin siyahısı |
| POST | `/api/psychology` | `psychology.write` | Yeni qiymətləndirmə yaradılması |
| GET | `/api/psychology/{id}` | `psychology.read` | Qiymətləndirmə detalları |
| PUT | `/api/psychology/{id}` | `psychology.write` | Yeniləmə |
| DELETE | `/api/psychology/{id}` | `psychology.write` | Silmə |
| GET | `/api/psychology/student/{student}` | `psychology.read` | Şagird üzrə tarixçə |
| POST | `/api/psychology/student/{student}/assess` | `psychology.assess` | Şagird üçün yeni assessment |
| GET | `/api/psychology/assessments/types` | `psychology.read` | Assessment tipləri |
| POST | `/api/psychology/assessments/schedule` | `psychology.schedule` | Seans planlama |
| GET | `/api/psychology/reports/summary` | `psychology.reports` | Xülasə hesabatı |
| GET | `/api/psychology/analytics/trends` | `psychology.analytics` | Trend analitikası |
| POST | `/api/psychology/recommendations/generate` | `psychology.recommend` | Tövsiyə generasiyası |
| GET | `/api/psychology/templates` | `psychology.read` | Assessment şablonları |
| POST | `/api/psychology/templates` | `psychology.templates` | Şablon yaradılması |
| GET | `/api/psychology/interventions` | `psychology.interventions` | İntervensiya siyahısı |
| POST | `/api/psychology/interventions` | `psychology.interventions` | İntervensiya yaradılması |
| GET | `/api/psychology/progress/{student}` | `psychology.progress` | Şagirdin irəliləyişi |
| POST | `/api/psychology/referrals` | `psychology.referrals` | Referal yaradılması |
| GET | `/api/psychology/statistics/overview` | `psychology.statistics` | Ümumi göstəricilər |
| POST | `/api/psychology/export` | `psychology.export` | İxrac |

Teacher performance endpointləri artıq [Educational & Academic Management](#-educational--academic-management) bölməsində cədvəl formatında göstərilir.

---

