FROM nginx:alpine
RUN apk add --no-cache gzip
COPY nginx.conf security_headers.conf /etc/nginx/
COPY apps/private/dist /usr/share/nginx/html
ARG BUILD_VERSION=2.0
RUN echo "var APP_VERSION = \"${BUILD_VERSION}\";" > /usr/share/nginx/html/version.js

# Initialize cache_env.conf with defaults so Nginx configuration checks pass during build
RUN echo "map \$uri \$static_cache_control { default \"no-cache\"; }" > /etc/nginx/conf.d/cache_env.conf && \
    echo "map \$uri \$html_cache_control { default \"no-cache\"; }" >> /etc/nginx/conf.d/cache_env.conf

# Default frame-ancestors of the Content-Security-Policy, replaced at startup by FRAME_ANCESTORS when set
RUN echo "map \$uri \$frame_ancestors { default \"'self'\"; }" > /etc/nginx/conf.d/security_env.conf

# Compress static files at build-time (exclude runtime env config, version, and appList)
RUN find /usr/share/nginx/html -type f ! -name '.env.js' ! -name 'version.js' ! -name 'appList.js' ! -name '.env.example.js' ! -name 'appList.example.js' -exec gzip -k -f {} \;

# Record the exposed port
EXPOSE 80

CMD sh -c 'if [ -f /usr/share/nginx/html/.env.js ] && grep -q -E "DEBUG\s*=\s*true" /usr/share/nginx/html/.env.js; then \
             echo "map \$uri \$static_cache_control { default \"no-cache\"; }" > /etc/nginx/conf.d/cache_env.conf; \
             echo "map \$uri \$html_cache_control { default \"no-cache\"; }" >> /etc/nginx/conf.d/cache_env.conf; \
             echo "Debug mode detected. Disabling Nginx browser cache."; \
           else \
             echo "map \$uri \$static_cache_control { default \"public, max-age=31536000, immutable\"; }" > /etc/nginx/conf.d/cache_env.conf; \
             echo "map \$uri \$html_cache_control { default \"no-store, no-cache, must-revalidate, proxy-revalidate\"; }" >> /etc/nginx/conf.d/cache_env.conf; \
             echo "Production mode detected. Enabling Nginx browser cache."; \
           fi && \
           if [ -n "$FRAME_ANCESTORS" ]; then \
             echo "map \$uri \$frame_ancestors { default \"$FRAME_ANCESTORS\"; }" > /etc/nginx/conf.d/security_env.conf; \
             echo "Allowing the app to be framed by: $FRAME_ANCESTORS"; \
           fi && nginx -g "daemon off;"'
