import { Module } from '@nestjs/common';
import { AiFraudNetworkService } from './fraud-network.service';
import { AiFraudNetworkController } from './fraud-network.controller';
import { WalletModule } from '../../economy/wallet/wallet.module';
import { UserModule } from '../../identity/user/user.module';

@Module({
  imports: [WalletModule, UserModule],
  controllers: [AiFraudNetworkController],
  providers: [AiFraudNetworkService],
  exports: [AiFraudNetworkService],
})
export class AiFraudNetworkModule {}
