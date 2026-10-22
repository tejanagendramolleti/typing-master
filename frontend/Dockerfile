# ---------- build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

# The address of the API, which the browser calls.
#
# Vite inlines the VITE_ variables into the bundle when it builds, so this
# has to be a build argument. Setting it on the running container has no
# effect at all: the bundle has already been written, and the interface
# would end up calling a relative "/api/..." path that the web server
# answers with the single-page app instead of with the API.
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# The address is 127.0.0.1 and not "localhost" on purpose. In this image
# "localhost" resolves to the IPv6 loopback first, nginx listens only on the
# IPv4 one, and the check fails with a connection refused even though the
# site is being served perfectly well.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
