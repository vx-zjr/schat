import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { createAppImports } from './app.imports';

describe('createAppImports', () => {
  it('loads full backend modules by default', () => {
    const imports = createAppImports(false);

    expect(imports).toContain(PrismaModule);
    expect(imports).toContain(AuthModule);
    expect(imports).toContain(HealthModule);
  });

  it('loads only debug-safe modules when local no-db mode is enabled', () => {
    const imports = createAppImports(true);

    expect(imports).toContain(HealthModule);
    expect(imports).not.toContain(PrismaModule);
    expect(imports).not.toContain(AuthModule);
  });
});

