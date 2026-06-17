import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..', '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('production backup scripts use encrypted archives by default', () => {
  const backup = read('infra/scripts/backup-production.ps1');
  const restore = read('infra/scripts/restore-production.ps1');

  assert.match(backup, /BACKUP_ENCRYPTION_PASSWORD/);
  assert.match(backup, /\.tar\.gz\.enc/);
  assert.match(backup, /openssl enc -aes-256-cbc -pbkdf2/);
  assert.match(backup, /Remove-Item .*staging/i);

  assert.match(restore, /BACKUP_ENCRYPTION_PASSWORD/);
  assert.match(restore, /\.tar\.gz\.enc/);
  assert.match(restore, /openssl enc -d -aes-256-cbc -pbkdf2/);
});

test('production verification scripts cover full stack and MinIO smoke paths', () => {
  const ps1Path = join(root, 'infra/scripts/verify-production.ps1');
  const shPath = join(root, 'infra/scripts/verify-production.sh');

  assert.equal(existsSync(ps1Path), true);
  assert.equal(existsSync(shPath), true);

  const ps1 = read('infra/scripts/verify-production.ps1');
  assert.match(ps1, /docker compose .* up -d --build/);
  assert.match(ps1, /run --rm -T --entrypoint sh minio-init/);
  assert.match(ps1, /Invoke-RestMethod/);
  assert.match(ps1, /\/health/);
  assert.match(ps1, /minio-smoke\.txt/);
  assert.match(ps1, /ip2region\.xdb/);
  assert.match(ps1, /GeoLite2-City\.mmdb/);
});

test('CI builds production docker images in addition to app checks', () => {
  const workflow = read('.github/workflows/ci.yml');

  assert.match(workflow, /docker compose --env-file \.env\.production\.example -f docker-compose\.production\.yml build/);
});

test('frontend production image builds workspace packages inside the container', () => {
  const dockerfile = read('infra/nginx/Dockerfile');
  const dockerignore = read('.dockerignore');

  assert.match(dockerfile, /RUN npm ci/);
  assert.match(dockerfile, /npm run build --workspace=shared/);
  assert.match(dockerfile, /npm run build --workspace=admin/);
  assert.match(dockerfile, /npm run build --workspace=user/);
  assert.match(dockerignore, /\*\*\/node_modules/);
  assert.match(dockerignore, /\*\*\/dist/);
});

test('backend production image starts the compiled Nest entrypoint', () => {
  const dockerfile = read('backend/Dockerfile');
  const dockerignore = read('backend/.dockerignore');
  const runtimeStage = dockerfile.split('FROM node:24-bookworm-slim AS runtime')[1] ?? '';

  assert.match(dockerfile, /apt-get install -y --no-install-recommends openssl/);
  assert.match(runtimeStage, /COPY --from=build \/app\/node_modules \.\/node_modules/);
  assert.doesNotMatch(runtimeStage, /COPY --from=deps \/app\/node_modules \.\/node_modules/);
  assert.match(dockerfile, /node dist\/src\/main\.js/);
  assert.match(dockerignore, /node_modules/);
  assert.match(dockerignore, /dist/);
});
