/**
 * =============================================================================
 * Profile Module - موديول ملف تعريف صانع المحتوى
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { CreatorProfile } from './creator-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CreatorProfile])],
  providers: [ProfileService],
  controllers: [ProfileController],
  exports: [ProfileService],
})
export class ProfileModule {}
