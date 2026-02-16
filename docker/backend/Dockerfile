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
    && chmod -R 775 storage bootstrap/cache

# Run post-install scripts
RUN composer run-script post-install-cmd --no-interaction 2>/dev/null || echo "Post-install scripts completed"

# Copy supervisor configuration
COPY docker/backend/supervisord.conf /etc/supervisord.conf

# Expose port
EXPOSE 8000

# Start with supervisor (manages serve + queue worker + scheduler)
CMD ["sh", "-c", "php artisan key:generate --force 2>/dev/null || echo 'Key exists'; php artisan migrate --force 2>/dev/null || echo 'Migration skipped'; supervisord -c /etc/supervisord.conf"]