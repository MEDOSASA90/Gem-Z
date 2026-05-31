/**
 * Gym Module - وحدة إدارة الأندية الرياضية
 * تشمل: الجيم + الفروع + خطط العضوية + الاشتراكات
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymController } from './gym.controller';
import { GymService, BranchService, MembershipService } from './gym.service';
import {
  GymRepository,
  GymBranchRepository,
  MembershipPlanRepository,
  MembershipRepository,
} from './gym.repository';
import { Gym } from './gym.entity';
import { GymBranch } from './branch.entity';
import { MembershipPlan } from './membership-plan.entity';
import { Membership } from './membership.entity';
import { EventBusModule } from '../../../core/event-bus/event-bus.module';

import { Wallet } from '../../economy/wallet/wallet.entity';
import { Transaction } from '../../economy/wallet/transaction.entity';
import { LedgerEntry } from '../../economy/wallet/ledger-entry.entity';
import { FranchiseRevenueService } from './franchise-revenue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Gym,
      GymBranch,
      MembershipPlan,
      Membership,
      Wallet,
      Transaction,
      LedgerEntry,
    ]),
    EventBusModule,
  ],
  controllers: [GymController],
  providers: [
    GymService,
    BranchService,
    MembershipService,
    FranchiseRevenueService,
    GymRepository,
    GymBranchRepository,
    MembershipPlanRepository,
    MembershipRepository,
  ],
  exports: [
    GymService,
    BranchService,
    MembershipService,
    FranchiseRevenueService,
    MembershipRepository,
  ],
})
export class GymModule {}
