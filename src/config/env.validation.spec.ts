import { DatabaseType, Environment, validateEnv } from './env.validation';

describe('validateEnv', () => {
  const base = { DB_DATABASE: 'ms_template' };

  it('convierte los numéricos que llegan como string desde process.env', () => {
    const result = validateEnv({ ...base, PORT: '3999', DB_PORT: '5433' });

    expect(result.PORT).toBe(3999);
    expect(result.DB_PORT).toBe(5433);
  });

  it('aplica los valores por defecto cuando la variable no está presente', () => {
    const result = validateEnv(base);

    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe(Environment.Dev);
    expect(result.DB_TYPE).toBe(DatabaseType.Postgres);
    expect(result.API_PREFIX).toBe('api');
  });

  it('falla si DB_DATABASE no está definido', () => {
    expect(() => validateEnv({})).toThrow(/DB_DATABASE es obligatorio/);
  });

  it('falla con un DB_TYPE no soportado', () => {
    expect(() => validateEnv({ ...base, DB_TYPE: 'oracle' })).toThrow(/DB_TYPE debe ser uno de/);
  });

  it('falla con un puerto fuera de rango', () => {
    expect(() => validateEnv({ ...base, PORT: '99999' })).toThrow(/PORT/);
  });

  it('conserva variables no declaradas en el contrato', () => {
    const result = validateEnv({ ...base, CUSTOM_VAR: 'valor' });

    expect((result as unknown as Record<string, unknown>).CUSTOM_VAR).toBe('valor');
  });

  describe('DB_SYNCHRONIZE', () => {
    it('viene apagado por defecto', () => {
      expect(validateEnv(base).DB_SYNCHRONIZE).toBe('false');
    });

    it('se permite en dev', () => {
      expect(() =>
        validateEnv({ ...base, NODE_ENV: Environment.Dev, DB_SYNCHRONIZE: 'true' }),
      ).not.toThrow();
    });

    it.each([Environment.Qa, Environment.Prod])('impide el arranque en %s', (NODE_ENV) => {
      expect(() => validateEnv({ ...base, NODE_ENV, DB_SYNCHRONIZE: 'true' })).toThrow(
        /DB_SYNCHRONIZE=true no está permitido/,
      );
    });

    it('no bloquea nada si está apagado, sea cual sea el entorno', () => {
      expect(() =>
        validateEnv({ ...base, NODE_ENV: Environment.Prod, DB_SYNCHRONIZE: 'false' }),
      ).not.toThrow();
    });
  });

  describe('NODE_ENV', () => {
    it.each(['dev', 'qa', 'prod'])('acepta %s', (value) => {
      expect(validateEnv({ ...base, NODE_ENV: value }).NODE_ENV).toBe(value);
    });

    it.each(['development', 'test', 'staging', 'production'])('rechaza %s', (value) => {
      expect(() => validateEnv({ ...base, NODE_ENV: value })).toThrow(/NODE_ENV debe ser uno de/);
    });
  });

  it('CORS_ORIGINS vacío por defecto', () => {
    expect(validateEnv(base).CORS_ORIGINS).toBe('');
  });
});
