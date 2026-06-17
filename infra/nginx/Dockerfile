FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
COPY frontend/shared/package*.json ./shared/
COPY frontend/admin/package*.json ./admin/
COPY frontend/user/package*.json ./user/
COPY frontend/mobile/package*.json ./mobile/
RUN npm ci

COPY frontend/shared ./shared
COPY frontend/admin ./admin
COPY frontend/user ./user
RUN npm run build --workspace=shared
RUN VITE_BASE_PATH=/console/ npm run build --workspace=admin
RUN VITE_BASE_PATH=/client/ npm run build --workspace=user

FROM nginx:1.27-bookworm
COPY --from=frontend-build /app/frontend/admin/dist /usr/share/nginx/html/console
COPY --from=frontend-build /app/frontend/user/dist /usr/share/nginx/html/client
COPY infra/nginx/templates/default.conf.template /etc/nginx/templates/default.conf.template
