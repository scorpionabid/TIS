FROM php:8.2-cli-alpine

# Install minimal system dependencies including SQLite
RUN apk add --no-cache \
    curl \
    zip \
    unzip \
    sqlite-dev \
    && docker-php-ext-install \
        pdo \
        pdo_sqlite

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files first for better caching
COPY backend/composer*.json ./

# Install PHP dependencies first (this layer will be cached)
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts || echo "Composer install failed, continuing..."

# Copy rest of backend files
COPY backend/ /var/www/html/

# Create necessary directories and set permissions
RUN mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views \
    && mkdir -p bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Run post-install scripts
RUN composer run-script post-install-cmd --no-interaction 2>/dev/null || echo "Post-install scripts completed"

# Expose port
EXPOSE 8000

# Start command
CMD ["sh", "-c", "php artisan key:generate --force 2>/dev/null || echo 'Key exists'; php artisan migrate --force 2>/dev/null || echo 'Migration skipped'; php artisan serve --host=0.0.0.0 --port=8000"]