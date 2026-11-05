import { appConfig, docsConfig } from './configuration';
import { Environment } from './env.validation';

describe('configuration', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  describe('appConfig.corsOrigins', () => {
    it('es una lista vacía cuando CORS_ORIGINS no está definido', () => {
      delete process.env.CORS_ORIGINS;

      expect(appConfig().corsOrigins).toEqual([]);
    });

    it('separa por coma y descarta espacios y entradas vacías', () => {
      process.env.CORS_ORIGINS = ' https://app.midominio.cl , ,https://admin.midominio.cl ';

      expect(appConfig().corsOrigins).toEqual([
        'https://app.midominio.cl',
        'https://admin.midominio.cl',
      ]);
    });
  });

  describe('docsConfig.enabled', () => {
    it.each([Environment.Dev, Environment.Qa])('se publica en %s', (env) => {
      process.env.NODE_ENV = env;
      delete process.env.DOCS_ENABLED;

      expect(docsConfig().enabled).toBe(true);
    });

    it('NO se publica en prod aunque DOCS_ENABLED=true', () => {
      process.env.NODE_ENV = Environment.Prod;
      process.env.DOCS_ENABLED = 'true';

      expect(docsConfig().enabled).toBe(false);
    });

    it('DOCS_ENABLED=false la apaga incluso en un entorno permitido', () => {
      process.env.NODE_ENV = Environment.Dev;
      process.env.DOCS_ENABLED = 'false';

      expect(docsConfig().enabled).toBe(false);
    });
  });
});
