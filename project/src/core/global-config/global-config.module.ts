import { Module, Global } from '@nestjs/common';
import { GlobalConfigService } from './global-config.service';

@Global()
@Module({
  providers: [GlobalConfigService],
  exports: [GlobalConfigService],
})
export class GlobalConfigModule {}
