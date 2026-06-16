import { Module } from '@nestjs/common';
import { createAppImports } from './app.imports';

@Module({
  imports: createAppImports(process.env.LOCAL_NO_DB === 'true')
})
export class AppModule {}
