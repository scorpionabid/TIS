FROM php:8.3-cli-alpine

# Install system dependencies including SQLite, GD and ZIP
RUN apk add --no-cache \
    curl \
    zip \
    unzip \
    sqlite-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo \
        pdo_sqlite \
        gd \
        zip

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy all backend files including vendor directory
COPY backend/ /var/www/html/

# Ensure composer dependencies are available
RUN if [ ! -d "/var/www/html/vendor" ]; then \
        composer install --no-dev --optimize-autoloader --no-interaction --no-scripts; \
    fi

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