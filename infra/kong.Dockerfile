FROM kong:3.7
COPY kong.yaml /etc/kong/kong.yaml
ENV KONG_DATABASE=off
ENV KONG_DECLARATIVE_CONFIG=/etc/kong/kong.yaml
ENV KONG_LOG_LEVEL=info