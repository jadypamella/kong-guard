FROM kong:3.7
USER root
RUN mkdir -p /usr/local/share/lua/5.1/kong/plugins/secret-guard
COPY handler.lua /usr/local/share/lua/5.1/kong/plugins/secret-guard/handler.lua
COPY schema.lua /usr/local/share/lua/5.1/kong/plugins/secret-guard/schema.lua
USER kong
ENV KONG_PLUGINS=bundled,secret-guard