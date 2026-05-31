import { Module } from '@nestjs/common';
import { AdAuctionService } from './ad-auction.service';

@Module({
  imports: [],
  controllers: [],
  providers: [AdAuctionService],
  exports: [AdAuctionService],
})
export class AdsCampaignModule {}
