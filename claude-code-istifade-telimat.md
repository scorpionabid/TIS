# ATİS Layihəsi üçün Claude Code İstifadə Təlimatı

## 🎯 Ümumi Məlumat

Bu təlimat ATİS layihəsində Claude Code-un quraşdırılmış komponentlərinin praktik istifadəsini əhatə edir. Sizin üçün hazırlanmış:

✅ **4 Specialized Agent**
✅ **2 Avtomatik Hook**  
✅ **MCP Server Konfiqurasiyası**
✅ **4 Custom Slash Command**
✅ **4 Code Template**

---

## 🤖 Agents (AI Köməkçilər)

### 1. Laravel Expert Agent
**İstifadə yeri**: Backend development, API yaratma, database işləri

```bash
# Agents necə çağırılır
/agent laravel-expert "ATİS-də yeni survey module yaratmaq lazımdır"
```

**Nümunə tapşırıqlar:**
- API endpoint yaratma
- Database migration yazma
- Authentication sistem qurma
- Performance optimization

### 2. React Expert Agent  
**İstifadə yeri**: Frontend development, UI komponenti yaratma

```bash
/agent react-expert "Survey response göstərən dashboard komponenti lazımdır"
```

**Nümunə tapşırıqlar:**
- React komponentləri yaratma
- TypeScript type definition
- shadcn/ui komponentləri istifadəsi
- State management (React Query)

### 3. Database Expert Agent
**İstifadə yeri**: Database design, performance, query optimization

```bash
/agent db-expert "ATİS database-də performance problemi var, indexlər yoxlanılsın"
```

### 4. DevOps Expert Agent
**İstifadə yeri**: Docker, deployment, monitoring

```bash
/agent devops-expert "Production deployment strategiyası lazımdır"
```

---

## ⚡ Hooks (Avtomatik Sistem)

### Pre-Tool-Use Hook
**Avtomatik işə düşür**: Hər alət istifadəsindən ƏVVƏL

**Xüsusiyyətlər:**
- ❌ Production fayllar qorunur (.env, docker-compose.yml)
- ❌ Local PHP artisan serve bloklanır (Docker-only mod)
- ✅ TypeScript fayllar ESLint ilə yoxlanılır
- ✅ PHP syntax yoxlanılır

### Post-Tool-Use Hook  
**Avtomatik işə düşür**: Hər alət istifadəsindən SONRA

**Xüsusiyyətlər:**
- 💾 Avtomatik backup yaradılır
- 🧪 React komponenti dəyişdikdə testlər işə düşür
- 🐘 Laravel faylı dəyişdikdə cache təmizlənir
- 📊 Git status göstərilir
- ⏱️ Performance log yaradılır

**Log faylları:**
- `~/.claude/atis-activity.log` - Fəaliyyət logu
- `~/.claude/atis-performance.log` - Performance məlumatları
- `/Users/home/Desktop/ATİS/.claude/backups/` - Avtomatik backup-lar

---

## 🔗 MCP Integration

### Database Server
**ATİS PostgreSQL bazasına birbaşa bağlantı**

```bash
# Nümunə istifadə
"ATİS məlumat bazasında ən aktiv 10 istifadəçini tap və statistikalarını göstər"
"Son həftədə yaradılmış survey-lərin sayını hesabla"
```

### GitHub Server
**GitHub repo inteqrasiyası (token lazımdır)**

```bash
# Token əlavə etmək
# .claude/settings.local.json faylında:
"GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token-here"
```

```bash
# İstifadə nümunəsi  
"GitHub-da ATİS repo-sunda son commit-ləri göstər"
"Issue #123-ü oxu və həll yolları təklif et"
```

---

## ⚡ Slash Commands

### `/atis-start`
**ATİS layihəsini tam başlat və status yoxla**

```bash
/atis-start
```

**Nə edir:**
1. `./stop.sh` - köhnə proseslər dayandırılır
2. `./start.sh` - yeni Docker konteinerlər başladılır
3. Backend/Frontend loglar yoxlanılır  
4. URL testləri aparılır (localhost:3000, localhost:8000)
5. Database bağlantısı test edilir

### `/atis-test`
**Tam test suite işə sal**

```bash
/atis-test
```

**Test növləri:**
- Backend: PHPUnit, Feature tests, Coverage
- Frontend: Jest, TypeScript check, ESLint, Build
- Database: Migration, Seeder tests
- API: Endpoint testləri

### `/atis-db`
**Database idarəetmə əmrləri**

```bash
/atis-db
```

**Xüsusiyyətlər:**
- Migration status və işlədilmə
- Seeder operations  
- Database monitoring
- Backup/Restore əmrləri

### `/atis-debug`
**Problem həlli və debugging**

```bash
/atis-debug
```

**Debug elementləri:**
- Container status yoxlaması
- Log təhlili (backend/frontend)
- Performance debug
- Network/Port yoxlaması
- Emergency commands

---

## 📝 Code Templates

### 1. Laravel Controller Template
**Fayl yeri**: `.claude/templates/laravel-controller.php`

```bash
# İstifadə nümunəsi
"Yeni SurveyController yaratmaq lazımdır. Template istifadə et və ModelName=Survey, modelName=survey dəyiş"
```

**Template xüsusiyyətləri:**
- ✅ Role-based authorization
- ✅ Institution hierarchy filtering  
- ✅ Pagination support
- ✅ Bulk operations
- ✅ ATİS standartlarına uyğun structure

### 2. React Component Template
**Fayl yeri**: `.claude/templates/react-component.tsx`

```bash
# İstifadə nümunəsi  
"SurveyManagement komponenti yarat. React template istifadə et və ComponentName=SurveyManagement dəyiş"
```

**Template xüsusiyyətlər:**
- ✅ TypeScript type safety
- ✅ shadcn/ui komponentləri
- ✅ React Query integration
- ✅ Role-based permissions
- ✅ Responsive design

### 3. Laravel Service Template
**Fayl yeri**: `.claude/templates/laravel-service.php`

**İstifadə**: Business logic separation üçün

### 4. React Service Template  
**Fayl yeri**: `.claude/templates/react-service.ts`

**İstifadə**: API integration və type safety

---

## 🚀 Praktik Ssenarilar

### Ssenario 1: Yeni Feature Development

```bash
# 1. Planning
/agent laravel-expert "ATİS-də teacher performance tracking system lazımdır. Backend API design et"

# 2. Implementation
/agent react-expert "Teacher performance üçün dashboard komponenti yaratmaq lazımdır"

# 3. Testing
/atis-test

# 4. Deployment check
/atis-start
```

### Ssenario 2: Bug Investigation

```bash
# 1. Debug başla
/atis-debug

# 2. Database yoxla
/atis-db

# 3. Agent köməyi
/agent devops-expert "Backend container-də memory leak var kimi görünür. Debug et"
```

### Ssenario 3: Database Operations

```bash
# 1. Migration status
/atis-db

# 2. MCP ilə data analysis  
"ATİS bazasında survey response rate-i necədir? Institution tiplərinə görə qruplaşdır"

# 3. Performance check
/agent db-expert "Survey cədvəlində performance problemi var. Index strategiyası təklif et"
```

---

## ⚙️ Konfiqurasiya Faylları

### Hook konfiqurasiyası aktiv etmək
```json
// .claude/settings.local.json-da
{
  "hooks": {
    "pre-tool-use": "/Users/home/Desktop/ATİS/.claude/hooks/pre-tool-use.sh",
    "post-tool-use": "/Users/home/Desktop/ATİS/.claude/hooks/post-tool-use.sh"
  }
}
```

### MCP token əlavə etmək
```json
// .claude/settings.local.json-da
{
  "mcpServers": {
    "atis-github": {
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

---

## 🔧 Troubleshooting

### Hooks işləmir
```bash
# İcra icazəsi ver
chmod +x /Users/home/Desktop/ATİS/.claude/hooks/*.sh

# Log yoxla
tail -f ~/.claude/atis-activity.log
```

### MCP bağlantı problemi
```bash
# Debug mode
claude --mcp-debug

# Server status
claude mcp list
```

### Agent cavab vermir
```bash
# Agent siyahısı
ls /Users/home/Desktop/ATİS/.claude/agents/

# YAML syntax yoxla
cat .claude/agents/laravel-expert.md
```

---

## 📊 Performance Monitoring

### Log faylları izləmək
```bash
# Fəaliyyət logu
tail -f ~/.claude/atis-activity.log

# Performance logu  
tail -f ~/.claude/atis-performance.log

# Backup qovluğu
ls -la /Users/home/Desktop/ATİS/.claude/backups/
```

### Sistem statusu
```bash
# Docker konteinerlər
docker ps | grep atis

# Port istifadəsi
lsof -ti:8000,8001,8002,3000
```

---

## 🎯 Best Practices

### 1. Agent İstifadəsi
- **Konkret tapşırıq ver**: "Yeni component lazımdır" deyil, "Survey response göstərən tablo komponenti lazımdır"
- **Context ver**: Mövcud koddan nümunələr göstər
- **Role məhdudiyyətlərini qeyd et**: "RegionAdmin səviyyəsində icazələr lazımdır"

### 2. Hooks və Automation
- ❌ Production faylları manual dəyişmə
- ✅ Hooks xəbərdarlıqlarına əməl et  
- ✅ Backup-ları mütəmadi yoxla

### 3. Template İstifadəsi
- Templateləri çox vaxt eyni struktur lazım olanda istifadə et
- Variable adlarını düzgün dəyişdir ({{ModelName}} → Survey)
- ATİS konvensiyalarına uyğunlaşdır

### 4. Debugging  
- Əvvəlcə `/atis-debug` istifadə et
- Agent köməyi almadan əvvəl logları yoxla
- MCP problems üçün `--mcp-debug` flag istifadə et

---

## 📚 Əlavə Məlumatlar

### Faydalı linklər
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code/)
- [MCP Official Docs](https://modelcontextprotocol.io/)
- [ATİS CLAUDE.md](/Users/home/Desktop/ATİS/CLAUDE.md)

### Support
Problemlər halında:
1. Bu təlimatdakı troubleshooting bölməsini yoxla
2. Log fayllarını analiz et  
3. Debug komandlarını işlət
4. GitHub issue yarat (lazım olarsa)

---

*Bu təlimat ATİS layihəsi üçün xüsusi olaraq hazırlanmış Claude Code setup-unun istifadə təlimatıdır. 2025-ci ildə hazırlanmış və ən son xüsusiyyətləri əks etdirir.*