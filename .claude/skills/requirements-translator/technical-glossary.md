# Azərbaycan → İngilis Texniki Lüğət

Bu lüğət requirements-translator skill tərəfindən istifadə olunur.
İstifadəçinin sadə Azərbaycan dilindəki sözlərini texniki İngilis terminlərə çevirir.

---

## Frontend Komponentlər

| Azərbaycan | İngilis | Texniki Kontekst | File Path Pattern |
|------------|---------|------------------|-------------------|
| Səhifə | Page / Screen | React component in pages directory | `pages/**/*.tsx` |
| Düymə | Button | shadcn/ui Button component | `<Button>` |
| Modal / Pəncərə | Modal / Dialog | shadcn/ui Dialog component | `<Dialog>` |
| Cədvəl | Table | shadcn/ui Table + DataTable | `<Table>` |
| Form | Form | Form with react-hook-form | `<Form>` |
| Input / Daxiletmə | Input Field | Form input field | `<Input>`, `<FormField>` |
| Select / Seçim | Select / Dropdown | Dropdown selector | `<Select>` |
| Checkbox | Checkbox | Checkbox component | `<Checkbox>` |
| Radio button | Radio | Radio button | `<RadioGroup>` |
| Filter | Filter / Search Bar | Search/filter functionality | State + API query |
| Sidebar | Sidebar | Navigation sidebar | `<Sidebar>` component |
| Header | Header / Navbar | Top navigation bar | `<Header>` |
| Card / Kart | Card | Card container | `<Card>` |
| Badge / Nişan | Badge | Status badge | `<Badge>` |
| Icon / İkon | Icon | Icon component | `lucide-react` icons |
| Tooltip | Tooltip | Hover tooltip | `<Tooltip>` |
| Tab / Vərəq | Tab | Tabbed interface | `<Tabs>` |

---

## Backend Terminlər (Laravel)

| Azərbaycan | İngilis | Laravel Kontekst | File Path |
|------------|---------|------------------|-----------|
| API nöqtəsi | API Endpoint | Route definition | `routes/api.php` |
| Controller | Controller | HTTP Controller | `app/Http/Controllers/` |
| Model | Model | Eloquent ORM Model | `app/Models/` |
| Migration | Migration | Database schema change | `database/migrations/` |
| Seeder | Seeder | Database seeder | `database/seeders/` |
| Middleware | Middleware | Request filter/guard | `app/Http/Middleware/` |
| Request | Form Request | Validation class | `app/Http/Requests/` |
| Resource | API Resource | Response transformer | `app/Http/Resources/` |
| Policy | Policy | Authorization logic | `app/Policies/` |
| Service | Service | Business logic layer | `app/Services/` |
| Repository | Repository | Data access layer | `app/Repositories/` |
| Factory | Factory | Model factory | `database/factories/` |
| Observer | Observer | Model observer | `app/Observers/` |
| Event | Event | Event class | `app/Events/` |
| Listener | Listener | Event listener | `app/Listeners/` |
| Job | Job | Queue job | `app/Jobs/` |
| Mail | Mail / Email | Mail class | `app/Mail/` |
| Notification | Notification | Notification | `app/Notifications/` |

---

## Database Terminləri

| Azərbaycan | İngilis | Kontekst |
|------------|---------|----------|
| Cədvəl (database) | Table | Database table |
| Sütun | Column | Table column |
| Sətir | Row | Table row |
| Əlaqə | Relationship | Model relationship |
| Xarici açar | Foreign Key | FK constraint |
| İndeks | Index | Database index |
| Unique | Unique constraint | Unique column |
| Nullable | Nullable | Optional field |
| Default | Default value | Default value |
| Cascade | Cascade | Cascade delete |

---

## CRUD Əməliyyatları

| Azərbaycan | İngilis | HTTP Method | Laravel Method |
|------------|---------|-------------|----------------|
| Yarat | Create | POST | `store()` |
| Göstər / Siyahı | List / Index | GET | `index()` |
| Oxu / Bax | Read / Show | GET | `show()` |
| Yenilə / Dəyişdir | Update | PUT/PATCH | `update()` |
| Sil | Delete / Destroy | DELETE | `destroy()` |
| Export | Export | GET/POST | `export()` |
| Import | Import | POST | `import()` |
| Axtarış / Filter | Search / Filter | GET | Query params |
| Növbələ / Sırala | Sort / Order | GET | `orderBy()` |
| Səhifələmə | Pagination | GET | `paginate()` |

---

## Permission & Authorization

| Azərbaycan | İngilis | Laravel/Spatie Context |
|------------|---------|------------------------|
| Səlahiyyət | Permission | Permission slug (e.g., `user.create`) |
| Rol | Role | User role (SuperAdmin, Admin) |
| İcazə | Authorization | Policy check |
| Yoxlama | Validation / Check | `authorize()`, `hasPermission()` |
| Giriş | Login / Authentication | Auth system |
| Çıxış | Logout | Auth logout |
| Token | Token | JWT/API token |
| Session | Session | User session |

---

## Institution & Hierarchy

| Azərbaycan | İngilis | Kontekst |
|------------|---------|----------|
| Qurum | Institution | Institution model |
| Hierarchy | Hierarchy | Parent-child tree |
| Filter | Scope / Filter | `forInstitution()` scope |
| Üst qurum | Parent Institution | `parent_id` |
| Alt qurum | Child Institution | `children` relationship |
| Kök qurum | Root Institution | Top-level institution |
| Ağac | Tree | Hierarchy tree |

---

## State Management (Frontend)

| Azərbaycan | İngilis | React Context |
|------------|---------|---------------|
| Vəziyyət | State | Component state |
| Göndərmək | Dispatch | State dispatch |
| Context | Context | React Context |
| Hook | Hook | Custom React hook |
| Effect | Side Effect | useEffect |
| Memo | Memoization | useMemo, useCallback |
| Ref | Reference | useRef |

---

## Form & Validation

| Azərbaycan | İngilis | Context |
|------------|---------|---------|
| Təsdiqləmə | Validation | Input validation |
| Məcburi | Required | Required field |
| İstəyə görə | Optional | Optional field |
| Minimum | Minimum | Min length/value |
| Maksimum | Maximum | Max length/value |
| Format | Pattern | Regex pattern |
| Xəta mesajı | Error message | Validation error |
| Uğurlu | Success | Success message |

---

## UI States & Actions

| Azərbaycan | İngilis | Kontekst |
|------------|---------|----------|
| Yüklənir | Loading | Loading state |
| Xəta | Error | Error state |
| Boş | Empty | No data |
| Uğurlu | Success | Success state |
| Pending | Pending | Waiting/pending |
| Aktiv | Active | Active state |
| Passiv / Deaktiv | Inactive / Disabled | Disabled state |
| Göstər | Show / Display | Visible |
| Gizlət | Hide | Hidden |
| Aç | Open | Opened (modal/menu) |
| Bağla | Close | Closed |
| Saxla | Save | Save action |
| Ləğv et | Cancel | Cancel action |
| Təsdiq et | Confirm | Confirm action |
| Sıfırla | Reset | Reset form/state |

---

## File & Upload

| Azərbaycan | İngilis | Kontekst |
|------------|---------|----------|
| Fayl | File | File object |
| Yüklə (upload) | Upload | File upload |
| Yüklə (download) | Download | File download |
| Şəkil | Image | Image file |
| Sənəd | Document | Document file |
| PDF | PDF | PDF file |
| Excel | Excel / Spreadsheet | Excel file |
| CSV | CSV | CSV file |
| Əlavə | Attachment | File attachment |
| Ölçü | Size | File size |
| Format | Format / Type | File type/MIME |

---

## Notification & Messaging

| Azərbaycan | İngilis | Kontekst |
|------------|---------|----------|
| Bildiriş | Notification | System notification |
| Mesaj | Message | User message |
| Toast | Toast | Toast notification |
| Alert | Alert | Alert message |
| Email | Email | Email notification |
| SMS | SMS | SMS message |

---

## Testing

| Azərbaycan | İngilis | Kontekst |
|------------|---------|----------|
| Test | Test | Unit/integration test |
| Mock | Mock | Mock data |
| Stub | Stub | Test stub |
| Assert | Assertion | Test assertion |

---

## Common Patterns

### "X-ə Y əlavə et"
- **Pattern**: ADD Y TO X
- **Example**: "Survey-ə export button əlavə et" → ADD export button TO Survey page

### "X-i dəyişdir"
- **Pattern**: UPDATE/MODIFY X
- **Example**: "User modal-ı dəyişdir" → UPDATE UserModal component

### "X-də filter"
- **Pattern**: FILTER IN/BY X
- **Example**: "Permission-da kateqoriya filter-i" → FILTER permissions BY category

### "X yaradacaq"
- **Pattern**: CREATE X
- **Example**: "Yeni migration yaradacaq" → CREATE new migration

### "X-ı sil"
- **Pattern**: DELETE X
- **Example**: "Bu field-i sil" → DELETE this field

---

## Usage Examples

### Example 1: Button Request
```
User: "Survey səhifəsinə export düyməsi qoy"

Translation:
- səhifə → page (SurveyList.tsx)
- export düyməsi → export button (<Button>)
- qoy → add

Technical: Add export button to SurveyList page
```

### Example 2: Filter Request
```
User: "Task cədvəlində status-a görə filter olsun"

Translation:
- cədvəl → table (TaskTable component)
- status → status field
- filter → filter/search functionality

Technical: Add status filter to Task table
```

### Example 3: Modal Field
```
User: "User modalına telefon nömrəsi əlavə et"

Translation:
- modal → dialog (UserModal.tsx)
- telefon nömrəsi → phone number field
- əlavə et → add

Technical: Add phone field to UserModal component
```

---

## Notes for AI

Bu lüğət **pattern matching** üçün istifadə olunur:
1. İstifadəçi inputunda Azərbaycan sözləri tap
2. Bu lüğətlə texniki İngilis terminlərə çevir
3. File path pattern-lərindən fayl tapın
4. Texniki plan hazırla

**Priority**: Ən çox istifadə olunan terminlər yuxarıdadır.
