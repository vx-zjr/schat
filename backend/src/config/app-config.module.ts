import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './app-config';
import { loadConfig } from './load-config';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [loadConfig] })],
  providers: [AppConfig],
  exports: [AppConfig]
})
export class AppConfigModule {}

