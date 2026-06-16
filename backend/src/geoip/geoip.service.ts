import { Injectable } from '@nestjs/common';
import { AppConfig } from '../config/app-config';

export type GeoipResult = {
  ip: string;
  country: string;
  region: string;
  city: string;
};

@Injectable()
export class GeoipService {
  constructor(private readonly config: AppConfig) {}

  lookup(ip: string): GeoipResult {
    void this.config.geoipDataDir;
    return { ip, country: 'unknown', region: 'unknown', city: 'unknown' };
  }
}

