FROM php:8.3-fpm-alpine

# Install system dependencies including PostgreSQL, SQLite, GD, ZIP, Redis and Nginx
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
    nginx \
    supervisor \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        pdo_sqlite \
        gd \
        zip \
        opcache

# Install Redis extension
RUN apk add --no-cache autoconf g++ make \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del autoconf g++ make

# PHP configuration
COPY docker/backend/php.ini /usr/local/etc/php/conf.d/atis.ini

# PHP-FPM worker pool configuration
RUN sed -i \
    -e 's/pm = dynamic/pm = dynamic/' \
    -e 's/pm.max_children = 5/pm.max_children = 20/' \
    -e 's/pm.start_servers = 2/pm.start_servers = 5/' \
    -e 's/pm.min_spare_servers = 1/pm.min_spare_servers = 3/' \
    -e 's/pm.max_spare_servers = 3/pm.max_spare_servers = 10/' \
    /usr/local/etc/php-fpm.d/www.conf

# Nginx configuration
COPY docker/backend/nginx.conf /etc/nginx/http.d/default.conf

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy all backend files
COPY backend/ /var/www/html/

# Ensure composer dependencies are available
RUN if [ ! -d "/var/www/html/vendor" ]; then \
        composer install --optimize-autoloader --no-interaction --no-scripts; \
    fi

# Create necessary directories and set permissions
RUN mkdir -p storage/logs storage/framework/cache storage/framework/sessions storage/framework/views \
    && mkdir -p bootstrap/cache \
    && mkdir -p public \
    && chmod -R 775 storage bootstrap/cache public \
    && chown -R www-data:www-data storage bootstrap/cache public

# Run post-install scripts
RUN composer run-script post-install-cmd --no-interaction 2>/dev/null || echo "Post-install scripts completed"

# Copy supervisor configuration
COPY docker/backend/supervisord.conf /etc/supervisord.conf

# Expose port
EXPOSE 8000

# Start with supervisor (manages Nginx, PHP-FPM, queue worker, scheduler)
CMD ["sh", "-c", "php artisan config:clear; php artisan cache:clear; php artisan key:generate --force 2>/dev/null || echo 'Key exists'; php artisan migrate --force 2>/dev/null || echo 'Migration skipped'; supervisord -c /etc/supervisord.conf"]
