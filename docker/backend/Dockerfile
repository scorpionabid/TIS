FROM php:8.3-cli-alpine

# Install system dependencies including PostgreSQL, SQLite, GD, ZIP and Redis
RUN apk add --no-cache \
    curl \
    zip \
    unzip \
    postgresql-dev \
    sqlite-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    supervisor \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        pdo_sqlite \
        gd \
        zip

# Install Redis extension (Phase 2A: Redis tagged caching)
RUN apk add --no-cache autoconf g++ make \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del autoconf g++ make

# Configure PHP upload settings for document management
RUN echo "upload_max_filesize = 100M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/uploads.ini

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy all backend files including vendor directory
COPY backend/ /var/www/html/

# Ensure composer dependencies are available (with dev packages for local development)
RUN if [ ! -d "/var/www/html/vendor" ]; then \
        composer install --optimize-autoloader --no-interaction --no-scripts; \
    fi

# Create necessary directories and set permissions
RUN mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views \
    && mkdir -p bootstrap/cache \
    && mkdir -p public \
    && chmod -R 775 storage bootstrap/cache public

# Run post-install scripts
RUN composer run-script post-install-cmd --no-interaction 2>/dev/null || echo "Post-install scripts completed"

# Create .env file with proper configuration
RUN echo 'APP_NAME="ATIS"' > /var/www/html/.env \
    && echo 'APP_ENV=local' >> /var/www/html/.env \
    && echo 'APP_KEY=base64:IcNxbQiy6sWLjfrgaSlGkm4S2utYBz+DXj4u/Rt7g0k=' >> /var/www/html/.env \
    && echo 'APP_DEBUG=true' >> /var/www/html/.env \
    && echo 'APP_URL=http://localhost:8000' >> /var/www/html/.env \
    && echo '' >> /var/www/html/.env \
    && echo 'DB_CONNECTION=pgsql' >> /var/www/html/.env \
    && echo 'DB_HOST=atis_postgres' >> /var/www/html/.env \
    && echo 'DB_PORT=5432' >> /var/www/html/.env \
    && echo 'DB_DATABASE=atis_dev' >> /var/www/html/.env \
    && echo 'DB_USERNAME=atis_dev_user' >> /var/www/html/.env \
    && echo 'DB_PASSWORD=atis_dev_pass_123' >> /var/www/html/.env \
    && echo '' >> /var/www/html/.env \
    && echo 'REDIS_HOST=atis_redis' >> /var/www/html/.env \
    && echo 'REDIS_PORT=6379' >> /var/www/html/.env \
    && echo '' >> /var/www/html/.env \
    && echo 'CACHE_DRIVER=redis' >> /var/www/html/.env \
    && echo 'SESSION_DRIVER=file' >> /var/www/html/.env \
    && echo 'QUEUE_CONNECTION=sync' >> /var/www/html/.env \
    && echo 'BROADCAST_DRIVER=log' >> /var/www/html/.env

# Copy supervisor configuration
COPY docker/backend/supervisord.conf /etc/supervisord.conf

# Create ForceCors middleware to fix CORS issues
RUN mkdir -p /var/www/html/app/Http/Middleware \
    && cat > /var/www/html/app/Http/Middleware/ForceCors.php << 'EOF'
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceCors
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 200);
        } else {
            $response = $next($request);
        }

        $response->headers->set('Access-Control-Allow-Origin', 'http://localhost:3000');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
        $response->headers->set('Access-Control-Allow-Headers', '*');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}
EOF

# Fix bootstrap/app.php to use ForceCors instead of HandleCors
RUN sed -i 's/\\Illuminate\\Http\\Middleware\\HandleCors::class/\\App\\Http\\Middleware\\ForceCors::class/g' /var/www/html/bootstrap/app.php

# Expose port
EXPOSE 8000

# Start with supervisor (manages serve + queue worker + scheduler)
CMD ["sh", "-c", "php artisan config:clear; php artisan cache:clear; php artisan key:generate --force 2>/dev/null || echo 'Key exists'; php artisan migrate --force 2>/dev/null || echo 'Migration skipped'; supervisord -c /etc/supervisord.conf"]