import { Injectable, Logger } from '@nestjs/common';
import { GlobalConfigService } from '../../../core/global-config/global-config.service';

export interface AdCampaign {
  id: string;
  advertiserId: string;
  bidType: 'CPM' | 'CPC' | 'CPA';
  bidAmount: number;
  dailyBudget: number;
  currentDailySpend: number;
  geoTargeting: string[];
  audienceSegments: string[];
  qualityScore: number; // 1 to 10
}

@Injectable()
export class AdAuctionService {
  private readonly logger = new Logger(AdAuctionService.name);
  private campaigns: AdCampaign[] = [];

  constructor(private readonly config: GlobalConfigService) {
    // Populate with mock funded campaigns for initial activation
    this.campaigns.push({
      id: 'camp_1',
      advertiserId: 'adv_nike',
      bidType: 'CPC',
      bidAmount: 1.50, // $1.50 per click
      dailyBudget: 100.0,
      currentDailySpend: 10.0,
      geoTargeting: ['EG', 'SA'],
      audienceSegments: ['fitness_enthusiasts', 'runners'],
      qualityScore: 9,
    });
    this.campaigns.push({
      id: 'camp_2',
      advertiserId: 'adv_adidas',
      bidType: 'CPM',
      bidAmount: 5.00, // $5.00 per 1000 views
      dailyBudget: 200.0,
      currentDailySpend: 195.0, // Almost exhausted
      geoTargeting: ['SA'],
      audienceSegments: ['gym_goers'],
      qualityScore: 8,
    });
  }

  /**
   * Evaluate and Rank active funded campaigns for a specific user placement context
   */
  async evaluateAuction(context: { country: string; segment: string }): Promise<AdCampaign[]> {
    this.logger.log(`Evaluating real-time ad auction for context: ${JSON.stringify(context)}`);

    const relevancyBonusWeight = await this.config.getNumber('ad_relevancy_bonus_weight', 0.2);

    const candidates = this.campaigns.filter((campaign) => {
      // 1. Budget check
      if (campaign.currentDailySpend >= campaign.dailyBudget) {
        return false;
      }
      // 2. Geo check
      if (campaign.geoTargeting.length > 0 && !campaign.geoTargeting.includes(context.country)) {
        return false;
      }
      // 3. Segment check
      if (campaign.audienceSegments.length > 0 && !campaign.audienceSegments.includes(context.segment)) {
        return false;
      }
      return true;
    });

    // 4. Calculate Rank Score: Bid * QualityScore + RelevancyBonus
    const ranked = candidates.map((campaign) => {
      const bidScore = campaign.bidAmount * (campaign.bidType === 'CPM' ? 0.01 : 1.0); // normalize CPM bid
      const score = (bidScore * campaign.qualityScore) + (relevancyBonusWeight * 10);
      return { campaign, score };
    });

    // Sort descending by score
    ranked.sort((a, b) => b.score - a.score);

    this.logger.log(`Auction completed. Selected top ad: ${ranked[0]?.campaign?.id || 'none'}`);
    return ranked.map((r) => r.campaign);
  }

  /**
   * Fetch active slots. Homepage slots must remain hidden until active campaigns exist
   */
  async getActiveHomepageSlots(context: { country: string; segment: string }): Promise<{ showSlots: boolean; campaigns: AdCampaign[] }> {
    const activeAds = await this.evaluateAuction(context);
    if (activeAds.length === 0) {
      return { showSlots: false, campaigns: [] };
    }
    return { showSlots: true, campaigns: activeAds };
  }
}
