#!/bin/bash

# ATİS Layihəsi üçün Post-Tool-Use Hook
# Bu hook hər alət istifadəsindən sonra işə düşür

echo "🔧 Post-tool hook işə düşdü: $CLAUDE_TOOL"

# Fayl yolu və alət məlumatlarını log et
echo "$(date): $CLAUDE_TOOL -> $CLAUDE_FILE_PATH" >> ~/.claude/atis-activity.log

# Backup yaradılması (mühüm fayllar üçün)
if [[ $CLAUDE_TOOL == "Edit" || $CLAUDE_TOOL == "Write" || $CLAUDE_TOOL == "MultiEdit" ]] && [[ -n $CLAUDE_FILE_PATH ]]; then
    # Backup qovluğu yaradılması
    BACKUP_DIR="/Users/home/Desktop/ATİS/.claude/backups"
    mkdir -p "$BACKUP_DIR"
    
    # Fayl mövcudsa backup et
    if [[ -f "$CLAUDE_FILE_PATH" ]]; then
        BACKUP_NAME=$(basename "$CLAUDE_FILE_PATH").backup.$(date +%Y%m%d_%H%M%S)
        cp "$CLAUDE_FILE_PATH" "$BACKUP_DIR/$BACKUP_NAME"
        echo "💾 Backup yaradıldı: $BACKUP_NAME"
    fi
fi

# TypeScript/React fayllar üçün avtomatik test işə salınması
if [[ $CLAUDE_TOOL == "Edit" && $CLAUDE_FILE_PATH == *.tsx ]]; then
    echo "🧪 React komponenti üçün testlər yoxlanılır..."
    
    # Test faylının mövcudluğunu yoxla
    TEST_FILE="${CLAUDE_FILE_PATH%.tsx}.test.tsx"
    if [[ -f "$TEST_FILE" ]]; then
        echo "✅ Test faylı mövcuddur: $TEST_FILE"
        # Docker container daxilində test işə sal
        if docker ps | grep -q "atis_frontend"; then
            echo "🏃 Testlər işə salınır..."
            docker exec atis_frontend npm test -- --testPathPattern="$TEST_FILE" --watchAll=false 2>/dev/null || echo "⚠️  Test xətası və ya mövcud deyil"
        fi
    else
        echo "⚠️  Test faylı yoxdur: $TEST_FILE"
        echo "💡 Test faylı yaratmaq üçün: /agent react-expert 'Bu komponent üçün test yaz'"
    fi
fi

# Laravel controller və ya model dəyişiklik halında
if [[ $CLAUDE_TOOL == "Edit" && ($CLAUDE_FILE_PATH == *"Controller.php" || $CLAUDE_FILE_PATH == *"/Models/"*) ]]; then
    echo "🐘 Laravel backend dəyişikliyi aşkarlandı"
    
    # Backend testləri işə sal
    if docker ps | grep -q "atis_backend"; then
        echo "🧪 Backend testləri işə salınır..."
        docker exec atis_backend php artisan test --stop-on-failure 2>/dev/null || echo "⚠️  Backend test xətası"
        
        # Cache təmizlənməsi
        echo "🧹 Cache təmizlənir..."
        docker exec atis_backend php artisan config:clear 2>/dev/null
        docker exec atis_backend php artisan route:clear 2>/dev/null
    fi
fi

# Database migration faylları üçün xəbərdarlıq
if [[ $CLAUDE_TOOL == "Write" && $CLAUDE_FILE_PATH == *"database/migrations"* ]]; then
    echo "🗄️  Yeni migration aşkarlandı!"
    echo "💡 Migration işə salmaq üçün: docker exec atis_backend php artisan migrate"
    echo "⚠️  Production mühitində ehtiyatlı olun!"
fi

# Git status yoxlaması (dəyişikliklərdən sonra)
if [[ $CLAUDE_TOOL == "Edit" || $CLAUDE_TOOL == "Write" || $CLAUDE_TOOL == "MultiEdit" ]]; then
    if command -v git >/dev/null 2>&1 && [ -d ".git" ]; then
        echo "📊 Git status:"
        git status --porcelain 2>/dev/null | head -5
        
        # Çoxlu dəyişiklik halında xəbərdarlıq
        CHANGED_FILES=$(git status --porcelain 2>/dev/null | wc -l)
        if [[ $CHANGED_FILES -gt 10 ]]; then
            echo "⚠️  $CHANGED_FILES fayl dəyişib - commit etməyi unudmayın!"
        fi
    fi
fi

# Auto-format TypeScript/React files after edit
if [[ $CLAUDE_TOOL == "Edit" || $CLAUDE_TOOL == "Write" ]] && [[ $CLAUDE_FILE_PATH == *.tsx || $CLAUDE_FILE_PATH == *.ts ]] && [[ $CLAUDE_FILE_PATH == *"frontend"* ]]; then
    echo "✨ Auto-formatting TypeScript file..."
    if command -v npx >/dev/null 2>&1 && [ -f "frontend/package.json" ]; then
        cd frontend && npx prettier --write "$(basename $CLAUDE_FILE_PATH)" 2>/dev/null && echo "✅ Prettier formatting tamamlandı" || echo "⚠️  Prettier xətası"
        cd - >/dev/null
    fi
fi

# Permission/Role seeder changed - remind cache clear
if [[ $CLAUDE_FILE_PATH == *"PermissionSeeder"* ]] || [[ $CLAUDE_FILE_PATH == *"RoleSeeder"* ]]; then
    echo ""
    echo "🔐 PERMISSION/ROLE SEEDER DƏYİŞDİ!"
    echo "   Növbəti addımlar:"
    echo "   1. Seed: docker exec atis_backend php artisan db:seed --class=$(basename $CLAUDE_FILE_PATH .php)"
    echo "   2. Cache: docker exec atis_backend php artisan permission:cache-reset"
    echo ""
fi

# Performance monitoring
EXECUTION_TIME=$(($(date +%s%N)/1000000))
echo "⏱️  Alət icra müddəti: ${EXECUTION_TIME}ms" >> ~/.claude/atis-performance.log

echo "✅ Post-tool hook tamamlandı"