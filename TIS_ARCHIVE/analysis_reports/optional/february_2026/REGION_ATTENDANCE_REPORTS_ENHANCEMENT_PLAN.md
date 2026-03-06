# Regional Davamiyyət Hesabatlarının Təkmilləşdirilməsi Planı

Bu sənəd `/regionadmin/attendance/reports` səhifəsinin həm vizual, həm də funksional cəhətdən təkmilləşdirilməsi üçün hazırlanmış 5 fazalı yol xəritəsini ehtiva edir.

---

## 🔍 Mövcud Vəziyyətin Təhlili

Hazırda Davamiyyət Hesabatları modulu əsas struktura malikdir, lakin aşağıdakı çatışmazlıqlar mövcuddur:
- **Data Uyğunsuzluğu:** Xülasə kartları ilə bildirişlər paneli arasında məntiqi ziddiyyətlər (məsələn: 0% davamiyyət halında "Hər şey qaydasındadır" mesajı).
- **Vizualizasiya Çatışmazlığı:** Məlumatlar yalnız cədvəl formalıdır, trendlər və müqayisələr vizual olaraq (qrafiklərlə) ifadə olunmur.
- **Funksional Məhdudiyyət:** Hesabatların eksportu (Excel/PDF) və cədvəllərdə axtarış/sıralama imkanları yoxdur.

---

## 📋 Təkmilləşdirmə Fazaları

### **Faza 1: Məntiqi Düzəlişlər və Data Sinxronizasiyası** 🔴
**Məqsəd:** İstifadəçiyə göstərilən məlumatların dəqiqliyini və tutarlılığını təmin etmək.
- **Backend:** `RegionalAttendanceService.php` daxilindəki `buildAlerts` metodunu təkmilləşdirmək. Əgər məktəblərin 50%-dən çoxu hesabat göndərməyibsə, bunu kritik xəbərdarlıq kimi qeyd etmək.
- **Frontend:** `RegionAttendanceReports.tsx` faylında "Empty State" (məlumat tapılmadıqda göstərilən interfeys) daxil etmək.
- **Validasiya:** Tarix aralığı seçildikdə gələcək tarixlərin seçilməsini bloklamaq.

### **Faza 2: Eksport və Çap İmkanları** 🔴
**Məqsəd:** Hesabatların kənara çıxarılması və rəsmi istifadəyə uyğunlaşdırılması.
- **Excel Export:** `Maatwebsite\Excel` kitabxanasından istifadə edərək filtrlənmiş datanın `.xlsx` formatında yüklənməsi.
- **PDF Export:** Regional və ya sektor səviyyəli xülasə hesabatının PDF formatında generasiyası.
- **Print Mode:** Səhifənin çap üçün optimallaşdırılmış CSS (media query) versiyasını hazırlamaq.

### **Faza 3: Vizualizasiya (Qrafiklər)** 🟡
**Məqsəd:** Böyük həcmli məlumatların sürətli analizini təmin etmək.
- **Sektor Müqayisəsi:** `Recharts` vasitəsilə sektorlar üzrə orta davamiyyəti göstərən Bar Chart.
- **Davamiyyət Trendi:** Seçilmiş dövr üzrə davamiyyətin qalxıb-enməsini göstərən Line Chart.
- **Rəng Kodlaşdırması:** Davamiyyət faizinə görə avtomatik rəng dəyişimi (Yaşıl > 95%, Sarı 85-95%, Qırmızı < 85%).

### **Faza 4: İnteraktiv Cədvəllər və Axtarış** 🟡
**Məqsəd:** İstifadəçi təcrübəsini (UX) və məlumat əlçatanlığını artırmaq.
- **Global Search:** Məktəb cədvəlinin üstündə real-time axtarış sahəsi.
- **Client-side Sorting:** Sütun başlıqlarına klikləyərək artan/azalan sıralama.
- **Drill-down:** Ümumi cədvəldə məktəbə kliklədikdə avtomatik olaraq "Məktəb & Sinif nəzarəti" tabına keçid və həmin məktəbin seçilməsi.
- **Pagination:** Məktəblərin siyahısını səhifələrə bölmək (hər səhifədə 20 məktəb).

### **Faza 5: Qabaqcıl Analitika** 🟢
**Məqsəd:** Strategiya qəbulu üçün dərin analiz alətləri təqdim etmək.
- **Müqayisəli Analiz:** Cari dövrün ötən ay və ya ötən ilin eyni dövrü ilə müqayisəsi (Artım/Azalma faizləri ilə).
- **Threshold Config:** Adminlər üçün "aşağı davamiyyət" həddini tənzimləmək imkanı.
- **Problemli Nöqtələr:** Ən çox dərs buraxılan günlərin və ya siniflərin avtomatik aşkarlanması.

---

## 🛠 Texniki Tapşırıqlar (Backlog)

### **Backend:**
- [ ] `RegionalAttendanceController`-ə `exportExcel` və `exportPdf` metodlarını əlavə etmək.
- [ ] `RegionalAttendanceService`-də `calculateGrowth` məntiqini qurmaq (müqayisə üçün).
- [ ] Dinamik sorting üçün query builder-ə sort parametrlərini inteqrasiya etmək.

### **Frontend:**
- [ ] `Recharts` kitabxanasını `RegionAttendanceReports.tsx`-ə daxil etmək.
- [ ] Cədvəl komponentini `DataTable` (tanstack-table) səviyyəsinə qaldırmaq.
- [ ] Export düymələri üçün UI komponentlərini əlavə etmək.

---

**Qeyd:** Bu plan icra olunduqca hər bir addım test edilməli və GitHub üzərindən `feature/attendance-reports` budağı ilə izlənilməlidir.
