FROM caddy:2.11.4-builder AS builder

RUN xcaddy build \
	--with github.com/dunglas/mercure/caddy@v1.0.0-alpha.3 \
	--with github.com/dunglas/vulcain/caddy@v1.4.3

FROM caddy:2.11.4 AS app_server

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
