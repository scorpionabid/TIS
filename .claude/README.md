# ATİS Claude Configuration

Bu qovluq ATİS layihəsində Claude Code-un daha effektiv işləməsi üçün konfiqurasiya fayllarını ehtiva edir.

## 📁 Struktur

```
.claude/
├── README.md                     # Bu fayl - ümumi təlimat
├── skills.md                     # Skills vs Commands overview
│
├── skills/                       # 🆕 Auto-discovered Skills
│   └── requirements-translator/  # 🔑 ƏN ÖNƏMLİ - Sadə dilin texniki dilə çevrilməsi
│       ├── SKILL.md              # Main skill definition (auto-discovery)
│       ├── technical-glossary.md # AZ → EN texniki lüğət
│       ├── language-patterns.md  # Natural language pattern matching
│       └── token-optimization.md # Token qənaət strategiyaları
│
├── agents/                       # 🤖 Expert Agents (implementation)
│   ├── laravel-expert.md         # Laravel backend kod yazır
│   ├── react-expert.md           # React frontend kod yazır
│   ├── db-expert.md              # Database operations
│   └── devops-expert.md          # DevOps operations
│
├── references/                   # 📚 Reference documentation (token optimized)
│   ├── atis-permissions-guide.md # 🔐 Permission qaydaları hər səhifə üçün
│   └── atis-impact-analyzer.md   # 📊 Dəyişikliklərin təsir analizi
│
├── commands/                     # ⚡ Slash command implementations
│   ├── atis-start.md
│   ├── atis-db.md
│   ├── atis-debug.md
│   └── atis-test.md
│
├── hooks/                        # 🔗 Pre/Post tool execution hooks
│   ├── pre-tool-use.sh           # Əməliyyat ÖNCƏSİ yoxlamalar
│   └── post-tool-use.sh          # Əməliyyat SONRASI proseslər
│
├── templates/                    # 📝 Code generation templates
│   ├── react-component.tsx
│   ├── react-service.ts
│   ├── laravel-controller.php
│   └── laravel-service.php
│
└── archive/                      # 🗄️ Köhnə versiyalar
    └── 2026-01-10-pre-skills-migration/
        └── requirements-translator.md  # Köhnə agent versiyası
```

## 🎯 NECƏ İŞLƏYİR?

### 1️⃣ Sadə Dildə Request Verirsiz

```
Siz: "User modalına telefon field əlavə et"
```

### 2️⃣ requirements-translator SKILL Avtomatik Aktivləşir

Claude avtomatik olaraq **`requirements-translator`** SKILL-ini aşkar edib aktivləşdirir:
- Hansı səhifə haqqında danışdığınızı anlayır (pattern matching)
- Minimal kod araşdırması edir (Grep > Glob > Read - token qənaət)
- Dəqiq texniki plan hazırlayır
- Size təsdiq sualları verir (AZ dilində)

```markdown
🔍 ANALİZ:
- Səhifə: UserModal.tsx
- Migration: Lazımdır (phone field yoxdur)

📋 PLAN:
1. UserModal.tsx - input field əlavə
2. Migration - add phone column
3. Validation - phone format

❓ TƏSDIQ:
1. Phone format: +994 XX XXX XX XX?
2. Required və ya optional?

⚠️ İMPACT: 🟡 ORTA (3 fayl, 1 migration)
```

### 3️⃣ Siz Təsdiq Edirsiniz

```
Siz: "Bəli, optional olsun, sadə format"
```

### 4️⃣ Expert Agents İşə Düşür

- **laravel-expert**: Backend migration və validation
- **react-expert**: Frontend modal update

### 5️⃣ Hooks Avtomatik İşləyir

- **pre-tool-use.sh**: Təkrarçılıq yoxlanır, production fayl qorunur
- **post-tool-use.sh**: Auto-format, test reminder, git status

## 🔑 ƏSAS FAYLLAR VƏ SİSTEMLƏR

### 🆕 Skills vs Agents - Fərq Nədir?

| Aspekt | **Skills** | **Agents** |
|--------|-----------|-----------|
| **Aktivləşmə** | Avtomatik (Claude özü aşkar edir) | Expert agents (kod yazmaq üçün) |
| **Discovery** | Pattern matching ilə auto-discovery | Skills tərəfindən çağırılır |
| **İş bölgüsü** | PLAN hazırlayır | KOD yazır |
| **Token usage** | Minimal (50-200 token) | Normal (500-2000 token) |
| **Məqsəd** | Tərcümə + Analiz + Plan | Implementation |

**Skills**: requirements-translator (planlayıcı - kod YAZMAZ)
**Agents**: laravel-expert, react-expert, db-expert, devops-expert (implementor - kod YAZAR)

---

### requirements-translator SKILL

**Məqsəd**: Sizin sadə dilinizi texniki spesifikasiyaya çevirir (PLAN fazası)

**Nə edir**:
- ✅ Minimal token istifadə edərək kod araşdırması (Progressive Discovery)
- ✅ AZ → EN tərcümə (technical glossary)
- ✅ Pattern matching (language-patterns.md)
- ✅ Dəqiq fayl dependency analizi
- ✅ Impact analysis (hansı fayllar dəyişəcək?)
- ✅ Təsdiq sualları (ambiguity-ni aradan qaldırır)
- ❌ Kod YAZMIR! (yalnız plan hazırlayır)

**Nə zaman işləyir**: Hər dəfə texniki olmayan dildə (sadə AZ dilində) request verdiyinizdə avtomatik aktivləşir

**Supporting files**:
- `SKILL.md` - Main skill definition
- `technical-glossary.md` - 200+ AZ→EN term
- `language-patterns.md` - 6 pattern template
- `token-optimization.md` - 40-60x token qənaət strategiyaları

---

### atis-permissions-guide.md

**Məqsəd**: Hər səhifənin permission strukturunu izah edir

**Nə edir**:
- 📋 Səhifə-səhifə permission siyahısı
- 🔐 Role hierarchy qaydaları
- 🏗️ Institution hierarchy filter-ləri
- ✅ Permission check pattern-ləri

**Nə zaman işləyir**: Permission ilə bağlı dəyişiklik olduqda Claude bu fayla baxır

---

### atis-impact-analyzer.md

**Məqsəd**: Kod dəyişikliklərinin digər hissələrə təsirini analiz edir

**Nə edir**:
- 🟢 Risk səviyyəsi təyini (Aşağı/Orta/Yüksək)
- 📁 Dəyişəcək faylların siyahısı
- 🔗 Təsir olunan səhifələr
- ⚠️ Xəbərdarlıqlar (production, migration, permission)

**Nə zaman işləyir**: Hər dəyişiklikdən əvvəl Claude impact analizi aparır

## 💡 NÜMUNƏİSTİFADƏ CASE-LƏRİ

### Case 1: "Permission səhifəyə filter əlavə et"

```
1. requirements-translator SKILL: Həmin səhifəni tapır, minimal search (50 token)
2. atis-permissions-guide: Permission check-lərə baxır
3. atis-impact-analyzer: Impact: 🟢 AŞAĞI (1 fayl)
4. Təsdiq sualları → İstifadəçi təsdiq edir
5. react-expert AGENT: Kodu yazır
```

**Nəticə**: 5-10 dəqiqə, 1 fayl dəyişikliyi, təhlükəsiz

---

### Case 2: "Task-a assigned user və my tasks səhifəsi"

```
1. requirements-translator SKILL: Kompleks feature analiz edir, plan hazırlayır (150 token)
2. atis-permissions-guide: task.assign permission-una baxır
3. atis-impact-analyzer: Impact: 🟡 ORTA-YÜKSƏK (8 fayl)
4. Təsdiq sualları:
   - Notification göndərilsin?
   - Institution filter?
5. İstifadəçi təsdiq edir → Expert agents aktivləşir
6. laravel-expert + react-expert AGENTS: İmplementasiya (kod yazır)
```

**Nəticə**: 4-6 saat, 8 fayl, migration, notification

---

### Case 3: "Bütün permission sistem superadmin səhifəsində"

```
1. requirements-translator: CLAUDE.md-də plan var, göstərir
2. atis-impact-analyzer: Impact: 🔴 YÜKSƏK (15+ fayl)
3. Sual: Hansı fazadan başlayaq? (Kiçik/Orta/Tam)
4. Fazalı implementasiya
```

**Nəticə**: 14-20 saat, çoxlu fayl, production-safe approach

## 🚀 SİZİN WORKFLOW-UNUZ

### Əvvəl (Vibe Coding):

```
Siz: "Survey-ə export button əlavə et"
Claude: *bütün kodu oxuyur, hər yeri dəyişir, 5000 token*
Siz: "Yox, bu çox böyük dəyişiklikdir..."
```

### İndi (Structured Coding):

```
Siz: "Survey-ə export button əlavə et"

Claude (requirements-translator SKILL - avtomatik aktivləşir):
🔍 Araşdırıram... (50 token - Progressive Discovery)
📋 PLAN: 3 fayl, 1 endpoint, 1 permission
❓ SUAL: Bütün surveyləri, yoxsa seçilmişləri?
⚠️ İMPACT: 🟡 ORTA

Siz: "Seçilmişləri"

Claude (expert agents - laravel + react):
✅ İmplementasiya: 2-3 saat
✅ Risk: Aşağı
✅ Test reminder
```

## 📊 TOKEN OPTİMALLAŞDIRMA

### Köhnə yol:
- Bütün fayl oxu: 4000 token
- Context itkisi: yüksək
- Səhv başa düşmə: çox

### Yeni yol (requirements-translator SKILL):
- Progressive Discovery (Grep > Glob > Read): 50-200 token
- Context: dəqiq
- Təsdiq sualları: ambiguity yoxdur
- Supporting docs: glossary, patterns, optimization

**Qənaət**: ~40-60x daha az token!

## ⚙️ KONFIQURASIYA

### Skills (Slash Commands)

Tez-tez istifadə edilən əmrlər:

```bash
/start    # Sistemi başlat
/db       # Database əməliyyatları
/test     # Testləri işə sal
/debug    # Debug və log analizi
```

### Hooks

#### pre-tool-use.sh (ÖNCƏKİ yoxlamalar):
- ✅ Production fayl qorunması
- ✅ Təkrarçılıq yoxlaması
- ✅ Permission dəyişikliyi xəbərdarlığı
- ✅ Migration safety check

#### post-tool-use.sh (SONRAKI proseslər):
- ✅ Auto-format (Prettier, Laravel Pint)
- ✅ Test reminder
- ✅ Git status göstərmə
- ✅ Migration/Seeder xatırlatma

## 🎯 ÖNƏMLİ QEYDLƏR

### 1. Token Qənaət Prioritetdir

Bu sistem **minimal token** istifadə edərək maksimum nəticə verməkçün dizayn edilib:
- ❌ Bütün fayl oxumaq QADAĞANDIR
- ✅ Grep + targeted read
- ✅ Yalnız lazım olan sətirləri oxu

### 2. Təsdiq Almaq MƏCBUR

Claude kod yazmadan öncə **həmişə təsdiq almalıdır**:
- Impact analysis göstərilir
- Suallar verilir
- Plan təsdiqlənir
- Sonra implementasiya

### 3. Production Safety

Sistem production data-nı qoruyur:
- Migration xəbərdarlıqları
- .env fayl qorunması
- Docker-only development
- Rollback plan reminder

### 4. Kod Təkrarçılığını Önləyir

pre-hook avtomatik yoxlayır:
- Oxşar fayl var mı?
- Mövcud komponenti istifadə etmək olar?
- DRY principle tətbiq edilir

## 📚 ƏTRAFLI MƏLUMAT

Hər faylın içində detallı təlimatlar və nümunələr var:

### Skills System:
1. **skills/requirements-translator/SKILL.md**: Main skill definition, workflow
2. **skills/requirements-translator/technical-glossary.md**: 200+ AZ→EN term
3. **skills/requirements-translator/language-patterns.md**: 6 pattern template
4. **skills/requirements-translator/token-optimization.md**: Progressive Discovery strategiyası

### Reference Docs:
5. **atis-permissions-guide.md**: Səhifə-səhifə permission strukturu
6. **atis-impact-analyzer.md**: Real case-lərlə impact analizi

### Commands & Agents:
7. **commands/*.md**: /start, /db, /test, /debug slash commands
8. **agents/*.md**: laravel-expert, react-expert, db-expert, devops-expert

## 🔄 SİSTEM GÜNCELLƏMƏ

Bu sistem inkişaf edir. Yeni pattern-lər əlavə etmək üçün:

1. Yeni agent lazımdır? → `agents/` qovluğuna əlavə et
2. Yeni reference guide? → `references/` qovluğuna əlavə et
3. Yeni skill? → `skills.md`-ə əlavə et

## ✅ FƏRQLİ NEDİR?

| Əvvəl (Vibe Coding) | İndi (Structured) |
|---------------------|-------------------|
| Claude bütün kodu oxuyur | Minimal targeted oxuma |
| 5000+ token | ~200-500 token |
| Böyük dəyişikliklər | Minimal, focused dəyişikliklər |
| Təsdiq yoxdur | Təsdiq MƏCBUR |
| Impact unknown | Impact analysis |
| Permission unutulur | Permission guide var |
| Təkrarçılıq | DRY enforced |

## 🎓 YENİ İSTİFADƏÇİLƏR ÜÇÜN

Claude Code ilə işləyərkən **adi dildə danışın**:

```
✅ "User modalına telefon əlavə et"
✅ "Survey-də export button olsun"
✅ "Task-da məsul şəxs seçilsin"

❌ "UserModal.tsx-da FormField component ilə..."
```

Claude **requirements-translator SKILL** avtomatik aktivləşəcək və hər şeyi başa düşərək sizə təsdiq sualları verəcək!

---

**Versiya**: 2.0 - Skills system əlavə edildi
**Tarix**: 2026-01-10
**Müəllif**: ATİS Development Team

---

## 📝 Changelog

### v2.0 (2026-01-10)
- ✅ **Skills system əlavə edildi**: requirements-translator artıq SKILL (auto-discovery)
- ✅ **Token optimization**: Progressive Discovery ilə 40-60x qənaət
- ✅ **Supporting docs**: technical-glossary, language-patterns, token-optimization
- ✅ **Phase separation**: PLAN (skill) vs IMPLEMENTATION (agents) aydınlaşdırıldı
- ✅ **Archive**: Köhnə agent versiyası arxivə köçürüldü

### v1.0 (2026-01-08)
- ✅ İlk sistem: agents, references, commands, hooks, templates
