# Claude Code Səmərəli İstifadə Təlimatları

## 🚀 Giriş

Claude Code - Anthropic tərəfindən təklif edilən güclü AI-powered development CLI alətidir. Bu təlimat sizə Claude Code-un hooks, MCP (Model Context Protocol), və agents xüsusiyyətlərindən maksimum faydalanmağı öyrədəcək.

## 🛠 Əsas Komponentlər

### 1. Hooks (Hook Sistemi)

#### Hooks Nədir?
Hooks - Claude Code-un müxtəlif mərhələlərində avtomatik işə düşən shell komandalarıdır. Bu sistemlə sizin development workflow-unuzu avtomatlaşdıra bilərsiniz.

#### Hook Növləri:
- **PreToolUse**: Alət istifadə edilməzdən əvvəl işə düşür (blok edə bilər)
- **PostToolUse**: Alət istifadəsindən sonra işə düşür
- **UserPromptSubmit**: User prompt göndərildikdən sonra işə düşür
- **Notification**: Bildiriş göndərildikdə işə düşür

#### Praktik İstifadə Nümunələri:

**1. Code Convention Yoxlaması:**
```bash
# ~/.claude/hooks/pre-tool-use.sh
#!/bin/bash
if [[ $CLAUDE_TOOL == "Edit" || $CLAUDE_TOOL == "Write" ]]; then
    echo "Code style yoxlanılır..."
    npx eslint $CLAUDE_FILE_PATH --fix
fi
```

**2. Avtomatik Test İşlədilməsi:**
```bash
# ~/.claude/hooks/post-tool-use.sh
#!/bin/bash
if [[ $CLAUDE_TOOL == "Edit" && $CLAUDE_FILE_PATH == *.tsx ]]; then
    echo "Tests işə salınır..."
    npm test -- --related $CLAUDE_FILE_PATH
fi
```

**3. Production Fayllarının Qorunması:**
```bash
# ~/.claude/hooks/pre-tool-use.sh
#!/bin/bash
if [[ $CLAUDE_FILE_PATH == *production* || $CLAUDE_FILE_PATH == *.env ]]; then
    echo "❌ Production faylları dəyişdirilə bilməz!"
    exit 1
fi
```

### 2. MCP (Model Context Protocol)

#### MCP Nədir?
MCP - Claude Code-u xarici alətlər və məlumat mənbələri ilə birləşdirən açıq standartdır. "AI üçün USB-C" kimi düşünə bilərsiniz.

#### Konfiqurasiya Yerləri:
- **Layihə səviyyəsində**: `.claude/settings.local.json`
- **User səviyyəsində**: `~/.claude/settings.local.json`
- **Komanda üçün**: `.mcp.json` (git-ə commit edilir)

#### ATİS Layihəsi üçün Tövsiyə edilən MCP Serverlər:

**1. GitHub Integration:**
```json
{
  "mcp": {
    "servers": {
      "github": {
        "command": "npx",
        "args": ["@mcp/github"],
        "env": {
          "GITHUB_TOKEN": "your-token"
        }
      }
    }
  }
}
```

**2. PostgreSQL Məlumat Bazası:**
```json
{
  "postgresql": {
    "command": "npx",
    "args": ["@mcp/postgresql"],
    "env": {
      "POSTGRES_CONNECTION_STRING": "postgresql://localhost:5432/atis_db"
    }
  }
}
```

**3. Slack Integration (Komanda Əlaqəsi):**
```json
{
  "slack": {
    "command": "npx",
    "args": ["@mcp/slack"],
    "env": {
      "SLACK_BOT_TOKEN": "your-bot-token"
    }
  }
}
```

#### MCP ilə Praktik Ssenarilar:

**1. Issue-dan Feature Yaratma:**
```
"GitHub-da ATIS-123 issue-sındakı feature-ı implement et və PR yarat"
```

**2. Məlumat Bazası Analizi:**
```
"Atis məlumat bazasında ən aktiv 10 istifadəçini tap və onların statistikasını göstər"
```

**3. Monitoring və Debugging:**
```
"Son 24 saatda backend-də olan errorları Sentry-dən yoxla və həll yolları təklif et"
```

### 3. Agents/Subagents Sistemi

#### Agents Nədir?
Agents - Claude Code daxilində fərqli tapşırıqlar üçün ixtisaslaşmış AI köməkçilərdir. Hər birinin öz kontekst pəncərəsi, sistem prompt-u və alət icazələri var.

#### Agent Konfiqurasiyası:

**Struktur:**
```markdown
---
name: laravel-expert
description: Laravel backend development və debugging üçün expert
tools: Read, Write, Edit, Bash, Grep
---

Sən Laravel 11 və PHP 8.2 expertisən. ATİS layihəsində:
- Laravel best practice-lərini tətbiq et
- Eloquent relationships-ları optimallaşdır  
- API endpoint-lərini RESTful standartda yarat
- Security vulnerability-lərini yoxla
- Performance optimization-ları təklif et
```

#### ATİS üçün Tövsiyə edilən Agents:

**1. Laravel Backend Expert (.claude/agents/laravel-expert.md):**
```markdown
---
name: laravel-expert
description: Laravel backend işləri, API yaratma, database migration
tools: Read, Write, Edit, Bash, Grep, Glob
---

Laravel 11 və PHP 8.2 expert kimi:
- Sanctum authentication implement et
- RESTful API endpoints yarat
- Eloquent model relationships-ları qur
- Database migration-ları hazırla
- Validation rules yazma
- Permission-based access control
```

**2. React Frontend Expert (.claude/agents/react-expert.md):**
```markdown
---
name: react-expert
description: React, TypeScript və Tailwind CSS frontend development
tools: Read, Write, Edit, Bash, Grep, Glob
---

React 18.3.1, TypeScript 5.5.3 və Tailwind CSS expert:
- shadcn/ui komponentlərindən istifadə et
- TypeScript type safety təmin et
- Responsive design prinsiplərini tətbiq et
- React Query ilə state management
- Performance optimization-ları
```

**3. DevOps Expert (.claude/agents/devops-expert.md):**
```markdown
---
name: devops-expert
description: Docker, CI/CD və deployment məsələləri
tools: Read, Write, Edit, Bash
---

DevOps expert kimi:
- Docker container-ları optimize et
- docker-compose.yml fayllarını düzəlt
- Production deployment strategiyaları
- Performance monitoring setup
- Security best practices
```

**4. Database Expert (.claude/agents/db-expert.md):**
```markdown
---
name: db-expert
description: PostgreSQL və database design expertise
tools: Read, Write, Edit, Bash, mcp__postgresql
---

Database expert kimi:
- PostgreSQL query optimization
- Index strategiyaları
- Migration-lar yazma
- Data modeling
- Performance analysis
```

## 🎯 ATİS Layihəsi üçün Xüsusi Workflow-lar

### 1. Feature Development Workflow

**Step 1: Planning**
```
/agent laravel-expert "ATİS-də yeni survey targeting system yaratmaq lazımdır. Backend API design et"
```

**Step 2: Implementation**
```
/agent react-expert "Survey targeting üçün frontend komponenti yarat və backend API ilə inteqrasiya et"
```

**Step 3: Testing**
```
"Həm backend həm frontend testlərini yaz və işə sal"
```

### 2. Bug Fix Workflow

**Hooks ilə avtomatik debugging:**
```bash
# ~/.claude/hooks/error-analysis.sh
#!/bin/bash
if [[ $USER_MESSAGE == *"error"* || $USER_MESSAGE == *"bug"* ]]; then
    echo "🔍 Error log-ları yoxlanılır..."
    tail -n 50 /var/log/atis/backend.log
    echo "📊 Database status yoxlanılır..."
    docker exec atis_backend php artisan queue:work --once
fi
```

### 3. Code Review Workflow

**Post-commit hook:**
```bash
# ~/.claude/hooks/post-tool-use.sh
#!/bin/bash
if [[ $CLAUDE_TOOL == "Edit" ]]; then
    echo "📝 Code review aparılır..."
    /agent code-reviewer "$CLAUDE_FILE_PATH faylını review et və improvement təklif et"
fi
```

## 🔧 Qabaqcıl Konfiqurasiya

### Custom Slash Commands

**ATİS əmrləri yaradın (.claude/commands/ qovluğunda):**

**1. /atis-start.md:**
```markdown
---
name: atis-start
description: ATİS layihəsini başlat
---

ATİS layihəsini Docker ilə başlat:
1. ./stop.sh əmri ilə mövcud prosesləri dayandır
2. ./start.sh əmri ilə yeni konteinerlər başlat
3. Backend və frontend log-larını yoxla
4. http://localhost:3000 və http://localhost:8000 URL-lərini test et
```

**2. /atis-test.md:**
```markdown
---
name: atis-test
description: ATİS testlərini işə sal
---

ATİS layihəsi üçün tam test suite-i işə sal:
1. Backend testləri: docker exec atis_backend php artisan test
2. Frontend testləri: docker exec atis_frontend npm test
3. E2E testləri: npm run cypress:run
4. Test coverage hesabla
```

### Environment-Specific Configuration

**Development environment:**
```json
{
  "mcp": {
    "servers": {
      "local-db": {
        "command": "npx",
        "args": ["@mcp/postgresql"],
        "env": {
          "POSTGRES_CONNECTION_STRING": "postgresql://localhost:5432/atis_dev"
        }
      }
    }
  },
  "hooks": {
    "pre-tool-use": "~/.claude/hooks/dev-pre.sh",
    "post-tool-use": "~/.claude/hooks/dev-post.sh"
  }
}
```

## 📊 Performance və Monitoring

### Token Usage Optimization

**MCP output limit:**
```bash
export MAX_MCP_OUTPUT_TOKENS=15000
```

**Agent context management:**
- Hər agent üçün ayrı context window
- Uzun tapşırıqları kiçik hissələrə bölün
- Relevant tools-only configuration

### Monitoring Hooks

**Performance tracking:**
```bash
# ~/.claude/hooks/performance-monitor.sh
#!/bin/bash
echo "⏱️  Execution time: $(date)" >> ~/.claude/performance.log
echo "🔧 Tool: $CLAUDE_TOOL" >> ~/.claude/performance.log
echo "📁 File: $CLAUDE_FILE_PATH" >> ~/.claude/performance.log
echo "---" >> ~/.claude/performance.log
```

## 🚨 Təhlükəsizlik və Best Practices

### 1. Sensitive Data Protection

**Hooks ilə protection:**
```bash
# ~/.claude/hooks/security-check.sh
#!/bin/bash
if [[ $CLAUDE_CONTENT == *"password"* ]] || [[ $CLAUDE_CONTENT == *"secret"* ]]; then
    echo "⚠️  Sensitive data detected! Operation blocked."
    exit 1
fi
```

### 2. Access Control

**Agent permissions:**
```markdown
---
name: readonly-agent
description: Yalnız oxuma icazəsi olan agent
tools: Read, Grep, Glob
---
```

### 3. Backup və Versioning

**Avtomatik backup hook:**
```bash
# ~/.claude/hooks/backup.sh
#!/bin/bash
if [[ $CLAUDE_TOOL == "Write" || $CLAUDE_TOOL == "Edit" ]]; then
    cp "$CLAUDE_FILE_PATH" "$CLAUDE_FILE_PATH.backup.$(date +%s)"
fi
```

## 🎁 Bonus: ATİS-specific Templates

### Laravel Controller Template

**.claude/templates/controller.php:**
```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class {{ControllerName}}Controller extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', {{Model}}::class);
        
        $data = {{Model}}::whereHas('institution', function ($query) {
            $query->where('id', auth()->user()->institution_id);
        })->paginate(15);
        
        return response()->json($data);
    }
    
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', {{Model}}::class);
        
        $validated = $request->validate([
            // validation rules
        ]);
        
        $model = {{Model}}::create($validated);
        
        return response()->json($model, 201);
    }
}
```

### React Component Template

**.claude/templates/component.tsx:**
```typescript
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {{ServiceName}} } from '@/services/{{serviceName}}';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface {{ComponentName}}Props {
  // props interface
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = () => {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['{{queryKey}}'],
    queryFn: {{ServiceName}}.getAll,
  });
  
  const mutation = useMutation({
    mutationFn: {{ServiceName}}.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['{{queryKey}}'] });
    },
  });
  
  if (isLoading) return <div>Yüklənir...</div>;
  if (error) return <div>Xəta: {error.message}</div>;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{{ComponentName}}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
};
```

## 📚 Əlavə Resurslar

### Community Agents Collection
- **GitHub**: [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- **100+ production-ready agents**
- **Full-stack development, DevOps, data science**

### Useful Commands

**Debug mode:**
```bash
claude --mcp-debug
```

**Configuration check:**
```bash
claude config list
```

**MCP server status:**
```bash
claude mcp list
```

## 🎯 Nəticə

Claude Code-un hooks, MCP və agents xüsusiyyətlərindən düzgün istifadə etməklə:

✅ Development workflow-unuzu tam avtomatlaşdıra bilərsiniz
✅ Xarici sistem və alətlərlə inteqrasiya qura bilərsiniz  
✅ İxtisaslaşmış AI köməkçiləri yarada bilərsiniz
✅ Code quality və security-ni avtomatik olaraq təmin edə bilərsiniz
✅ Team collaboration-unu gücləndir bilərsiniz

Bu təlimatları ATİS layihənizdə tətbiq edərək development prosesini əhəmiyyətli dərəcədə sürətləndirə və keyfiyyət artıra bilərsiniz.

---

*Bu təlimat 2025-ci il üçün hazırlanmış olub və ən son Claude Code xüsusiyyətlərini əks etdirir. Yeniliklər barədə məlumat almaq üçün [Anthropic Documentation](https://docs.anthropic.com/en/docs/claude-code/) səhifəsini izləyin.*