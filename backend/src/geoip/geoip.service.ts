import { Inject, Injectable, Optional } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import IP2Region from 'node-ip2region';
import { Reader } from '@maxmind/geoip2-node';
import { AppConfig } from '../config/app-config';

export type GeoipResult = {
  ip: string;
  country: string;
  region: string;
  city: string;
};

export const GEOIP_READERS = 'GEOIP_READERS';

export type GeoipReaders = {
  ip2region?: { btreeSearchSync(ip: string): { region: string } | null };
  maxmind?: { city(ip: string): any };
};

@Injectable()
export class GeoipService {
  private ip2region?: { btreeSearchSync(ip: string): { region: string } | null };
  private maxmind?: { city(ip: string): any };

  constructor(
    private readonly config: AppConfig,
    @Optional() @Inject(GEOIP_READERS) readers?: GeoipReaders
  ) {
    this.ip2region = readers?.ip2region;
    this.maxmind = readers?.maxmind;
  }

  lookup(ip: string): GeoipResult {
    const domestic = this.lookupIp2Region(ip);
    if (domestic) {
      return domestic;
    }

    const global = this.lookupMaxmind(ip);
    if (global) {
      return global;
    }

    return { ip, country: 'unknown', region: 'unknown', city: 'unknown' };
  }

  private lookupIp2Region(ip: string): GeoipResult | null {
    try {
      const reader = this.getIp2Region();
      const result = reader?.btreeSearchSync(ip);
      if (!result?.region) {
        return null;
      }

      const [country, , region, city] = result.region.split('|');
      if (!country || country === '0') {
        return null;
      }

      return {
        ip,
        country,
        region: region && region !== '0' ? region : 'unknown',
        city: city && city !== '0' ? city : 'unknown'
      };
    } catch {
      return null;
    }
  }

  private lookupMaxmind(ip: string): GeoipResult | null {
    try {
      const city = this.getMaxmind()?.city(ip);
      if (!city) {
        return null;
      }

      return {
        ip,
        country: city.country?.names?.en ?? city.country?.isoCode ?? 'unknown',
        region: city.subdivisions?.[0]?.names?.en ?? 'unknown',
        city: city.city?.names?.en ?? 'unknown'
      };
    } catch {
      return null;
    }
  }

  private getIp2Region() {
    if (this.ip2region) {
      return this.ip2region;
    }

    const dbPath = ['ip2region.xdb', 'ip2region.db']
      .map((fileName) => join(this.config.geoipDataDir, fileName))
      .find((candidate) => existsSync(candidate));
    if (!dbPath) {
      return undefined;
    }

    this.ip2region = IP2Region.create(dbPath);
    return this.ip2region;
  }

  private getMaxmind() {
    if (this.maxmind) {
      return this.maxmind;
    }

    const dbPath = join(this.config.geoipDataDir, 'GeoLite2-City.mmdb');
    if (!existsSync(dbPath)) {
      return undefined;
    }

    this.maxmind = Reader.openBuffer(readFileSync(dbPath));
    return this.maxmind;
  }
}

