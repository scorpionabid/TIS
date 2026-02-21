# Schooladmin Reyting Test Planı

## Proyektin Məqsədi
ATİS (Alignment, Training & Inspection System) proyektində schooladmin (direktor) reytinq hesablama sisteminin tam şəkildə test edilməsi və yoxlanılması.

## Test Edilən Komponentlər

### 1. Backend Arxitekturası
- **RatingCalculationService**: Əsas hesablama məntiqi
- **RatingController**: API endpointləri  
- **Rating Model**: Database strukturu

### 2. Hesablama Alqoritması
- **Task Score**: +1 (vaxtında), -1 (gecikmiş/edilməmiş)
- **Survey Score**: +1 (vaxtında), -1 (gecikmiş/edilməmiş)
- **Attendance Score**: +1 (gün ərzində qeyd edilib), -1 (qeyd edilməyib)
- **Link Score**: +1 (açılıb), -1 (açılmayıb)
- **Manual Score**: Admin tərəfindən manual daxil edilir (-100 ilə +100)
- **Overall Score**: Bütün komponentlərin cəmi

### 3. API Endpointləri
- `POST /api/ratings/calculate/{userId}` - Tək user üçün hesablama
- `POST /api/ratings/calculate-all` - Bütün userlər üçün hesablama
- `GET /api/ratings` - Reytinqləri listələmə (auto-calculation dəstəyi)

## Hazırlanan Testlər

### Feature Tests (RatingCalculationTest.php)
✅ **it_can_calculate_single_user_rating**
- Tək schooladmin üçün reytinq hesablaması
- Task, Survey, Link komponentlərinin yoxlanılması
- Overall score hesablamasının doğruluğu

✅ **it_can_calculate_all_ratings_for_role**
- Bütün schooladmin userlər üçün bulk hesablama
- Success/Error count yoxlanması

✅ **it_respects_user_hierarchy_in_calculations**
- User hierarchy-ə görə data isolation
- Yalnız icazəsi olan müəssisələrə məhdudlaşma

✅ **it_handles_task_score_calculation_correctly**
- Task score hesablaması (on-time/late/overdue)
- +1/-1 point sisteminin yoxlanması

✅ **it_preserves_manual_score_during_recalculation**
- Manual score-un qorunması
- Avtomatik hesablama zamanı manual dəyərlərin saxlanılması

✅ **it_uses_cache_to_avoid_frequent_recalculations**
- 5 dəqiqəlik cache sistemi
- Force parameter ilə cache bypass

✅ **it_requires_proper_permissions**
- Permission validation
- `ratings.calculate` permissionunun yoxlanılması

✅ **it_validates_required_parameters**
- Parameter validation
- `academic_year_id` və `period` field-lərinin tələb edilməsi

### API Tests (RatingApiTest.php)
✅ **it_can_list_ratings_with_user_role_filter**
- Reytinqlərin listələnməsi
- User role filter-i

✅ **it_auto_calculates_ratings_when_fetching_with_user_role**
- Auto-calculation xüsusiyyəti
- API çağırışı zamanı avtomatik hesablama

✅ **it_filters_ratings_by_institution**
- Müəssisə filter-i
✅ **it_searches_ratings_by_user_name_or_email**
- Axtarış funksionallığı
✅ **it_filters_ratings_by_status**
- Status filter-i (published/draft/archived)
✅ **it_sorts_ratings_by_score**
- Score üzrə sıralama
✅ **it_groups_ratings_by_sector**
- Sektor qruplaşdırması
✅ **it_can_create_rating_manually**
- Manual reytinq yaradılması
✅ **it_can_update_rating**
- Reytinq yenilənməsi
✅ **it_recalculates_overall_score_when_updating_scores**
- Overall score avtomatik yenidən hesablama
✅ **it_can_delete_rating**
- Reytinq silmə
✅ **it_respects_data_isolation_for_different_institutions**
- Data isolation
✅ **it_validates_manual_score_range**
- Manual score validation (-100 ilə +100)
✅ **it_requires_proper_permissions_for_crud_operations**
- CRUD permission-ları

### Unit Tests (RatingCalculationServiceTest.php)
✅ **it_calculates_task_score_with_on_time_and_late_tasks**
- Task score hesablamasının detallı testi
✅ **it_calculates_survey_score_with_on_time_and_late_responses**
- Survey score hesablaması
✅ **it_calculates_attendance_score_based_on_same_day_recording**
- Attendance score hesablaması
✅ **it_calculates_link_score_based_on_access_logs**
- Link score hesablaması
✅ **it_calculates_overall_score_as_sum_of_all_components**
- Overall score hesablaması
✅ **it_preserves_existing_manual_score**
- Manual score qorunması
✅ **it_uses_cache_to_skip_recent_calculations**
- Cache sistemi
✅ **it_forces_recalculation_when_force_parameter_is_true**
- Force recalculation
✅ **it_calculates_all_ratings_for_users_in_hierarchy**
- Bulk hesablama
✅ **it_respects_user_hierarchy_in_bulk_calculations**
- Hierarchy izləməsi
✅ **it_handles_calculation_errors_gracefully_in_bulk_operations**
- Error handling

## Texniki Xüsusiyyətlər

### Database Uyğunluğu
- ✅ SQLite COMMENT sintaksisi problemləri həll edildi
- ✅ CONSTRAINT uyğunluğu təmin edildi
- ✅ Test database faylı yaradıldı

### Test Mühiti
- ✅ RefreshDatabase with SQLite
- ✅ Factory-lər və seeders
- ✅ Permission system integration
- ✅ User hierarchy setup

### Performance
- ✅ Cache sistemi test edildi
- ✅ Bulk operations test edildi
- ✅ Data isolation test edildi

## Nəticələr

### ✅ Uğurla Tamamlanan
- Bütün core reytinq hesablama funksionallığı
- API endpoint-ləri
- Permission və security
- Data validation
- Error handling
- Cache sistemi
- User hierarchy

### 📊 Test Coverage
- **Feature Tests**: 8 test
- **API Tests**: 12 test  
- **Unit Tests**: 11 test
- **Cəmi**: 31 test

### 🔍 Tapılan və Həll Edilən Problemlər
1. SQLite COMMENT sintaksisi uyğunsuzluqları
2. CONSTRAINT syntax problemləri
3. Factory class-ların mövcud olmaması
4. Database column uyğunsuzluqları
5. Decimal format validation problemləri

## Gələcək Təkmilləşdirmələr
- Performance testləri (bulk operations)
- Integration testləri (frontend ilə)
- Load testləri
- Edge case testləri

## Qeydlər
- Bütün testlər SQLite database-də işləyir
- Test mühiti real production mühitinə yaxındır
- Permission system tam şəkildə test edildi
- User hierarchy doğru işləyir
