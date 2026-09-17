#syntax=docker/dockerfile:1.4

# Adapted from https://github.com/dunglas/symfony-docker


# Versions
FROM dunglas/frankenphp:1-php8.3 AS frankenphp_upstream


# Custom FrankenPHP binary
#
# The stock image embeds Mercure 0.24.2, which speaks 0.x only and rejects a 1.0
# configuration outright, so the binary is rebuilt against the 1.0 module.
# mercure/caddy@v1.0.0 declares Go 1.27 and the builder image ships 1.26.7 with
# GOTOOLCHAIN=local, so the build opts into the newer toolchain; FrankenPHP
# already pins Caddy 2.11.4, the version that module wants.
#
# Everything except the two pinned versions is the recipe documented at
# https://frankenphp.dev/docs/docker/ — the "=./" replacements point xcaddy at
# the FrankenPHP sources the builder image carries, and mercure/caddy and
# vulcain/caddy are already in that list.
FROM dunglas/frankenphp:1-builder-php8.3 AS frankenphp_builder

COPY --from=caddy:2.11.4-builder /usr/bin/xcaddy /usr/bin/xcaddy

RUN CGO_ENABLED=1 \
	GOTOOLCHAIN=auto \
	XCADDY_SETCAP=1 \
	XCADDY_GO_BUILD_FLAGS="-ldflags='-w -s' -tags=nobadger,nomysql,nopgx" \
	CGO_CFLAGS=$(php-config --includes) \
	CGO_LDFLAGS="$(php-config --ldflags) $(php-config --libs)" \
	xcaddy build \
		--output /usr/local/bin/frankenphp \
		--with github.com/dunglas/frankenphp=./ \
		--with github.com/dunglas/frankenphp/caddy=./caddy/ \
		--with github.com/dunglas/caddy-cbrotli \
		--with github.com/dunglas/mercure/caddy@v1.0.0 \
		--with github.com/dunglas/vulcain/caddy@v1.4.3


# The different stages of this Dockerfile are meant to be built into separate images
# https://docs.docker.com/develop/develop-images/multistage-build/#stop-at-a-specific-build-stage
# https://docs.docker.com/compose/compose-file/#target


# Base FrankenPHP image
FROM frankenphp_upstream AS frankenphp_base

WORKDIR /app

# persistent / runtime deps
# hadolint ignore=DL3008
RUN apt-get update && apt-get install --no-install-recommends -y \
	acl \
	file \
	gettext \
	git \
  sqlite3 \
	&& rm -rf /var/lib/apt/lists/*

# https://getcomposer.org/doc/03-cli.md#composer-allow-superuser
ENV COMPOSER_ALLOW_SUPERUSER=1

RUN set -eux; \
	install-php-extensions \
		@composer \
		apcu \
		intl \
		opcache \
		zip \
    pdo_sqlite \
	;

COPY --from=frankenphp_builder /usr/local/bin/frankenphp /usr/local/bin/frankenphp

COPY --link frankenphp/conf.d/app.ini $PHP_INI_DIR/conf.d/
COPY --link --chmod=755 frankenphp/docker-entrypoint.sh /usr/local/bin/docker-entrypoint
COPY --link frankenphp/Caddyfile /etc/caddy/Caddyfile

ENTRYPOINT ["docker-entrypoint"]

HEALTHCHECK --start-period=60s CMD curl -f http://localhost:2019/metrics || exit 1
CMD [ "frankenphp", "run", "--config", "/etc/caddy/Caddyfile" ]

# Dev FrankenPHP image
FROM frankenphp_base AS frankenphp_dev

ENV APP_ENV=dev XDEBUG_MODE=off
VOLUME /app/var/

RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"

RUN set -eux; \
	install-php-extensions \
		xdebug \
	;

COPY --link frankenphp/conf.d/app.dev.ini $PHP_INI_DIR/conf.d/

CMD [ "frankenphp", "run", "--config", "/etc/caddy/Caddyfile", "--watch" ]

# Prod FrankenPHP image
FROM frankenphp_base AS frankenphp_prod

ENV APP_ENV=prod
ENV FRANKENPHP_CONFIG="import worker.Caddyfile"

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --link frankenphp/conf.d/app.prod.ini $PHP_INI_DIR/conf.d/
COPY --link frankenphp/worker.Caddyfile /etc/caddy/worker.Caddyfile

# prevent the reinstallation of vendors at every changes in the source code
COPY --link composer.* symfony.* ./
RUN set -eux; \
	composer install --no-cache --prefer-dist --no-dev --no-autoloader --no-scripts --no-progress

# copy sources
COPY --link . ./
RUN rm -Rf frankenphp/

RUN set -eux; \
	mkdir -p var/cache var/log; \
	composer dump-autoload --classmap-authoritative --no-dev; \
	composer dump-env prod; \
	composer run-script --no-dev post-install-cmd; \
	chmod +x bin/console; sync;

