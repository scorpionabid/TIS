# PRD: Dərs yükü və Vakansiyalar Modulu

## 1. Giriş
### Məqsəd
Bu modulun məqsədi ümumtəhsil məktəblərində müəllimlərin dərs yükünün (master plan) və vakant saatların mərkəzləşdirilmiş qaydada idarə edilməsini, monitorinqini və hesabatlılığını təmin etməkdir. Modul həm məktəb səviyyəsində məlumat daxiletməsini, həm də regional səviyyədə təsdiqləmə və statistik təhlili əhatə edir.

### Hədəf Kütləsi
- **Məktəb Admini**: Məktəbin tədris planını və dərnək saatlarını idarə edir.
- **Sektor Admini**: Öz sektorundakı məktəblərin planlarını yoxlayır və təsdiqləyir.
- **Regional Admin & Operator**: Bütün region üzrə monitorinq aparır, qlobal tənzimləmələri idarə edir.

---

## 2. İstifadəçi Rolları və Səlahiyyət Matrisi

| Səlahiyyət | Məktəb Admini | Sektor Admini | Regional Admin / Operator |
| :--- | :---: | :---: | :---: |
| Plan Daxil Etmək (Master Plan) | ✅ (Yalnız özününkü) | ❌ | ❌ |
| Vakansiyalara Baxış | ✅ | ✅ | ✅ |
| Planı Təsdiqə Göndərmək | ✅ | ❌ | ❌ |
| Planı Təsdiq/Geri Qaytarmaq | ❌ | ✅ (Region icazə verdikdə) | ✅ |
| Sistemi Kilidləmək / Deadline Təyin Etmək | ❌ | ❌ | ✅ |
| Excel Export (Yığım/Bölgü) | ✅ | ✅ | ✅ |

---

## 3. Funksional Tələblər

### 3.1. Tədris Planı (Master Plan) İdarəetməsi
- **Fənn və Saat Daxiletmə**: Hər bir sinif səviyyəsi (Mh-11) və təhsil növü (Ümumi, Fərdi, Evdə, Xüsusi, Dərnək) üzrə fənn saatları daxil edilməlidir.
- **Avtomatik Vakansiya Hesablama**: 
  > Vakansiya = (Master Plan Üzrə Saat) - (Müəllimlərə Təyin Edilmiş Saat)
- **Xüsusi Saatlar**: Dərnək (Subject ID: 57) və Dərsdənkənar (Subject ID: 56) saatları ümumi cədvəldən ayrı, xüsusi sətirlərdə və statistikada göstərilməlidir.

### 3.2. Monitorinq və Təsdiqləmə İş Axını (Workflow)
Modul aşağıdakı statusları dəstəkləyir:
1. **Qaralama (Draft)**: Plan hələ tamamlanmayıb, yalnız məktəb admini görə bilər.
2. **Gözləmədə (Submitted)**: Məktəb planı tamamlayıb təsdiqə göndərib. Redaktə məktəb üçün qapanır.
3. **Təsdiqlənmiş (Approved)**: Sektor və ya Region admini planı təsdiqləyib. Məlumatlar rəsmi statistikaya daxil olur.
4. **Geri Qaytarılmış (Returned)**: Plana düzəliş tələb olunur (Comment ilə birlikdə).

### 3.3. Qlobal Tənzimləmələr
- **Sistemin Kilidlənməsi**: Müəyyən tarixdən sonra məlumat daxiletməsinin tamamilə dayandırılması.
- **Operator İcazələri**: Sektor adminlərinə və ya operatorlara redaktə icazəsinin regional səviyyədə verilməsi/lövğ edilməsi.

---

## 4. İstifadəçi İnterfeysi (UI/UX) Standartları

### 4.1. Premium Dizayn Elementləri
- **Glassmorphism**: Bütün panel və kartlar üçün `bg-white/70 backdrop-blur-xl` və `shadow-premium` effektləri tətbiq olunmalıdır.
- **Dinamik Statistik Kartlar**: Reaktiv göstəricilər (Total Hours, Approved Rate, Vacancy Count).
- **Sticky Headers**: Böyük cədvəllərdə (məsələn: Yığım Cədvəli) başlıqlar skrol zamanı yuxarıda sabit qalmalıdır.

### 4.2. Rəng Kodlaşdırması
- **Indigo**: Əsas naviqasiya və başlanğıc elementləri.
- **Emerald**: Təsdiqlənmiş planlar və müsbət statistikalar.
- **Rose/Orange**: Vakansiyalar, səhifə xətaları və geri qaytarılmış planlar.
- **Amber**: Gözləmədə olan və ya xəbərdarlıq tələb edən vəziyyətlər.

---

## 5. Texniki Tələblər və Arxitektura

### 5.1. Backend İnteqrasiyası
- **Endpoints**:
  - `GET /api/v1/curriculum/master-plan`: Məktəbin planını və assigned saatlarını gətirir.
  - `POST /api/v1/curriculum/master-plan`: Saatları yadda saxlayır.
  - `POST /api/v1/curriculum/workflow/{action}`: Təsdiq/Geri qaytarma əməliyyatları.

### 5.2. Frontend Məntiqləri
- **Auto-save**: İstifadəçi məlumat daxil etdikdə 2 saniyəlik debounced auto-save funksiyası işə düşməlidir.
- **State Management**: `@tanstack/react-query` ilə məlumatların keşlənməsi və sinxronizasiyası.
- **Excel Export**: `ExcelJS` vasitəsilə mürəkkəb formalı (birləşmiş xanalar, rəngli başlıqlar) yığım və bölgü cədvəllərinin generasiyası.

---

## 6. Hesabatlılıq (Reporting)
Sistem aşağıdakı rəsmi hesabatları Excel formatında təqdim etməlidir:
1. **Yığım Cədvəli**: Siniflər üzrə saatların cəmlənmiş halı.
2. **Vakansiya Hesabatı**: Fənlər üzrə vakant saatların siyahısı.
3. **Dərs Bölgüsü**: Müəllimlər və onlara təyin edilmiş sinif/fənn detalları.

---

## 7. Qəbul Meyarları (Acceptance Criteria)
- [ ] Vakansiya hesablama məntiqi 100% dəqiqliklə işləyir (Manual yoxlamalarla təsdiq).
- [ ] Status dəyişdikdə rollar arası redaktə icazəsi dərhal bloklanır/açılır.
- [ ] Excel export-da başlıqlar və formulalar regional standartlara uyğundur.
- [ ] Mobil görünüşdə cədvəllər horizontal skrol ilə istifadəyə yararlıdır.
