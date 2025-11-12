# 🧪 TEST GUIDE: User Targeting & Advanced Filtering

**ATİS Link Sharing Enhancement - Phase 1 + 2**
**Date:** 2025-12-09

---

## 📋 QUICK START

### Prerequisites
- Docker environment running (`./start.sh`)
- Test user credentials (RegionAdmin or higher)
- Chrome/Firefox browser

### Migration Check
```bash
# 1. Start system
./start.sh

# 2. Run migration
docker exec atis_backend php artisan migrate

# 3. Verify column exists
docker exec atis_backend php artisan tinker
>>> \App\Models\LinkShare::first()
# Check for 'target_users' field in output
>>> exit
```

---

## 🎯 TEST SCENARIO 1: User-Based Link Targeting

### Setup (as RegionAdmin):
1. Login: `http://localhost:3000/login`
   - Email: `admin@atis.az`
   - Password: `admin123`

2. Navigate to **Resources** page

### Test Case 1.1: Create Link for Specific Users

**Steps:**
1. Click **"Yeni Resurs"** → **"Yeni Link"**
2. Fill basic info:
   - Title: "Test User Targeting"
   - URL: "https://forms.gov.az/test"
   - Link Type: "Form"
   - Description: "Sadəcə seçilmiş müəllimlər üçün"

3. **CRITICAL:** Look for radio buttons:
   ```
   ⚪ Müəssisələr (institution-based)
   ⚪ Xüsusi istifadəçilər (user-based) ← SELECT THIS
   ```

4. After selecting "Xüsusi istifadəçilər":
   - **Search box** should appear
   - **Filter** dropdowns (müəssisə, rol) should appear
   - **User list** should load

5. Test search:
   - Type "müəllim" → Should filter users by name
   - Type email → Should search by email

6. Test filters:
   - **Müəssisə filter:** Select a school → Users should filter
   - **Rol filter:** Select "müəllim" → Only teachers

7. Test bulk selection:
   - Click "Görünənləri seç" → All visible users selected
   - Click "Müəllimlər" → All teachers selected
   - Click "Hamısını ləğv et" → Clear all

8. Select 2-3 users manually (checkboxes)

9. Check **"Seçilmiş istifadəçilər"** section:
   - Should show count: "3 seçildi"
   - Should show blue badge with user names

10. Click **"Yadda saxla"**

**Expected Results:**
- ✅ Success toast: "Link uğurla yaradıldı"
- ✅ Link appears in Resources list
- ✅ Badge shows "3 istifadəçi" or similar

### Test Case 1.2: Verify Link Visibility (Target User)

**Setup:** Login as one of the selected users

**Steps:**
1. Logout from RegionAdmin
2. Login as selected teacher:
   - Find email in user list (e.g., `teacher1@example.com`)
   - Password: check with DevOps or use test password

3. Navigate to **Resources** page

4. Check link visibility:
   - Link "Test User Targeting" **SHOULD BE VISIBLE**
   - Click on link → Should open successfully

**Expected Results:**
- ✅ Selected user CAN see the link
- ✅ Link click tracked (check count badge)

### Test Case 1.3: Verify Link Invisibility (Non-Target User)

**Setup:** Login as different teacher (NOT selected)

**Steps:**
1. Logout
2. Login as different teacher
3. Navigate to **Resources** page

**Expected Results:**
- ❌ Link "Test User Targeting" **SHOULD NOT BE VISIBLE**
- ✅ Other public/institutional links still visible

---

## 🔍 TEST SCENARIO 2: Advanced Filtering

### Test Case 2.1: Filter Panel UI

**Steps:**
1. Login as RegionAdmin
2. Navigate to **Resources** → **"Links"** tab

3. Look for **"Filtr seçimləri"** button with badge
   - Should show count of active filters (0 initially)

4. Click **"Filtr seçimləri"** → Panel should expand

5. Verify filter options:
   - **Link Növü:** external, video, form, document
   - **Paylaşma Səviyyəsi:** açıq, regional, sektor, müəssisə, xüsusi istifadəçilər
   - **Status:** aktiv, müddəti bitmiş, deaktiv
   - **Tarix:** başlanğıc və bitmə

6. Verify quick filters (checkboxes):
   - ☐ Yalnız mənim linklər
   - ☐ Önə çıxanlar

### Test Case 2.2: Single Filter

**Steps:**
1. Open filter panel
2. Select **Link Növü:** "Video"
3. Check results:
   - Only video links should appear
   - Filter badge should show "1 aktiv"
   - Active filter chip: "Növ: video" with X button

4. Click X on chip → Filter cleared, all links return

**Expected Results:**
- ✅ Filtering works immediately
- ✅ Badge count updates
- ✅ Chips display correctly
- ✅ Clear button removes filter

### Test Case 2.3: Multiple Filters

**Steps:**
1. Apply filters:
   - Link Növü: "Form"
   - Paylaşma Səviyyəsi: "institutional"
   - Status: "active"

2. Check:
   - Badge shows "3 aktiv"
   - 3 chips displayed
   - Results match all 3 criteria

3. Check "Mənim linklər" → Only your forms

4. Click "Təmizlə" → All filters removed

**Expected Results:**
- ✅ Multiple filters work together (AND logic)
- ✅ Filter combinations work correctly
- ✅ Clear all button resets everything

### Test Case 2.4: Date Range Filter

**Steps:**
1. Set **Başlanğıc tarix:** 7 days ago
2. Set **Bitmə tarix:** today
3. Check results → Only recent links

**Expected Results:**
- ✅ Date filtering works
- ✅ No links outside date range

---

## 🎨 TEST SCENARIO 3: UI/UX Validation

### Test Case 3.1: UserTargeting Component

**Visual Checks:**
- [ ] Search box visible and functional
- [ ] Filter dropdowns styled correctly
- [ ] User list shows avatars/badges
- [ ] Selected users section highlighted (blue background)
- [ ] Pagination shows when >50 users
- [ ] Loading spinner during search
- [ ] Empty state when no users found

### Test Case 3.2: LinkFilterPanel Component

**Visual Checks:**
- [ ] Collapsible panel transitions smooth
- [ ] Active filter count badge visible
- [ ] Filter chips have X buttons
- [ ] Grid layout responsive (mobile/desktop)
- [ ] Icons display correctly
- [ ] "Təmizlə" button positioned well

### Test Case 3.3: Responsive Design

**Test on different screens:**
1. Desktop (1920x1080)
2. Tablet (768x1024)
3. Mobile (375x667)

**Check:**
- [ ] Filter panel stacks on mobile
- [ ] User cards readable on all sizes
- [ ] Buttons don't overlap
- [ ] Text doesn't overflow

---

## 🔧 BACKEND API TESTS

### Test API Endpoints (Postman/cURL)

#### 1. User Search API
```bash
# Get auth token first (login)
TOKEN="your_token_here"

# Search users
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/users/search/müəllim"

# With filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/users/search/test?institution_id=5&role=müəllim"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "full_name": "Test Müəllim",
      "email": "teacher@test.com",
      "institution": { "id": 5, "name": "Test School" },
      "role": { "name": "müəllim", "display_name": "Müəllim" }
    }
  ],
  "meta": { "total": 15, "current_page": 1 }
}
```

#### 2. Create Link with Target Users
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Link",
    "url": "https://test.com",
    "link_type": "external",
    "target_users": [1, 2, 3]
  }' \
  http://localhost:8000/api/links
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 456,
    "title": "API Test Link",
    "target_users": [1, 2, 3]
  },
  "message": "Bağlantı uğurla yaradıldı"
}
```

#### 3. Filter Links
```bash
# Filter by type
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/links?link_type=video"

# Multiple filters
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/links?link_type=form&my_links=true&status=active"
```

---

## 🐛 TROUBLESHOOTING

### Issue: User search returns empty
**Check:**
1. Migration ran successfully
2. User has correct permissions (RegionAdmin+)
3. Institution hierarchy is correct
4. Backend logs: `docker logs atis_backend | grep "User search"`

### Issue: Target users not saving
**Check:**
1. Browser console for errors
2. Network tab → Check POST /api/links payload
3. Backend validation: `docker logs atis_backend | grep "validation"`

### Issue: Filters not working
**Check:**
1. Query params in network tab
2. LinkQueryBuilder filters applied
3. React Query cache invalidation

### Issue: Selected users don't see link
**Check:**
1. Database: `SELECT target_users FROM link_shares WHERE id=X`
2. User ID in target_users array
3. Link status is 'active'
4. No expiration date passed

---

## ✅ ACCEPTANCE CRITERIA

### Phase 1: User Targeting
- [x] RegionAdmin can search users
- [x] RegionAdmin can select specific users
- [x] Link created with target_users array
- [x] Target users can see link
- [x] Non-target users CANNOT see link
- [x] Hierarchical filtering works (RegionAdmin sees only their region)

### Phase 2: Advanced Filtering
- [x] Filter panel UI complete
- [x] All filter types working
- [x] Multiple filters combine (AND logic)
- [x] Filter badges show active filters
- [x] Clear filters button works
- [x] Filters persist in query

---

## 📊 PERFORMANCE CHECKS

### User Search Performance
- [ ] Search responds < 500ms
- [ ] Debounce works (500ms delay)
- [ ] Pagination loads smoothly
- [ ] No memory leaks (check DevTools)

### Filter Performance
- [ ] Filter change updates list < 300ms
- [ ] No unnecessary re-renders
- [ ] React Query caching works

---

## 🎓 USER ACCEPTANCE TEST (UAT)

**Ask RegionAdmin to:**
1. "Bir neçə müəllimə xüsusi form linki göndər"
2. "Yalnız öz yaratdığım linkləri göstər"
3. "Bütün video linkləri filtrləyib tap"

**Success:** User completes without help.

---

## 📝 TEST RESULTS TEMPLATE

```markdown
## Test Session Report
**Date:** YYYY-MM-DD
**Tester:** Name
**Environment:** Development/Staging

### Passed Tests:
- ✅ Test Case 1.1
- ✅ Test Case 2.2

### Failed Tests:
- ❌ Test Case 3.1 - UI issue with badges

### Bugs Found:
1. **Bug:** User search shows inactive users
   - **Severity:** Medium
   - **Reproduction:** Search without filters
   - **Expected:** Only active users
   - **Actual:** All users shown

### Notes:
- Overall system stable
- UI responsive
- Performance acceptable
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before production:
- [ ] All tests passed
- [ ] Migration tested on staging
- [ ] Rollback plan ready
- [ ] User guide updated
- [ ] DevOps notified

**Good luck testing! 🎉**
