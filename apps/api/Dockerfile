# Webubble API image. "dev" is used by docker-compose with the source bind-mounted;
# "prod" is the immutable image that CI builds and deploys to staging.
FROM dunglas/frankenphp:1-php8.4-bookworm AS base
RUN install-php-extensions pdo_pgsql redis pcntl intl zip bcmath opcache
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /app
ENV SERVER_NAME=:8000 \
    COMPOSER_ALLOW_SUPERUSER=1

FROM base AS dev
EXPOSE 8000
CMD ["sh", "-c", "composer install --no-interaction && exec frankenphp php-server --root public/ --listen :8000"]

FROM base AS prod
ARG APP_VERSION=dev
ENV APP_ENV=production APP_DEBUG=false APP_VERSION=${APP_VERSION}
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction
COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
 && php artisan package:discover --ansi \
 && chown -R www-data:www-data storage bootstrap/cache
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD curl -fsS http://localhost:8000/up || exit 1
