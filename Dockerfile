FROM caddy:2.8-builder AS builder

RUN xcaddy build --with github.com/dunglas/mercure/caddy --with github.com/dunglas/vulcain/caddy

FROM caddy:2.8 AS app_server

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
