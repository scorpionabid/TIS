# ATİS Skills & Commands Sistemi

ATİS layihəsində iki növ köməkçi sistem mövcuddur: **Skills** (avtomatik) və **Commands** (manual).

---

## 🎯 Skills vs Commands - Fərq Nədir?

| Aspekt | **Skills** | **Commands** |
|--------|-----------|--------------|
| **Aktivləşmə** | Avtomatik (Claude özü aşkar edir) | Manual (`/command` yazmaq lazım) |
| **İstifadə halı** | Kompleks workflow, team standartları | Tez-tez istifadə olunan təkrar əməliyyatlar |
| **Fayl strukturu** | Directory + supporting files | Tək `.md` fayl |
| **Nümunə** | "Survey-ə export button qoy" → Claude avtomatik **requirements-translator** skill istifadə edir | `/start` yazanda sistem başlayır |

---

## 🎓 SKILLS (Avtomatik Discovery)

Skills Claude tərəfindən avtomatik aşkar edilir və kontekstə uyğun istifadə olunur.

### 📋 requirements-translator

**Təsvir**: İstifadəçinin sadə Azərbaycan dilində yazdığı tələbləri texniki spesifikasiyaya çevirir.

**Avtomatik aktivləşir:**
- Azərbaycan dilində yazanda ("düymə əlavə et", "səhifə yarat")
- Texniki olmayan dil istifadə edəndə
- Entity + action pattern-ləri ("survey export", "user filter")

**Token optimizasyonu:**
- Minimal token istifadə edir (Grep → targeted Read)
- Bütün fayl oxumaq əvəzinə smart search (40-60x qənaət)
- Progressive discovery strategiyası

**İş axını:**
```
1. Sadə dil → Texniki tərcümə (AZ → EN)
2. Minimal search (Grep > Glob > Read)
3. Texniki plan hazırla
4. Impact analysis
5. Təsdiq sualları (AZ dilində)
6. İstifadəçi təsdiq edəndə → Expert agentlərə devrə
```

**Nümunə:**
```
Siz: "Survey səhifəsinə excel export düyməsi əlavə et"

Claude (requirements-translator):
🔍 ANALİZ:
- Səhifə: frontend/src/pages/surveys/SurveyList.tsx
- Mövcud export: YOX
- Permission: "survey.export" (yaratmalı)

📋 TEXNİKİ TƏLƏB:
[Detallı plan...]

❓ TƏSDİQ SUALLARI:
1. Export bütün surveyləri yoxsa seçilmişləri?
2. Institution hierarchy filter?
3. Background job lazımdır?

Siz: "Bəli, davam et"

Claude: ✅ Plan təsdiqləndi. Expert agentlərə keçirirəm:
@laravel-expert → Backend implementation
@react-expert → Frontend implementation
```

**Supporting files:**
- `technical-glossary.md` - AZ → EN texniki lüğət
- `language-patterns.md` - Natural language pattern-ləri
- `token-optimization.md` - Token qənaət strategiyaları

**Location:** `.claude/skills/requirements-translator/`

---

## ⚡ SLASH COMMANDS (Manual Invocation)

Tez-tez istifadə olunan manual əmrlər. Siz `/command` yazaraq çağırırsınız.

### /start
**Təsvir**: ATİS Docker sistemini başlat və sağlamlıq yoxlaması et
**Agent**: `atis-start`
**İstifadə**: Sistem başlatma, port konfliktlərinin həlli, health check

```bash
/start
```

---

### /db
**Təsvir**: Database əməliyyatları - migration, seed, reset
**Agent**: `atis-db`
**İstifadə**: Database dəyişiklikləri, test data yaratma

```bash
/db fresh    # Fresh migration + seed
/db migrate  # Run migrations
/db seed     # Seed database
```

---

### /test
**Təsvir**: Backend və frontend testlərini işə sal
**Agent**: `atis-test`
**İstifadə**: Quality assurance, regression testing

```bash
/test backend   # PHPUnit tests
/test frontend  # Jest/Vitest tests
/test all       # Bütün testlər
```

---

### /debug
**Təsvir**: Sistem debug və log analizi
**Agent**: `atis-debug`
**İstifadə**: Error debugging, performance profiling

```bash
/debug backend   # Laravel logs
/debug frontend  # Browser console errors
```

---

## 💡 NƏ ZAMAN NƏ İSTİFADƏ EDİLİR?

### ✅ Skills istifadə edin (avtomatik):
- "Survey-ə export button qoy" → requirements-translator
- "Task table-ı təkmilləşdir" → requirements-translator
- "Permission filter əlavə et" → requirements-translator
- Sadə dildə feature request → requirements-translator

### ✅ Commands istifadə edin (manual):
- `/start` → Sistem başlat
- `/db fresh` → Database yenilə
- `/test backend` → Testləri işə sal
- `/debug` → Log analizi

---

## 📂 Fayl Strukturu

```
TIS/.claude/
├── skills/                          # 🆕 Avtomatik Skills
│   └── requirements-translator/
│       ├── SKILL.md                 # Main skill definition
│       ├── technical-glossary.md    # AZ → EN lüğət
│       ├── language-patterns.md     # NLP pattern-ləri
│       └── token-optimization.md    # Qənaət strategiyaları
│
├── commands/                        # ⚡ Manual Commands
│   ├── atis-start.md
│   ├── atis-db.md
│   ├── atis-test.md
│   └── atis-debug.md
│
├── agents/                          # 🤖 Expert Agents
│   ├── laravel-expert.md            # Backend implementation
│   ├── react-expert.md              # Frontend implementation
│   ├── db-expert.md                 # Database operations
│   └── devops-expert.md             # DevOps operations
│
└── references/                      # 📚 Reference Docs
    ├── atis-permissions-guide.md
    └── atis-impact-analyzer.md
```

---

## 🔄 Tipik Workflow

```
İSTİFADƏÇİ: "Survey səhifəsinə export düyməsi əlavə et"
         ↓
SKILL (requirements-translator) avtomatik aktivləşir
         ↓
1. Minimal search (25-50 token)
2. Texniki tərcümə (AZ → EN)
3. Plan hazırla + Impact analysis
4. Təsdiq sualları
         ↓
İSTİFADƏÇİ: "Bəli, davam et"
         ↓
EXPERT AGENTS implementation
         ├─ @laravel-expert → Backend kod
         └─ @react-expert → Frontend kod
         ↓
✅ Implementation tamamlandı
```

---

## 📊 Token Optimization - Əsas Prinsiplər

### ❌ Əvvəl (Skills yoxdur)
```
Claude bütün faylları oxuyur = 5000+ token
Texniki olmayan dil başa düşülmür
Plan yox, birbaşa kod yazır
```

### ✅ İndi (Skills ilə)
```
requirements-translator:
1. Smart search = 50-100 token (50x qənaət!)
2. AZ → EN avtomatik tərcümə
3. Plan → Təsdiq → Implementation
4. Expert agents specific kod yazır
```

---

## 📋 Növbəti Addımlar

### Phase 1: ✅ TAMAMLANDI
- requirements-translator skill yaradıldı
- Token optimization strategiyası
- Supporting documentation

### Phase 2: Gələcək (Optional)
- `atis-guide` skill - Mini architecture guide
- `security-check` skill - Basic OWASP validation
- `code-review` skill - Code quality automation

---

## 🎓 Ətraflı Məlumat

**Skills haqqında:**
- `.claude/skills/requirements-translator/SKILL.md`
- Claude Code documentation: https://code.claude.com/docs/en/skills

**Commands haqqında:**
- `.claude/commands/*.md`
- Claude Code documentation: https://code.claude.com/docs/en/slash-commands

**Agents haqqında:**
- `.claude/agents/*.md`
- Bu agentlər skills və commands tərəfindən çağırılır

---

## ❓ FAQ

**Q: Niyə bəzi şeylər skill, bəzisi command?**
A: Skill = Claude özü qərar verir nə zaman lazımdır (smart)
Command = Siz manual çağırırsınız (tez əməliyyatlar)

**Q: requirements-translator harda istifadə olunur?**
A: Hər dəfə sadə dildə feature request yazdıqda avtomatik

**Q: Token qənaətini necə ölçürəm?**
A: `/context` command ilə token istifadəsini izləyin

**Q: Yeni skill necə yaradım?**
A: `.claude/skills/new-skill/SKILL.md` yarat və YAML frontmatter əlavə et

---

**Son yeniləmə:** 2026-01-10
**Versiya:** 1.0 - requirements-translator skill əlavə edildi
