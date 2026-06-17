import { Test } from '@nestjs/testing';
import { AppConfig } from '../config/app-config';
import { GeoipService } from './geoip.service';
import { existsSync } from 'fs';
import IP2Region from 'node-ip2region';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

jest.mock('node-ip2region', () => ({
  create: jest.fn(() => ({ btreeSearchSync: jest.fn(() => ({ region: '中国|0|广东省|深圳市|联通' })) }))
}));

describe('GeoipService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(false);
  });

  it('returns unknown when databases are not installed', () => {
    const service = new GeoipService({ geoipDataDir: './missing' } as any);

    expect(service.lookup('127.0.0.1')).toEqual({ ip: '127.0.0.1', country: 'unknown', region: 'unknown', city: 'unknown' });
  });

  it('can be resolved by Nest without test readers configured', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [GeoipService, { provide: AppConfig, useValue: { geoipDataDir: './missing' } }]
    }).compile();

    const service = moduleRef.get(GeoipService);

    expect(service.lookup('127.0.0.1')).toEqual({ ip: '127.0.0.1', country: 'unknown', region: 'unknown', city: 'unknown' });
  });

  it('uses ip2region results when the domestic database returns a region string', () => {
    const service = new GeoipService({ geoipDataDir: './missing' } as any, {
      ip2region: {
        btreeSearchSync: jest.fn(() => ({ region: '中国|0|广东省|深圳市|联通' }))
      }
    } as any);

    expect(service.lookup('1.2.3.4')).toEqual({ ip: '1.2.3.4', country: '中国', region: '广东省', city: '深圳市' });
  });

  it('loads the documented ip2region xdb database file', () => {
    (existsSync as jest.Mock).mockImplementation((path: string) => path.endsWith('ip2region.xdb'));
    const service = new GeoipService({ geoipDataDir: '/app/data/geoip' } as any);

    expect(service.lookup('1.2.3.4')).toEqual({ ip: '1.2.3.4', country: '中国', region: '广东省', city: '深圳市' });
    expect(IP2Region.create).toHaveBeenCalledWith(expect.stringMatching(/ip2region\.xdb$/));
  });

  it('falls back to MaxMind city results', () => {
    const service = new GeoipService({ geoipDataDir: './missing' } as any, {
      maxmind: {
        city: jest.fn(() => ({
          country: { names: { en: 'United States' } },
          subdivisions: [{ names: { en: 'California' } }],
          city: { names: { en: 'San Francisco' } }
        }))
      }
    } as any);

    expect(service.lookup('8.8.8.8')).toEqual({ ip: '8.8.8.8', country: 'United States', region: 'California', city: 'San Francisco' });
  });
});

