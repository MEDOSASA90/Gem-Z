/**
 * ============================================================================
 * GEM Z - Identity Module
 * KYCModule - وحدة التحقق من الهوية
 * ============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KYCSubmission } from './kyc.entity';
import { KYCService } from './kyc.service';
import { KYCController } from './kyc.controller';
import { KYCProcessor } from './kyc.processor';
import { DocumentValidator } from './document-validator';
import { UserModule } from '../user/user.module';
import { PrivateS3Service } from './private-s3.service';
import { KycLifecycleQueue } from './kyc-lifecycle.queue';

@Module({
  imports: [TypeOrmModule.forFeature([KYCSubmission]), UserModule],
  providers: [KYCService, KYCProcessor, DocumentValidator, PrivateS3Service, KycLifecycleQueue],
  controllers: [KYCController],
  exports: [KYCService, KYCProcessor, DocumentValidator, PrivateS3Service, KycLifecycleQueue, TypeOrmModule],
})
export class KYCModule {}
