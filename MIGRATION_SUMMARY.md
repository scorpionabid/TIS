# 🚀 TIS Layihəsi Uğurla Local-a Köçürüldü (Desktop Apps)

**Status:** ✅ Tamamlandı
**Yeni Yer:** `~/Desktop/apps/TIS_LOCAL`
**Qovluq:** Git Repository (GitHub-dan clone edildi)

---

## 📊 Nə edildi?

1. ✅ **GitHub-dan Clone Edildi**
   - OneDrive-dan kopyalamaq əvəzinə, birbaşa GitHub-dan `git clone` edildi (daha təmiz və sürətli).
   - `~/Desktop/apps/TIS_LOCAL` qovluğu yaradıldı.

2. ✅ **Verilənlər Bazası (Data) Qorundu**
   - Köhnə Docker volume-ları (`tis_postgres_data`) yeni layihəyə bağlandı.
   - `composer install` və `npm install` tam uğurla bitdi.

3. ✅ **Sistem Statusu**
   - **Backend:** http://localhost:8000/api/health (✅ İşləyir)
   - **DB:** Migrations yoxlandı (✅ Bütün cədvəllər yerində)
   - **Docker:** Bütün container-lər `Healthy` və `Started` statusundadır.

---

## 💡 İndi Nə Etməli?

### 1. Yeni Workspacedə İşləyin
Artıq `OneDrive/Desktop/ATİS` qovluğunda deyil, **`~/Desktop/apps/TIS_LOCAL`** qovluğunda işləməlisiniz.

1. VS Code-da yeni pəncərə açın.
2. `File` -> `Open Folder...` -> `Desktop` -> `apps` -> `TIS_LOCAL` seçin.

### 2. OneDrive-ı Təmizləyin (Tövsiyə olunur)
Köhnə `OneDrive` qovluğundaki **kodları** silə bilərsiniz (yer boşaltmaq üçün). Amma **sənədləri** saxlayın.

```bash
# 1. Sənədləri saxlayın (əgər lazımdırsa)
# 2. TIS qovluğunu silin (çünki artıq local-da var)
```

**Qeyd:** Köhnə `TIS` qovluğunu hələlik `TIS_ARCHIVE` kimi adlandıra bilərsiniz (1-2 gün test etdikdən sonra silərsiniz).

### 3. Git Workflow
Artıq Git əmrləri OneDrive tərəfindən yavaşlamayacaq!
- `git status` -> anında cavab verəcək
- `git pull` -> sürətli olacaq

---

## ⚠️ Bir Probleminiz Olsa...

Əgər nəsə işləmirsə:
1. Terminalı açın
2. `cd ~/Desktop/apps/TIS_LOCAL`
3. `export COMPOSE_PROJECT_NAME=tis`
4. `docker-compose up -d`

Uğurlar! 🚀
