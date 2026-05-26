FROM php:8.3-cli

RUN apt-get update && apt-get install -y \
git unzip libzip-dev zip curl \
&& curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
&& apt-get install -y nodejs \
&& docker-php-ext-install pdo pdo_mysql zip
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY . .

RUN composer install --no-dev --optimize-autoloader && npm install

EXPOSE 10000

CMD php artisan migrate --force && php artisan db:seed --force && php artisan serve --host=0.0.0.0 --port=10000
