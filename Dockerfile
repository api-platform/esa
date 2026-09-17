FROM golang:1.27 AS builder

RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@v0.4.7

RUN xcaddy build v2.11.4 \
	--output /usr/bin/caddy \
	--with github.com/dunglas/mercure/caddy@v1.0.0 \
	--with github.com/dunglas/vulcain/caddy@v1.4.3

FROM caddy:2.11.4 AS app_server

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
