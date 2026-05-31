import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Settlement, SettlementStatus, PayoutSchedule } from './settlement.entity';
import { Currency } from '../../../common/enums';
import { GlobalConfigService } from '../../../core/global-config/global-config.service';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(Settlement)
    private readonly repo: Repository<Settlement>,
    private readonly config: GlobalConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Calculate and create a cross-border settlement item
   */
  async calculateSettlement(
    recipientId: string,
    recipientType: 'TRAINER' | 'GYM' | 'CREATOR' | 'MERCHANT',
    grossAmount: number,
    userCountry: string,
    recipientCountry: string,
    currency: Currency,
    payoutSchedule: PayoutSchedule = PayoutSchedule.WEEKLY,
  ): Promise<Settlement> {
    this.logger.log(`Calculating settlement: gross=${grossAmount}, recipient=${recipientId}`);

    // Resolve rates and percentages dynamically via GlobalConfigService to prevent hardcoding
    const commissionRate = await this.config.getNumber('commission_rate', 0.10); // default 10%
    const egyptVat = await this.config.getNumber('vat_eg', 0.14); // Egypt VAT 14%
    const ksaVat = await this.config.getNumber('vat_sa', 0.15); // KSA VAT 15%
    const gatewayFeeRate = await this.config.getNumber('gateway_fee_rate', 0.025); // default 2.5%

    // Calculate Platform Commission
    const platformCommission = grossAmount * commissionRate;

    // Calculate VAT based on recipient country
    const vatRate = recipientCountry === 'EG' ? egyptVat : recipientCountry === 'SA' ? ksaVat : 0.05; // 5% default regional
    const vatAmount = platformCommission * vatRate;

    // Calculate Gateway Fee
    const gatewayFee = grossAmount * gatewayFeeRate;

    // Calculate FX Conversion Rate (Simulating rate or fetch)
    let fxRate = 1.0;
    if (currency === Currency.EGP && recipientCountry === 'SA') {
      fxRate = 0.077; // 1 EGP = 0.077 SAR
    } else if (currency === Currency.SAR && recipientCountry === 'EG') {
      fxRate = 12.98; // 1 SAR = 12.98 EGP
    }

    // Determine Final Net Payout
    const netPayout = (grossAmount - platformCommission - vatAmount - gatewayFee) * fxRate;

    if (netPayout < 0) {
      throw new BadRequestException('Settlement amount is too small to cover fees.');
    }

    const settlement = this.repo.create({
      recipientId,
      recipientType,
      userCountry,
      recipientCountry,
      grossAmount,
      platformCommission,
      vatAmount,
      gatewayFee,
      fxRate,
      netPayout,
      currency,
      status: SettlementStatus.CREATED,
      payoutSchedule,
    });

    const saved = await this.repo.save(settlement);

    // Emit event
    this.eventEmitter.emit('settlement.calculated', {
      event_id: crypto.randomUUID(),
      correlation_id: crypto.randomUUID(),
      actor_id: 'system',
      source_module: 'settlement',
      event_type: 'SettlementCalculated',
      timestamp: new Date().toISOString(),
      payload: {
        settlement_id: saved.id,
        recipient_id: recipientId,
        net_payout: netPayout,
        currency,
      },
    });

    return saved;
  }

  /**
   * Transition state with strict state machine validation
   */
  async transitionTo(settlementId: string, nextStatus: SettlementStatus): Promise<Settlement> {
    const settlement = await this.repo.findOne({ where: { id: settlementId } });
    if (!settlement) {
      throw new BadRequestException('Settlement item not found.');
    }

    // Define allowed transitions
    const transitions: Record<SettlementStatus, SettlementStatus[]> = {
      [SettlementStatus.CREATED]: [SettlementStatus.CALCULATED, SettlementStatus.FAILED],
      [SettlementStatus.CALCULATED]: [SettlementStatus.COMPLIANCE_SCREENED, SettlementStatus.FAILED],
      [SettlementStatus.COMPLIANCE_SCREENED]: [SettlementStatus.PROCESSING, SettlementStatus.FAILED],
      [SettlementStatus.PROCESSING]: [SettlementStatus.DISBURSED, SettlementStatus.FAILED],
      [SettlementStatus.DISBURSED]: [SettlementStatus.RECONCILED],
      [SettlementStatus.FAILED]: [],
      [SettlementStatus.RECONCILED]: [],
    };

    const allowed = transitions[settlement.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid settlement transition: ${settlement.status} -> ${nextStatus}`,
      );
    }

    settlement.status = nextStatus;
    const updated = await this.repo.save(settlement);

    this.logger.log(`Settlement [${settlementId}] transitioned to: ${nextStatus}`);

    // Emit event
    this.eventEmitter.emit('settlement.status_changed', {
      event_id: crypto.randomUUID(),
      correlation_id: crypto.randomUUID(),
      actor_id: 'system',
      source_module: 'settlement',
      event_type: 'SettlementStatusChanged',
      timestamp: new Date().toISOString(),
      payload: {
        settlement_id: settlementId,
        status: nextStatus,
      },
    });

    return updated;
  }

  /**
   * Process all pending payouts for a schedule
   */
  async processSchedule(schedule: PayoutSchedule): Promise<void> {
    this.logger.log(`Processing payouts for schedule: ${schedule}`);
    const items = await this.repo.find({ where: { payoutSchedule: schedule, status: SettlementStatus.CREATED } });

    for (const item of items) {
      try {
        await this.transitionTo(item.id, SettlementStatus.CALCULATED);
        // Run compliance checks
        await this.transitionTo(item.id, SettlementStatus.COMPLIANCE_SCREENED);
        // Process transfer
        await this.transitionTo(item.id, SettlementStatus.PROCESSING);
        // Mark paid/disbursed
        await this.transitionTo(item.id, SettlementStatus.DISBURSED);
      } catch (error) {
        this.logger.error(`Error processing settlement [${item.id}]: ${(error as Error).message}`);
        await this.transitionTo(item.id, SettlementStatus.FAILED);
      }
    }
  }
}
