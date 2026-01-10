#!/bin/bash

# ATİS Layihəsi üçün Pre-Tool-Use Hook
# Bu hook hər alət istifadəsindən əvvəl işə düşür

echo "🔍 Pre-tool hook işə düşdü: $CLAUDE_TOOL"

# Production fayllarının qorunması
if [[ $CLAUDE_FILE_PATH == *".env"* ]] || [[ $CLAUDE_FILE_PATH == *"production"* ]] || [[ $CLAUDE_FILE_PATH == *"docker-compose.yml"* ]]; then
    echo "❌ XƏBƏRDARLIQ: Production və konfiqurasiya faylları təhlükəsiz saxlanılır!"
    echo "   Fayl: $CLAUDE_FILE_PATH"
    echo "   Bu faylı dəyişmək istəyirsinizmi? (y/N):"
    read -r response
    if [[ ! $response =~ ^[Yy]$ ]]; then
        echo "❌ Əməliyyat ləğv edildi"
        exit 1
    fi
fi

# ATİS Docker-only mod yoxlaması
if [[ $CLAUDE_TOOL == "Bash" ]] && [[ $CLAUDE_COMMAND == *"php artisan serve"* ]]; then
    echo "❌ ATİS layihəsində local PHP artisan serve istifadə etmək QADAĞANDIR!"
    echo "   Yalnız Docker istifadə edin: ./start.sh"
    exit 1
fi

if [[ $CLAUDE_TOOL == "Bash" ]] && [[ $CLAUDE_COMMAND == *"npm run dev"* ]] && [[ $PWD != *"/frontend" ]]; then
    echo "❌ Frontend development yalnız Docker container daxilində!"
    echo "   Düzgün əmr: docker exec atis_frontend npm run dev"
    exit 1
fi

# Code duplication check - Yeni komponent yaradılarkən
if [[ $CLAUDE_TOOL == "Write" ]] && [[ $CLAUDE_FILE_PATH == *"components"* ]] || [[ $CLAUDE_FILE_PATH == *"pages"* ]]; then
    echo "🔍 Təkrarçılıq yoxlanılır..."
    filename=$(basename "$CLAUDE_FILE_PATH" .tsx .ts .php)

    # Similar file check
    similar_count=$(find . -name "*$filename*" 2>/dev/null | wc -l)
    if [ "$similar_count" -gt 0 ]; then
        echo "⚠️  Diqqət: '$filename' adlı oxşar fayllar tapıldı ($similar_count ədəd)"
        echo "   Mövcud fayldan istifadə etməyi nəzərdən keçirin."
    fi
fi

# Permission check reminder - Permission ilə bağlı fayllar dəyişəndə
if [[ $CLAUDE_FILE_PATH == *"Permission"* ]] || [[ $CLAUDE_FILE_PATH == *"permission"* ]] || [[ $CLAUDE_FILE_PATH == *"Role"* ]]; then
    echo "🔐 XATIRLATMA: Permission/Role dəyişikliyi!"
    echo "   - Cache clear lazım ola bilər: php artisan permission:cache-reset"
    echo "   - Seeder update: PermissionSeeder.php"
    echo "   - Frontend permission hooks update lazım ola bilər"
fi

# Migration safety check
if [[ $CLAUDE_TOOL == "Write" ]] && [[ $CLAUDE_FILE_PATH == *"migrations"* ]]; then
    echo "🗄️  XƏBƏRDARLIQ: Migration faylı yaradılır!"
    echo "   - Development-də test edin: php artisan migrate:fresh"
    echo "   - Production-da rollback planı hazırlayın"
    echo "   - Əgər data loss riski varsa, backup alın!"
fi

# Code style yoxlaması (TypeScript/React fayllar üçün)
if [[ $CLAUDE_TOOL == "Edit" || $CLAUDE_TOOL == "Write" || $CLAUDE_TOOL == "MultiEdit" ]] && [[ $CLAUDE_FILE_PATH == *.tsx || $CLAUDE_FILE_PATH == *.ts ]]; then
    echo "📝 TypeScript code style yoxlanılır..."
    # Əgər eslint mövcudsa, istifadə et
    if command -v npx >/dev/null 2>&1 && [ -f "frontend/package.json" ]; then
        cd frontend && npx eslint "$CLAUDE_FILE_PATH" --fix 2>/dev/null || echo "⚠️  ESLint xətası, davam edilir..."
        cd - >/dev/null
    fi
fi

# PHP fayllar üçün syntax yoxlaması
if [[ $CLAUDE_TOOL == "Edit" || $CLAUDE_TOOL == "Write" ]] && [[ $CLAUDE_FILE_PATH == *.php ]]; then
    echo "🐘 PHP syntax yoxlanılır..."
    if command -v php >/dev/null 2>&1; then
        php -l "$CLAUDE_FILE_PATH" 2>/dev/null || echo "⚠️  PHP syntax xətası ola bilər"
    fi
fi

echo "✅ Pre-tool hook tamamlandı"