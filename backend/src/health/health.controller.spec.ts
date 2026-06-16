import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns ok status', () => {
    expect(new HealthController().getHealth()).toEqual({ status: 'ok' });
  });
});

