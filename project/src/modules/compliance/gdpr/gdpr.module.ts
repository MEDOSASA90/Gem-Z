import { Module } from '@nestjs/common';
import { PrivacyComplianceService } from './privacy-compliance.service';

@Module({
  imports: [],
  controllers: [],
  providers: [PrivacyComplianceService],
  exports: [PrivacyComplianceService],
})
export class ComplianceGdprModule {}
