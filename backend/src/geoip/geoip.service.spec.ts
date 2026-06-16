import { GeoipService } from './geoip.service';

describe('GeoipService', () => {
  it('returns unknown when databases are not installed', () => {
    const service = new GeoipService({ geoipDataDir: './missing' } as any);

    expect(service.lookup('127.0.0.1')).toEqual({ ip: '127.0.0.1', country: 'unknown', region: 'unknown', city: 'unknown' });
  });
});

