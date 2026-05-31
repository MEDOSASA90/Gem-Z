import { Module, Global } from '@nestjs/common';
import { DistributedLockService } from './lock.service';

@Global()
@Module({
  providers: [DistributedLockService],
  exports: [DistributedLockService],
})
export class LockModule {}
